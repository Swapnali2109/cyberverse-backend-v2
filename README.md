# Cyberverse Backend v3 (Unity owns dialogue, backend just scores)

Chirayu's Unity build already has all dialogue, scenario flow, and UI hardcoded
client-side. This backend no longer manages "what comes next" - it only
receives a choice, scores it, and logs it. Much simpler contract than v2.

## Setup

Same as before - Firebase project, Firestore enabled, `.env` filled in with
your service account credentials, `npm install`, `npm run dev`.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/session/start` | Starts a playthrough. Accepts optional `player_id`; returns one either way |
| POST | `/api/decision` | Submits ONE clicked choice, returns scoring feedback |
| GET | `/api/session/:id/result` | Final report for ONE playthrough |
| GET | `/api/player/:playerId/history` | ALL playthroughs for one player, with improvement trend |

## POST /api/decision - the core endpoint now

Unity calls this every time the player clicks a choice, anywhere in any
scenario. `node_id` here is NOT about controlling flow - it's just a lookup
key identifying which question/moment this choice belongs to (matches
whatever Unity already has hardcoded for that beat).

**Request:**
```json
{
  "session_id": "abc123",
  "scenario_id": "scenario_1_the_big_day",
  "node_id": "node_email",
  "choice_id": "phishing_reported"
}
```

**Response:**
```json
{
  "is_safe": true,
  "category": "phishing",
  "points_awarded": 15,
  "new_category_score": 65,
  "feedback": "DING DING DING! ..."
}
```

`feedback` is included in case it's useful, but Unity's own dialogue already
covers this - safe to ignore this field entirely if Unity doesn't need it.

## The valid node_id / choice_id pairs (the scoring table)

This lives in `src/data/scenario1.ts` - every node_id and choice_id Unity
sends MUST match one of the entries there exactly, or the request gets a
404. Share this file (or just the id strings) with Chirayu so his button
click handlers send the exact matching ids.

## Adding Scenarios 2 and 3

Copy the pattern in `src/data/scenario1.ts` into `scenario2.ts`, keep the
same rubric (Ideal +15 / Cautious +8 / Neutral 0 / Risky -10 to -15), add it
to the `scenarios` export. The `lines` and dialogue-flow fields in that file
are no longer used by the backend (Unity owns that now) - only `id`,
`category`, `points`, `isSafe` and optionally `feedback` actually matter.

## Testing without Unity (Postman)

1. `POST /api/session/start` with `{}` -> copy `session_id`
2. `POST /api/decision` with a valid node_id/choice_id pair -> see scoring response
3. Repeat for as many choices as you want to test
4. `GET /api/session/{id}/result` -> final scores
5. `GET /api/player/{player_id}/history` -> cross-session history
