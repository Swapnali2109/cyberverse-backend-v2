# Cyberverse Backend (Dialogue Graph + Firebase)

This version matches the real Scene 1 script exactly: branching conversation,
forced-retry loops when the player pushes back, and score updates only on
choices that actually test something (not on neutral small talk).

## Setup

1. Create a Firebase project at console.firebase.google.com, enable Firestore.
2. Project Settings -> Service Accounts -> Generate new private key.
3. Copy `.env.example` to `.env`, fill in the 3 Firebase values from that key file.
4. `npm install`
5. `npm run dev` -> server runs on `http://localhost:4000`

## How the dialogue graph works

Instead of one flat list of choices, Scenario 1 is a **graph of nodes**.
Each node is one beat of the conversation (one thing Iris says + the buttons
shown). Each choice points to whichever node comes next - which might be a
brand new beat, or a "retry" node when the player pushes back instead of
answering (exactly like the script: "Don't ask so many questions, just tell
me!" forces a second choice).

See `src/data/scenario1.ts` - every node and choice from the script is there,
including the two "retry" nodes (`node_pet_name_retry`, `node_birth_city_retry`)
that only show the two real options once the pushback has already been used.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/session/start` | Starts a playthrough. Accepts optional `player_id`; returns one either way |
| POST | `/api/dialogue/start` | Loads the first node of a scenario |
| POST | `/api/dialogue/choice` | Submits one clicked choice, returns feedback + the next node |
| GET | `/api/session/:id/result` | Final report for ONE playthrough: scores, strongest/weakest area, decisions |
| GET | `/api/player/:playerId/history` | ALL playthroughs for one player, oldest first, with improvement trend |

## Player identity (no login required)

`session/start` accepts an optional `player_id` in the body:
- **First time playing**: Unity sends no `player_id` (or an empty one). The server generates a random one (a UUID) and returns it. Unity saves this locally using `PlayerPrefs` (`PlayerPrefs.SetString("player_id", value)`).
- **Every time after**: Unity sends that saved `player_id` back in every `session/start` call. This links all their playthroughs together for the history/improvement endpoint - no account, no password, no email.

This is the same idea as anonymous Firebase Authentication, just simpler for a hackathon timeline: no extra SDK integration in Unity, no auth token to manage, still gets you per-player history and an instructor-style dashboard if you build one later.

### Example: checking a player's progress over time

```
GET /api/player/CV-10482/history

{
  "player_id": "CV-10482",
  "total_playthroughs": 3,
  "completed_playthroughs": 3,
  "improvement_since_first_playthrough": 22.5,
  "sessions": [
    { "session_id": "...", "overall_score": 52.0, "completed": true, ... },
    { "session_id": "...", "overall_score": 68.0, "completed": true, ... },
    { "session_id": "...", "overall_score": 74.5, "completed": true, ... }
  ]
}
```

## Scoring rubric (applies to every scenario, not just Scenario 1)

| Tier | Points | Meaning |
|---|---|---|
| Ideal response | +15 | Textbook-correct security behavior |
| Smart/cautious response | +8 | Not the "perfect" answer, but shows good judgment (e.g. questioning intent) |
| Neutral/stalling | 0 | Doesn't resolve anything, pure pushback |
| Risky response | -10 to -15 | Falls for the trap (more severe = more negative) |

When writing Scenarios 2-3, slot every choice into one of these 4 tiers instead of inventing new numbers each time - keeps scoring consistent and defensible.

### Example flow (matches a real playthrough)

```
POST /api/session/start
  { "player_id": "" }   <- empty/omitted on first play
  -> { session_id: "abc123", player_id: "CV-10482", is_new_player_id: true,
       first_scenario_id: "scenario_1_the_big_day" }
  Unity saves "CV-10482" locally now.

POST /api/dialogue/start
  { session_id: "abc123", scenario_id: "scenario_1_the_big_day" }
  -> { node_id: "node_email", speaker: "System", lines: [...],
       choices: [ {id:"link_clicked", label:"Reply with the Secret Code"},
                  {id:"phishing_reported", label:"Click the 'Report Phishing' Button"} ] }

POST /api/dialogue/choice
  { session_id: "abc123", scenario_id: "scenario_1_the_big_day",
    node_id: "node_email", choice_id: "phishing_reported" }
  -> { feedback: "DING DING DING! ...", scenario_complete: false,
       next_node: { node_id: "node_pet_name", ... } }

... Unity keeps calling /api/dialogue/choice with whatever node_id it's
    currently showing, until a response comes back with scenario_complete: true.

GET /api/session/abc123/result        <- end of THIS playthrough
GET /api/player/CV-10482/history      <- ALL of this player's playthroughs
```

Unity never has to know the shape of the graph, what a "retry" node is, or
what comes next - it just always sends back the `node_id` it's currently
displaying and the `choice_id` clicked, and the server tells it what to show next.

## Adding Scenarios 2 and 3

Copy the pattern in `src/data/scenario1.ts` into a new file (`scenario2.ts`),
build its node graph the same way, apply the scoring rubric above to every
choice, then add it to the `scenarios` export (or split into its own registry
file once there are several - either works, just keep one place that lists
every scenario).

## Testing without Unity (Postman)

1. `POST /api/session/start` with `{}` (empty body) -> copy `session_id` AND `player_id`
2. `POST /api/dialogue/start` with that session_id + `scenario_id: "scenario_1_the_big_day"` -> see the first node
3. `POST /api/dialogue/choice` with the `node_id` and a `choice_id` from the response -> see feedback + next node
4. Repeat step 3, always using the newest `node_id`, until `scenario_complete: true`
5. `GET /api/session/{id}/result` -> see final scores for this playthrough
6. `POST /api/session/start` AGAIN, this time with `{ "player_id": "PASTE_THE_SAME_ONE" }` -> play through again
7. `GET /api/player/{player_id}/history` -> see both playthroughs together, with improvement trend

