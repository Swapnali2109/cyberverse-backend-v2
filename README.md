# Cyberverse Backend v4 (Scene 3 remediation + full report screen)

Adds:
1. Scene 3 Part 1 (phishing recovery) - `scenario_3a_phishing_recovery`
2. Scene 3 Part 2 (tailgating recovery) - `scenario_3b_tailgating_recovery`
3. A fully fleshed out `/api/session/:id/result` response matching the
   final report screen mockup exactly - rating, skill bars, key moments,
   "what you learned," and which Scene 3 branch(es) to route to.

## Setup

Same as before - copy your working `.env` over, `npm install`, `npm run dev`.

## Scene 3 routing logic

`GET /api/session/:id/result` now includes:

```json
{
  "failed_scenario_1": true,
  "failed_scenario_2": false,
  "remediation_scenarios": ["scenario_3a_phishing_recovery"]
}
```

Call this after Scenario 1 + 2 are both done, before deciding what to load
next:
- `remediation_scenarios` empty -> player passed both, skip Scene 3 entirely
  (or route to whatever "success" content the team decides on)
- Contains `scenario_3a_phishing_recovery` -> load Scene 3 Part 1
- Contains `scenario_3b_tailgating_recovery` -> load Scene 3 Part 2
- Contains both -> load both, in whatever order makes sense narratively

"Failed" = the player made at least one `isSafe: false` decision anywhere in
that scenario. This is computed fresh every time from the full decision
history - no separate flag to keep in sync.

## The full report screen - one call now covers everything

`GET /api/session/:id/result` response shape:

```json
{
  "session_id": "...",
  "player_id": "...",

  "overall_score": 78,
  "rating": "GOOD SECURITY AWARENESS",
  "headline": "KEEP IT UP!",
  "message": "Your choices show strong cybersecurity awareness. Remember: STOP -> CHECK -> VERIFY -> ACT.",

  "scores": { "phishing": 85, "social_engineering": 70, "privacy": 90, "device_security": 60, "password_security": 80 },
  "skills": [
    { "category": "phishing", "label": "Phishing", "value": 85 },
    { "category": "social_engineering", "label": "Social Engineering", "value": 70 }
  ],

  "strongest_area": "privacy",
  "strongest_area_label": "Privacy",
  "weakest_area": "device_security",
  "weakest_area_label": "Device Security",

  "what_you_learned": [
    "Verify unexpected requests before clicking links or replying",
    "Never share sensitive personal information casually"
  ],

  "key_moments": [
    { "title": "Suspicious Email", "action_taken": "Click the 'Report Phishing' Button", "is_safe": true, "points": 15 },
    { "title": "Unknown Person at Door", "action_taken": "Let the visitor follow you through the secured door", "is_safe": false, "points": -15 }
  ],

  "decisions": [ "...full history, unchanged from before..." ],

  "failed_scenario_1": false,
  "failed_scenario_2": true,
  "remediation_scenarios": ["scenario_3b_tailgating_recovery"]
}
```

Every visual element in the mockup maps directly to a field here - Unity's
job is purely rendering, no calculation needed on their end.

### Where each field comes from

| Report screen element | Field |
|---|---|
| Big score number | `overall_score` |
| Rating text under it | `rating` |
| Skill bars | `skills` (already sorted-friendly, has display `label`) |
| Strongest/weakest cards | `strongest_area_label` / `weakest_area_label` |
| "What you learned" checklist | `what_you_learned` |
| "Key moments" (2-3 shown) | `key_moments` - already picks the 3 most impactful decisions, pre-sorted |
| Bottom message + "Keep it up" / "Keep learning" | `headline` + `message` |

## Adding Scenario 3's real branching dialogue later

The current `scenario3a.ts` / `scenario3b.ts` files consolidate the script's
free-form "assessment events" into a smaller set of scored decision points
(to avoid double-counting when multiple events fire from one action - see
comments in each file for exactly which events map to which choice). If
Aryan's script changes meaningfully, update these two files the same way
Scenario 1/2 were built.

**One item flagged for confirmation**: `scenario3a.ts`'s
`sent_without_verifying` choice ID was inferred (the script didn't name an
explicit assessment event for "sent to personal email without verifying") -
confirm this with Aryan/Chirayu before relying on it.
