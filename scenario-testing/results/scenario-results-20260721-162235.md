# Agent scenario results — 2026-07-21T16:22:35.613Z

Patient: `testpatient3`. 3 run(s) per scenario, full reset between every run.
Scores are computed by `lib/riskEngine.ts` itself; the agent call is the real deployed `risk-agent`.

## (b) Sharp spike after a calm week

- **Drug class:** `cannabis`
- **Days seeded:** 7
- **Expected final-day score:** 78.5
- **Computed final-day score:** 78.5 ✅ match
- **Expected agent behaviour (§5.3):** Alert the doctor, with an XAI explanation.

| Run | Outcome | Iter | Truncated | Fallback | Elapsed | Tools called | New alerts | Flagged | Agent msgs | Reasoning summary |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `agent_error_fallback` | 1 | no | yes | 5988ms | `fallback:deterministic_high_risk_alert` | 1 | no | 0 | — |
| 2 | `agent_error_fallback` | 2 | no | no | 4990ms | `get_risk_score_trend`, `generate_xai_explanation` | 0 | no | 0 | — |
| 3 | `agent_error_fallback` | 1 | no | yes | 4825ms | `fallback:deterministic_high_risk_alert` | 1 | no | 0 | — |
- Run 1 timings: anthropic_call:iter1=1117ms
- Run 2 timings: anthropic_call:iter1=2191ms, tool:get_risk_score_trend=0ms, tool:generate_xai_explanation=1692ms, anthropic_call:iter2=742ms
- Run 3 timings: anthropic_call:iter1=838ms

**Judgement (fill in by hand — correct / incorrect / partially correct, and why):**


---

## (c) Medium score, compounding signals (breach + sleep decline + rising craving)

- **Drug class:** `cannabis`
- **Days seeded:** 7
- **Expected final-day score:** 58
- **Computed final-day score:** 58 ✅ match
- **Expected agent behaviour (§5.3):** Nuanced multi-action response — the score alone understates the picture.

| Run | Outcome | Iter | Truncated | Fallback | Elapsed | Tools called | New alerts | Flagged | Agent msgs | Reasoning summary |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `agent_error_fallback` | 3 | no | no | 8816ms | `get_risk_score_trend`, `get_zone_breaches`, `generate_xai_explanation`, `generate_xai_explanation` | 0 | no | 0 | — |
| 2 | `agent_error_fallback` | 2 | no | no | 7738ms | `get_risk_score_trend`, `generate_xai_explanation` | 0 | no | 0 | — |
| 3 | `agent_error_fallback` | 3 | no | no | 8553ms | `get_patient_checkins`, `get_risk_score_trend`, `generate_xai_explanation`, `generate_xai_explanation` | 0 | no | 0 | — |
- Run 1 timings: anthropic_call:iter1=1672ms, tool:get_risk_score_trend=0ms, tool:get_zone_breaches=0ms, tool:generate_xai_explanation=1577ms, anthropic_call:iter2=1184ms, tool:generate_xai_explanation=1988ms, anthropic_call:iter3=1151ms
- Run 2 timings: anthropic_call:iter1=2168ms, tool:get_risk_score_trend=0ms, tool:generate_xai_explanation=1853ms, anthropic_call:iter2=1879ms
- Run 3 timings: anthropic_call:iter1=2222ms, tool:get_patient_checkins=0ms, tool:get_risk_score_trend=0ms, tool:generate_xai_explanation=1976ms, anthropic_call:iter2=1280ms, tool:generate_xai_explanation=1119ms, anthropic_call:iter3=1480ms

**Judgement (fill in by hand — correct / incorrect / partially correct, and why):**


---

## (d) High craving alone, everything else fine

- **Drug class:** `cannabis`
- **Days seeded:** 7
- **Expected final-day score:** 37.5
- **Computed final-day score:** 37.5 ✅ match
- **Expected agent behaviour (§5.3):** Supportive patient message; probably not a doctor alert.

| Run | Outcome | Iter | Truncated | Fallback | Elapsed | Tools called | New alerts | Flagged | Agent msgs | Reasoning summary |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `agent_error_fallback` | 2 | no | no | 6774ms | `generate_xai_explanation`, `get_zone_breaches` | 0 | no | 0 | — |
| 2 | `agent_error_fallback` | 2 | no | no | 5177ms | `get_risk_score_trend`, `generate_xai_explanation` | 0 | no | 0 | — |
| 3 | `multi_action` | 4 | no | no | 15065ms | `get_patient_checkins`, `get_risk_score_trend`, `generate_xai_explanation`, `send_patient_message`, `send_doctor_alert` | 1 | no | 1 | Acute craving spike from 2/10 to 9/10 in stable cannabis patient: alerted doctor at medium urgency and sent supportive message to patient; contextual stability (no isolation, no zone breaches, activity unchanged) suggests manageable acute trigger rather than pattern deterioration. |
- Run 1 timings: anthropic_call:iter1=1209ms, tool:generate_xai_explanation=2629ms, tool:get_zone_breaches=0ms, anthropic_call:iter2=1079ms
- Run 2 timings: anthropic_call:iter1=1241ms, tool:get_risk_score_trend=0ms, tool:generate_xai_explanation=2703ms, anthropic_call:iter2=923ms
- Run 3 timings: anthropic_call:iter1=1588ms, tool:get_patient_checkins=0ms, tool:get_risk_score_trend=0ms, anthropic_call:iter2=3892ms, tool:generate_xai_explanation=2643ms, tool:send_patient_message=614ms, anthropic_call:iter3=2836ms, tool:send_doctor_alert=716ms, anthropic_call:iter4=1902ms

**Judgement (fill in by hand — correct / incorrect / partially correct, and why):**


---

## (f) Slow week-long deterioration

- **Drug class:** `cannabis`
- **Days seeded:** 7
- **Expected final-day score:** 80
- **Computed final-day score:** 80 ✅ match
- **Expected agent behaviour (§5.3):** Alert — the gradual slope is exactly what a fixed threshold misses until day 7.

| Run | Outcome | Iter | Truncated | Fallback | Elapsed | Tools called | New alerts | Flagged | Agent msgs | Reasoning summary |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `multi_action` | 3 | no | no | 14295ms | `generate_xai_explanation`, `send_doctor_alert`, `send_patient_message`, `flag_for_urgent_review` | 1 | yes | 1 | **Alert sent, patient message sent, and case flagged for urgent review:** Seven-day escalating pattern of mood collapse (8→2), sleep breakdown (7→2), craving surge (3→9), emergence of isolation on day 6, and activity collapse from 6000 to 1500 steps on day 7 indicates imminent risk requiring immediate clinical contact. |
| 2 | `multi_action` | 3 | no | no | 14303ms | `generate_xai_explanation`, `get_risk_score_trend`, `send_doctor_alert`, `flag_for_urgent_review`, `send_patient_message` | 1 | yes | 1 | High-urgency alert sent to doctor with clinical explanation; patient flagged for urgent review and contacted with supportive message—relentless 7-day deterioration across mood, sleep, craving (now 9/10), isolation, and activity meets threshold for immediate clinical intervention in cannabis recovery. |
| 3 | `timeout_fallback` | 2 | yes | no | 15562ms | `generate_xai_explanation`, `get_risk_score_trend` | 0 | no | 0 | — |
- Run 1 timings: anthropic_call:iter1=2252ms, tool:generate_xai_explanation=2682ms, anthropic_call:iter2=3438ms, tool:send_doctor_alert=1155ms, tool:send_patient_message=619ms, tool:flag_for_urgent_review=209ms, anthropic_call:iter3=2418ms
- Run 2 timings: anthropic_call:iter1=2039ms, tool:generate_xai_explanation=2743ms, tool:get_risk_score_trend=0ms, anthropic_call:iter2=6479ms, tool:send_doctor_alert=295ms, tool:flag_for_urgent_review=74ms, tool:send_patient_message=205ms, anthropic_call:iter3=1808ms
- Run 3 timings: anthropic_call:iter1=1815ms, tool:generate_xai_explanation=4008ms, tool:get_risk_score_trend=0ms, anthropic_call:iter2=7589ms

**Judgement (fill in by hand — correct / incorrect / partially correct, and why):**


---

## (i) New patient — only 3 days of history, sharp jump on day 3

- **Drug class:** `cannabis`
- **Days seeded:** 3
- **Expected final-day score:** 73.5
- **Computed final-day score:** 73.5 ✅ match
- **Expected agent behaviour (§5.3):** Act on thin history without over-reading a 3-point trend.

| Run | Outcome | Iter | Truncated | Fallback | Elapsed | Tools called | New alerts | Flagged | Agent msgs | Reasoning summary |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `agent_error_fallback` | 2 | no | no | 6706ms | `get_risk_score_trend`, `generate_xai_explanation` | 0 | no | 0 | — |
| 2 | `multi_action` | 3 | no | no | 12475ms | `get_risk_score_trend`, `get_zone_breaches`, `generate_xai_explanation`, `send_doctor_alert`, `send_patient_message` | 1 | no | 1 | Sent high-urgency alert to doctor with clinical explanation and supportive message to patient: acute concurrent rise in craving, mood collapse, sleep loss, and isolation in 24 hours signals real vulnerability requiring same-day review. |
| 3 | `timeout_fallback` | 4 | yes | no | 15074ms | `get_patient_checkins`, `get_risk_score_trend`, `get_zone_breaches`, `generate_xai_explanation`, `send_patient_message`, `send_doctor_alert` | 1 | no | 1 | — |
- Run 1 timings: anthropic_call:iter1=1385ms, tool:get_risk_score_trend=0ms, tool:generate_xai_explanation=2993ms, anthropic_call:iter2=1441ms
- Run 2 timings: anthropic_call:iter1=2563ms, tool:get_risk_score_trend=0ms, tool:get_zone_breaches=0ms, tool:generate_xai_explanation=2311ms, anthropic_call:iter2=5226ms, tool:send_doctor_alert=372ms, tool:send_patient_message=166ms, anthropic_call:iter3=1537ms
- Run 3 timings: anthropic_call:iter1=1578ms, tool:get_patient_checkins=0ms, tool:get_risk_score_trend=0ms, tool:get_zone_breaches=0ms, anthropic_call:iter2=5666ms, tool:generate_xai_explanation=2684ms, tool:send_patient_message=176ms, anthropic_call:iter3=2804ms, tool:send_doctor_alert=338ms, anthropic_call:iter4=1527ms

**Judgement (fill in by hand — correct / incorrect / partially correct, and why):**


---
