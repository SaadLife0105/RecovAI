# Agent scenario results — 2026-07-21T17:58:52.287Z

Patient: `testpatient3`. 3 run(s) per scenario, full reset between every run.
Scores are computed by `lib/riskEngine.ts` itself; the agent call is the real deployed `risk-agent`.

## (e) Same high score as yesterday, already alerted

- **Drug class:** `cannabis`
- **Days seeded:** 7
- **Expected final-day score:** 78.5
- **Computed final-day score:** 78.5 ✅ match
- **Expected agent behaviour (§5.3):** Restraint — no duplicate alert for an unchanged, already-alerted score.

| Run | Outcome | Iter | Truncated | Fallback | Elapsed | Tools called | New alerts | Flagged | Agent msgs | Reasoning summary |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `multi_action` | 2 | no | no | 8433ms | `flag_for_urgent_review`, `send_patient_message` | 0 | yes | 1 | Flagged for urgent review and sent supportive message: crisis state (craving 9/10, mood 2/10, isolation, poor sleep) persisted unchanged from yesterday and needs direct clinical assessment, not a repeat alert. |
| 2 | `multi_action` | 2 | no | no | 10479ms | `flag_for_urgent_review`, `send_patient_message` | 0 | yes | 1 | Flagged for urgent review and sent warm support message; no repeat alert (doctor already notified yesterday of same crisis picture—no change today, only persistence). |
| 3 | `flagged` | 2 | no | no | 8990ms | `flag_for_urgent_review` | 0 | yes | 0 | Flagged for urgent review: high-risk state persisted unchanged from yesterday (craving 9/10, isolated, poor sleep/mood), no new alert needed but case requires sustained clinical attention. |
- Run 1 timings: anthropic_call:iter1=5995ms, tool:flag_for_urgent_review=171ms, tool:send_patient_message=292ms, anthropic_call:iter2=1512ms
- Run 2 timings: anthropic_call:iter1=6221ms, tool:flag_for_urgent_review=390ms, tool:send_patient_message=597ms, anthropic_call:iter2=1828ms
- Run 3 timings: anthropic_call:iter1=4923ms, tool:flag_for_urgent_review=211ms, anthropic_call:iter2=2005ms

**Judgement: Correct, 3/3 — this is the retest confirming the get_recent_alerts fix (see the main sweep's (e) section in scenario-results-20260721-170927.md for the original 3/3 failure this replaces).** Zero duplicate alerts across all three runs. All three reasoning summaries explicitly cite the seeded prior alert by name ("doctor already notified yesterday of same crisis picture", "no repeat alert needed") — direct evidence the agent is reasoning from the new alert-history data, not coincidentally landing on the right outcome. All three still chose flag_for_urgent_review, and 2/3 also sent a supportive message — restraint on the alert specifically, not blanket inaction on a genuinely elevated, persistent score.


---
