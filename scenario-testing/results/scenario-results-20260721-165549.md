# Agent scenario results — 2026-07-21T16:55:49.919Z

Patient: `testpatient3`. 3 run(s) per scenario, full reset between every run.
Scores are computed by `lib/riskEngine.ts` itself; the agent call is the real deployed `risk-agent`.

## (a) Routine low-risk, flat

- **Drug class:** `cannabis`
- **Days seeded:** 7
- **Expected final-day score:** 14.5
- **Computed final-day score:** 14.5 ✅ match
- **Expected agent behaviour (§5.3):** No action. Nothing has changed; alerting here is alert fatigue.

| Run | Outcome | Iter | Truncated | Fallback | Elapsed | Tools called | New alerts | Flagged | Agent msgs | Reasoning summary |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `no_action` | 1 | no | no | 4502ms | — | 0 | no | 0 | I have reviewed the patient's check-in data. This cannabis patient shows **completely stable metrics across 7 consecutive days**: mood 8/10, sleep 7/10, craving 2/10, no isolation, consistent activity (6000 steps), and a flat risk score of 14.5 with zero slope. There are no zone breaches. The current score of 14.5 is low-to-moderate and entirely consistent with the established pattern.  **No action needed**: scores stable, craving minimal and unchanging, no zone breaches, trend flat. |
| 2 | `no_action` | 1 | no | no | 4417ms | — | 0 | no | 0 | I have reviewed the patient's daily check-in data. Here is my assessment:  **Data summary:** - Current risk score: 14.5 (stable for 7 consecutive days) - Trend: 0 points per check-in (completely flat) - Mood, sleep, craving, isolation, and activity: all stable and healthy across the entire week - No zone breaches in the last 7 days - Primary substance: cannabis (lower overdose/acute risk profile)  **Decision: No action.**  This patient is in a stable, low-risk state with consistent positive indicators across all domains. The risk score is low and unchanged, craving is minimal (2/10), mood and sleep are good, the patient is not isolated, and activity levels are maintained. There is nothing new or concerning in this check-in that would warrant an alert, a message, or a flag. The flat trend and absence of zone breaches confirm this is routine monitoring.  Did nothing: all metrics stable at low risk for seven consecutive days, no new change or concern. |
| 3 | `no_action` | 1 | no | no | 4768ms | — | 0 | no | 0 | I have reviewed the patient's check-in data from 2026-07-21.  **Analysis:**  - **Risk score**: 14.5 — low and stable - **Trend**: Flat at 0 points per check-in across 7 consecutive days - **Mood, sleep, craving**: All consistent and healthy (8/10, 7/10, 2/10 respectively) - **Isolation**: None reported - **Activity**: Steady at 6000 steps - **Zone breaches**: None in the last 7 days - **Substance class**: Cannabis (lower overdose urgency than opioids/stimulants)  This patient is in a stable, low-risk state with no meaningful change from the previous 6 days. All indicators are within a healthy range, and there is no emerging pattern requiring intervention.  **Decision**: No action.  Did nothing: risk score stable at 14.5 with flat trend, craving minimal, mood and sleep healthy, no zone breaches, and no change from prior days warranting alert or review. |
- Run 1 timings: anthropic_call:iter1=2416ms
- Run 2 timings: anthropic_call:iter1=3513ms
- Run 3 timings: anthropic_call:iter1=3387ms

**Judgement (fill in by hand — correct / incorrect / partially correct, and why):**


---

## (b) Sharp spike after a calm week

- **Drug class:** `cannabis`
- **Days seeded:** 7
- **Expected final-day score:** 78.5
- **Computed final-day score:** 78.5 ✅ match
- **Expected agent behaviour (§5.3):** Alert the doctor, with an XAI explanation.

| Run | Outcome | Iter | Truncated | Fallback | Elapsed | Tools called | New alerts | Flagged | Agent msgs | Reasoning summary |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `timeout_after_action` | 3 | yes | no | 15214ms | `generate_xai_explanation`, `send_patient_message`, `send_doctor_alert` | 1 | no | 1 | [Auto-generated — the model did not produce its own closing summary before the run ended. Actions taken: send_patient_message, send_doctor_alert.] |
| 2 | `timeout_after_action` | 3 | yes | no | 15216ms | `generate_xai_explanation`, `send_doctor_alert`, `flag_for_urgent_review` | 1 | yes | 0 | [Auto-generated — the model did not produce its own closing summary before the run ended. Actions taken: flag_for_urgent_review, send_doctor_alert.] |
| 3 | `agent_error_after_action` | 3 | no | no | 12058ms | `generate_xai_explanation`, `send_patient_message`, `send_doctor_alert` | 1 | no | 1 | [Auto-generated — the model did not produce its own closing summary before the run ended. Actions taken: send_patient_message, send_doctor_alert.] |
- Run 1 timings: anthropic_call:iter1=4866ms, tool:send_patient_message=904ms, tool:generate_xai_explanation=4415ms, anthropic_call:iter2=2151ms, tool:send_doctor_alert=707ms, anthropic_call:iter3=1216ms
- Run 2 timings: anthropic_call:iter1=7715ms, tool:generate_xai_explanation=2480ms, anthropic_call:iter2=2040ms, tool:flag_for_urgent_review=218ms, tool:send_doctor_alert=690ms, anthropic_call:iter3=380ms
- Run 3 timings: anthropic_call:iter1=6870ms, tool:send_patient_message=160ms, tool:generate_xai_explanation=2213ms, anthropic_call:iter2=1921ms, tool:send_doctor_alert=308ms, anthropic_call:iter3=386ms

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
| 1 | `agent_error_no_action` | 1 | no | no | 2360ms | — | 0 | no | 0 | [Auto-generated — the run ended without a closing summary and without taking any action. Outcome: agent_error_no_action.] |
| 2 | `agent_error_no_action` | 1 | no | no | 1209ms | — | 0 | no | 0 | [Auto-generated — the run ended without a closing summary and without taking any action. Outcome: agent_error_no_action.] |
| 3 | `agent_error_no_action` | 1 | no | no | 635ms | — | 0 | no | 0 | [Auto-generated — the run ended without a closing summary and without taking any action. Outcome: agent_error_no_action.] |
- Run 1 timings: anthropic_call:iter1=500ms
- Run 2 timings: anthropic_call:iter1=948ms
- Run 3 timings: anthropic_call:iter1=388ms

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
| 1 | `agent_error_no_action` | 1 | no | no | 855ms | — | 0 | no | 0 | [Auto-generated — the run ended without a closing summary and without taking any action. Outcome: agent_error_no_action.] |
| 2 | `agent_error_no_action` | 1 | no | no | 781ms | — | 0 | no | 0 | [Auto-generated — the run ended without a closing summary and without taking any action. Outcome: agent_error_no_action.] |
| 3 | `agent_error_no_action` | 1 | no | no | 771ms | — | 0 | no | 0 | [Auto-generated — the run ended without a closing summary and without taking any action. Outcome: agent_error_no_action.] |
- Run 1 timings: anthropic_call:iter1=611ms
- Run 2 timings: anthropic_call:iter1=527ms
- Run 3 timings: anthropic_call:iter1=481ms

**Judgement (fill in by hand — correct / incorrect / partially correct, and why):**


---

## (e) Same high score as yesterday, already alerted

- **Drug class:** `cannabis`
- **Days seeded:** 7
- **Expected final-day score:** 78.5
- **Computed final-day score:** 78.5 ✅ match
- **Expected agent behaviour (§5.3):** Restraint — no duplicate alert for an unchanged, already-alerted score.

| Run | Outcome | Iter | Truncated | Fallback | Elapsed | Tools called | New alerts | Flagged | Agent msgs | Reasoning summary |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `agent_error_fallback` | 1 | no | yes | 2997ms | `fallback:deterministic_high_risk_alert` | 1 | no | 0 | [Auto-generated — the run ended without a closing summary and without taking any action. Outcome: agent_error_fallback.] |
| 2 | `agent_error_fallback` | 1 | no | yes | 6719ms | `fallback:deterministic_high_risk_alert` | 1 | no | 0 | [Auto-generated — the run ended without a closing summary and without taking any action. Outcome: agent_error_fallback.] |
| 3 | `agent_error_fallback` | 1 | no | yes | 3411ms | `fallback:deterministic_high_risk_alert` | 1 | no | 0 | [Auto-generated — the run ended without a closing summary and without taking any action. Outcome: agent_error_fallback.] |
- Run 1 timings: anthropic_call:iter1=456ms
- Run 2 timings: anthropic_call:iter1=876ms
- Run 3 timings: anthropic_call:iter1=460ms

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
| 1 | `multi_action` | 3 | no | no | 13272ms | `generate_xai_explanation`, `send_patient_message`, `flag_for_urgent_review`, `send_doctor_alert` | 1 | yes | 1 | Raised high-urgency alert: patient in acute multi-domain crisis (mood 2/10, sleep 2/10, craving 9/10, isolated, activity collapsed) with 7-day steep upward risk trajectory; flagged for urgent review and sent supportive message. |
| 2 | `timeout_after_action` | 2 | yes | no | 15228ms | `generate_xai_explanation`, `send_patient_message`, `flag_for_urgent_review` | 0 | yes | 1 | [Auto-generated — the model did not produce its own closing summary before the run ended. Actions taken: flag_for_urgent_review, send_patient_message.] |
| 3 | `timeout_after_action` | 2 | yes | no | 15422ms | `generate_xai_explanation`, `send_patient_message`, `send_doctor_alert`, `flag_for_urgent_review` | 1 | yes | 1 | [Auto-generated — the model did not produce its own closing summary before the run ended. Actions taken: send_patient_message, flag_for_urgent_review, send_doctor_alert.] |
- Run 1 timings: anthropic_call:iter1=6401ms, tool:flag_for_urgent_review=90ms, tool:send_patient_message=163ms, tool:generate_xai_explanation=2540ms, anthropic_call:iter2=1833ms, tool:send_doctor_alert=354ms, anthropic_call:iter3=1802ms
- Run 2 timings: anthropic_call:iter1=6104ms, tool:flag_for_urgent_review=229ms, tool:send_patient_message=596ms, tool:generate_xai_explanation=3161ms, anthropic_call:iter2=4123ms
- Run 3 timings: anthropic_call:iter1=7136ms, tool:send_patient_message=614ms, tool:generate_xai_explanation=4329ms, anthropic_call:iter2=2086ms, tool:flag_for_urgent_review=230ms, tool:send_doctor_alert=682ms

**Judgement (fill in by hand — correct / incorrect / partially correct, and why):**


---

## (g) Low score throughout, but a high-risk zone breach 2 days ago

- **Drug class:** `cannabis`
- **Days seeded:** 7
- **Expected final-day score:** 14.5
- **Computed final-day score:** 14.5 ✅ match
- **Expected agent behaviour (§5.3):** Judgement call — the breach is context the score never sees.

| Run | Outcome | Iter | Truncated | Fallback | Elapsed | Tools called | New alerts | Flagged | Agent msgs | Reasoning summary |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `no_action` | 1 | no | no | 6007ms | — | 0 | no | 0 | I have reviewed the patient's check-in data from 2026-07-21.  **Situation:** - Risk score: 14.5 (low, well within safe range) - Trend: flat (0 points per check-in) across 7 consecutive identical days - Mood, sleep, craving all stable and healthy (8/10, 7/10, 2/10 respectively) - No isolation, good activity level (6000 steps daily) - One zone breach on 2026-07-19 (classified high_risk) with no subsequent deterioration  **Assessment:** This is a stable, low-risk check-in with no meaningful change from the preceding six days. The patient shows consistent engagement in recovery with healthy mood, minimal craving, good sleep and regular activity. The prior zone breach has not escalated into a rising pattern or new symptoms. The flat trend and low absolute score do not warrant clinical alert or flag.  **Decision:** No action.  Did nothing: scores and all metrics completely stable across 7 days, low absolute risk, cannabis patient with minimal craving and no escalating pattern. |
| 2 | `no_action` | 1 | no | no | 6300ms | — | 0 | no | 0 | I have reviewed the patient's daily check-in and recent history.  **Summary of findings:** - Risk score: 14.5 (unchanged for 7 consecutive days) - Trend: flat at 0 points per check-in - Mood, sleep, craving, isolation, and activity: all stable and consistently favorable (mood 8/10, sleep 7/10, craving 2/10, not isolated, 6000 steps daily) - Primary substance: cannabis - One zone breach noted on 2026-07-19 (classified high_risk), but no subsequent breaches and no deterioration since  **Decision: No action.**  This patient is in stable, low-risk recovery with consistently good engagement, low craving, and stable mood and sleep over a full week. The single zone breach from two days ago has not triggered any escalation in the metrics or additional breaches. For a cannabis patient with this stability and no trend change, routine monitoring without alert or flag is appropriate.  Did nothing: cannabis patient stable across 7 days with flat risk score, low craving (2/10), good mood/sleep, and no recent trend change. |
| 3 | `no_action` | 1 | no | no | 10647ms | — | 0 | no | 0 | I have all the data I need from the patient context provided. Let me reason through this:  **What I observe:** - 7 consecutive days of identical check-ins (2026-07-15 through 2026-07-21) - Risk score: 14.5 (low, stable) - Mood, sleep, craving all stable and healthy (8/10, 7/10, 2/10 respectively) - No isolation reported - Step count consistent at 6000 - Risk score slope: 0 (flat trend) - One zone breach on 2026-07-19 (classified high_risk, "Scenario harness zone"), but this is 2 days old and has not been followed by deterioration  **Clinical picture:** This is a cannabis patient in stable early recovery. The zone breach two days ago did not destabilise mood, sleep, craving, or engagement (steps, isolation). All metrics remain healthy and flat. The perfect uniformity across 7 days is unusual but consistent with stable management.  **Decision:** No alert, no flag, no message needed. This is a well-managed patient with stable metrics and no new deterioration.  Did nothing: cannabis patient stable across all domains for 7 consecutive days, risk flat at 14.5, prior zone breach not followed by clinical change. |
- Run 1 timings: anthropic_call:iter1=4459ms
- Run 2 timings: anthropic_call:iter1=4422ms
- Run 3 timings: anthropic_call:iter1=9036ms

**Judgement (fill in by hand — correct / incorrect / partially correct, and why):**


---

## (h) Persistent isolation, otherwise stable

- **Drug class:** `cannabis`
- **Days seeded:** 7
- **Expected final-day score:** 29.5
- **Computed final-day score:** 29.5 ✅ match
- **Expected agent behaviour (§5.3):** Probably a supportive message; a week of isolation is not a doctor alert on its own.

| Run | Outcome | Iter | Truncated | Fallback | Elapsed | Tools called | New alerts | Flagged | Agent msgs | Reasoning summary |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `no_action` | 1 | no | no | 5796ms | — | 0 | no | 0 | I have reviewed the patient's daily check-in and recent history.  **Summary:** The patient submitted their 7th consecutive check-in with identical metrics across all dimensions—mood 8/10, sleep 7/10, craving 2/10, isolated, 6000 steps—yielding a stable risk score of 29.5 with zero trend. There have been no zone breaches in the last 7 days.  **Decision:** No action taken.  **Reasoning:** While the risk score of 29.5 is moderate and the self-reported isolation is a chronic feature, the complete stability across a full week, combined with low craving (2/10), good mood and sleep, and no behavioral breaches, indicates a patient in a steady state of early-to-mid recovery on cannabis. The flat trend and absence of deterioration do not warrant clinical intervention, alert, or escalation. The pattern is reassuring rather than alarming, and action would constitute unnecessary alert fatigue.  Audit record: Did nothing; 7-day plateau of stable metrics, low craving, no breaches, zero risk trend—routine stable recovery state. |
| 2 | `no_action` | 1 | no | no | 4912ms | — | 0 | no | 0 | I've reviewed the patient's check-in history and current status.  **Analysis:** - Current risk score: 29.5 (stable) - Trend: 0 points per check-in (completely flat across 7 days) - Pattern: Identical readings for all metrics across the entire week (mood 8, sleep 7, craving 2, isolated yes, steps 6000) - No zone breaches in the last 7 days - Cannabis patient with low, stable craving (2/10) and good mood/sleep  This is a stable, routine check-in with no meaningful change from the established baseline. The patient shows consistent positive engagement, low craving, maintained sleep and mood, and no breach activity. The perfect uniformity across a week suggests reliable self-reporting rather than risk escalation.  **Decision: No action.**  Did nothing: risk score stable at 29.5 with zero trend, craving low and unchanged, no zone breaches, routine engagement maintained. |
| 3 | `no_action` | 1 | no | no | 3981ms | — | 0 | no | 0 | I have reviewed the patient's daily check-in for 2026-07-21.  **Analysis:** - Risk score: 29.5 (low to moderate) - Trend: flat at 0 points per check-in across 7 consecutive days - All metrics stable: mood 8/10, sleep 7/10, craving 2/10 - Isolation present but consistent throughout period - No zone breaches in the last 7 days - Cannabis patient with low craving and good mood/sleep stability  **Decision:** No action required.  Did nothing: risk score stable and low, all metrics flat across 7 days, no craving rise or zone breaches, cannabis patient showing consistent recovery pattern. |
- Run 1 timings: anthropic_call:iter1=4264ms
- Run 2 timings: anthropic_call:iter1=4083ms
- Run 3 timings: anthropic_call:iter1=2922ms

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
| 1 | `multi_action` | 3 | no | no | 12534ms | `generate_xai_explanation`, `send_patient_message`, `send_doctor_alert` | 1 | no | 1 | Acute deterioration across mood, sleep, craving, activity and isolation in 24 hours warrants high-urgency alert; sent supportive message and doctor notification. |
| 2 | `multi_action` | 3 | no | no | 13400ms | `generate_xai_explanation`, `send_doctor_alert`, `send_patient_message` | 1 | no | 1 | Sharp single-day deterioration in mood, sleep, craving, isolation and activity in cannabis patient—medium-urgency alert sent to doctor with explanation; supportive message sent to patient. |
| 3 | `multi_action` | 3 | no | no | 14243ms | `generate_xai_explanation`, `send_doctor_alert`, `flag_for_urgent_review`, `send_patient_message` | 1 | yes | 1 | **Audit note:** Acute multi-domain deterioration (mood, sleep, craving, isolation, activity) over one day with steep upward trend — sent high-urgency alert with XAI explanation, flagged for urgent review, and sent supportive message to patient. |
- Run 1 timings: anthropic_call:iter1=5135ms, tool:send_patient_message=184ms, tool:generate_xai_explanation=2656ms, anthropic_call:iter2=2778ms, tool:send_doctor_alert=298ms, anthropic_call:iter3=1346ms
- Run 2 timings: anthropic_call:iter1=4072ms, tool:generate_xai_explanation=2574ms, anthropic_call:iter2=2856ms, tool:send_patient_message=595ms, tool:send_doctor_alert=696ms, anthropic_call:iter3=1351ms
- Run 3 timings: anthropic_call:iter1=5428ms, tool:generate_xai_explanation=2847ms, anthropic_call:iter2=2763ms, tool:flag_for_urgent_review=236ms, tool:send_patient_message=607ms, tool:send_doctor_alert=662ms, anthropic_call:iter3=1713ms

**Judgement (fill in by hand — correct / incorrect / partially correct, and why):**


---

## (j) Drug-class sensitivity — scenario (b)'s exact sequence, opioid patient

- **Drug class:** `heroin_opioids`
- **Days seeded:** 7
- **Expected final-day score:** 90.275
- **Computed final-day score:** 90.27499999999999 ✅ match
- **Expected agent behaviour (§5.3):** Same inputs as (b) but heroin_opioids: expect more urgency in the agent's framing, not just a higher number. Compare directly against (b)'s runs.

| Run | Outcome | Iter | Truncated | Fallback | Elapsed | Tools called | New alerts | Flagged | Agent msgs | Reasoning summary |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `timeout_after_action` | 3 | yes | no | 15228ms | `generate_xai_explanation`, `flag_for_urgent_review`, `send_doctor_alert`, `send_patient_message` | 1 | yes | 1 | [Auto-generated — the model did not produce its own closing summary before the run ended. Actions taken: flag_for_urgent_review, send_doctor_alert, send_patient_message.] |
| 2 | `multi_action` | 3 | no | no | 15231ms | `generate_xai_explanation`, `send_patient_message`, `flag_for_urgent_review`, `send_doctor_alert` | 1 | yes | 1 | **Summary:**  Acute multi-domain crisis in opioid-patient after six days of stable low-risk baseline: mood, sleep, craving, isolation and activity all deteriorated sharply in single check-in; sent high-urgency alert, flagged for urgent review, and offered supportive contact to patient. |
| 3 | `timeout_after_action` | 3 | yes | no | 15243ms | `generate_xai_explanation`, `flag_for_urgent_review`, `send_patient_message`, `send_doctor_alert` | 1 | yes | 1 | [Auto-generated — the model did not produce its own closing summary before the run ended. Actions taken: flag_for_urgent_review, send_patient_message, send_doctor_alert.] |
- Run 1 timings: anthropic_call:iter1=4844ms, tool:flag_for_urgent_review=222ms, tool:generate_xai_explanation=2913ms, anthropic_call:iter2=4924ms, tool:send_doctor_alert=724ms, tool:send_patient_message=897ms, anthropic_call:iter3=817ms
- Run 2 timings: anthropic_call:iter1=5811ms, tool:flag_for_urgent_review=238ms, tool:send_patient_message=968ms, tool:generate_xai_explanation=3483ms, anthropic_call:iter2=2673ms, tool:send_doctor_alert=667ms, anthropic_call:iter3=1700ms
- Run 3 timings: anthropic_call:iter1=6197ms, tool:flag_for_urgent_review=563ms, tool:send_patient_message=637ms, tool:generate_xai_explanation=2466ms, anthropic_call:iter2=1878ms, tool:send_doctor_alert=645ms, anthropic_call:iter3=2150ms

**Judgement (fill in by hand — correct / incorrect / partially correct, and why):**


---
