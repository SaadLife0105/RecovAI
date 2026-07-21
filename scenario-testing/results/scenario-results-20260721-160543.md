# Agent scenario results — 2026-07-21T16:05:43.215Z

Patient: `testpatient3`. 3 run(s) per scenario, full reset between every run.
Scores are computed by `lib/riskEngine.ts` itself; the agent call is the real deployed `risk-agent`.

## (a) Routine low-risk, flat

- **Drug class:** `cannabis`
- **Days seeded:** 7
- **Expected final-day score:** 14.5
- **Computed final-day score:** 14.5 ✅ match
- **Expected agent behaviour (§5.3):** No action. Nothing has changed; alerting here is alert fatigue.

| Run | Outcome | Iter | Truncated | Fallback | Tools called | New alerts | Flagged | Agent msgs | Reasoning summary |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `no_action` | 1 | no | no | — | 0 | no | 0 | I'll review the patient's data to determine what action, if any, is needed.  **Analysis:**  - **Risk score:** 14.5 — low and stable - **Trend:** 0 points per check-in — completely flat across 7 consecutive days - **Mood, sleep, craving:** All consistently healthy (8/10, 7/10, 2/10 respectively) - **Isolation:** None reported - **Activity:** Consistent step count (6000 daily) - **Zone breaches:** None in the last 7 days - **Substance class:** Cannabis (lower acuity than opioids, stimulants, or benzodiazepines) - **Flag status:** Not already under urgent review  This patient is in a stable, low-risk state with no meaningful change from the previous day. All indicators remain within healthy parameters. There is no trend of concern, no breaches, and no new clinical signal that warrants intervention.  **Decision:** No action required.  Did nothing: patient stable across all metrics for 7 days, low craving, no isolation, no zone breaches, zero risk trend. |
| 2 | `no_action` | 1 | no | no | — | 0 | no | 0 | I'll review the patient's check-in data to decide what action, if any, is needed.  The data shows: - **Current check-in (2026-07-21)**: risk score 14.5 - **Trend**: 0 points per check-in (completely flat) - **Recent pattern**: Identical scores for 7 consecutive days (mood 8/10, sleep 7/10, craving 2/10, no isolation, 6000 steps) - **No zone breaches** in the last 7 days - **Primary substance**: Cannabis - **Current flag status**: Not flagged  This is a **stable, low-craving profile in a cannabis patient with no recent breaches and no upward trend**. The scores are healthy across all dimensions—mood and sleep are good, craving is minimal, the patient is physically active and socially engaged. The perfect consistency across 7 days suggests reliable engagement with the monitoring system itself, which is positive.  There is nothing meaningful that has changed. No alert is warranted, and no flag is needed.  **Decision: No action.**  Did nothing: cannabis patient with stable low-risk profile (14.5 score, zero trend, minimal craving, no isolation, good mood/sleep, no recent breaches), consistent engagement over 7 days warrants no clinical intervention. |
| 3 | `no_action` | 1 | no | no | — | 0 | no | 0 | I'll review the patient's current situation using the available data.  Looking at the check-in data provided:  **Current state:** - Risk score: 14.5 (low, on a 0–100 scale) - Mood, sleep, and craving all stable at healthy levels (8/10, 7/10, 2/10 respectively) - No isolation reported - Good step count (6000 steps) - No zone breaches in the last 7 days - Risk score trend: flat at 0 points per check-in (completely stable) - Seven consecutive days of identical, healthy metrics  **Assessment:** This patient is in a stable, low-risk state with no meaningful change from previous check-ins. The scores are good, the trend is flat, there are no breaches, and this is a cannabis patient (lower acuity substance class). There is no clinical signal requiring doctor notification, urgent review, or patient outreach.  **Decision: No action.**  Did nothing: risk score stable at 14.5 for 7 consecutive days with healthy mood, sleep, craving and no isolation—routine low-risk maintenance. |

**Judgement (fill in by hand — correct / incorrect / partially correct, and why):**


---

## (b) Sharp spike after a calm week

- **Drug class:** `cannabis`
- **Days seeded:** 7
- **Expected final-day score:** 78.5
- **Computed final-day score:** 78.5 ✅ match
- **Expected agent behaviour (§5.3):** Alert the doctor, with an XAI explanation.

| Run | Outcome | Iter | Truncated | Fallback | Tools called | New alerts | Flagged | Agent msgs | Reasoning summary |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `timeout_fallback` | 2 | yes | no | `get_risk_score_trend`, `generate_xai_explanation` | 0 | no | 0 | — |
| 2 | `multi_action` | 3 | no | no | `generate_xai_explanation`, `send_doctor_alert`, `flag_for_urgent_review`, `send_patient_message` | 1 | yes | 1 | Single-day collapse from stable baseline across mood, sleep, craving, isolation and activity warrants alert, urgent review flag and warm patient outreach to prompt connection with support. |
| 3 | `multi_action` | 3 | no | no | `get_patient_checkins`, `get_risk_score_trend`, `get_zone_breaches`, `generate_xai_explanation`, `send_doctor_alert`, `send_patient_message`, `flag_for_urgent_review` | 1 | yes | 1 | Acute crisis detected: after 6 stable days, patient reported catastrophic single-day collapse in mood (8→2), sleep (7→3), craving (2→9), plus isolation and activity drop; sent high-urgency alert to doctor with clinical explanation, supportive message to patient, and flagged for urgent review. |

**Judgement (fill in by hand — correct / incorrect / partially correct, and why):**


---

## (c) Medium score, compounding signals (breach + sleep decline + rising craving)

- **Drug class:** `cannabis`
- **Days seeded:** 7
- **Expected final-day score:** 58
- **Computed final-day score:** 58 ✅ match
- **Expected agent behaviour (§5.3):** Nuanced multi-action response — the score alone understates the picture.

| Run | Outcome | Iter | Truncated | Fallback | Tools called | New alerts | Flagged | Agent msgs | Reasoning summary |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `multi_action` | 3 | no | no | `get_risk_score_trend`, `generate_xai_explanation`, `send_doctor_alert`, `flag_for_urgent_review`, `send_patient_message` | 1 | yes | 1 | Escalated to high-urgency alert and urgent review: seven-day deterioration across mood, sleep, craving and activity with today's score jump to 58, following a medium-risk zone breach; patient needs prompt clinical contact. |
| 2 | `timeout_fallback` | 4 | yes | no | `get_patient_checkins`, `get_risk_score_trend`, `generate_xai_explanation`, `send_patient_message`, `send_doctor_alert` | 1 | no | 1 | — |
| 3 | `timeout_fallback` | 3 | yes | no | `get_patient_checkins`, `get_risk_score_trend`, `get_zone_breaches`, `generate_xai_explanation`, `send_doctor_alert`, `flag_for_urgent_review`, `send_patient_message` | 1 | yes | 1 | — |

**Judgement (fill in by hand — correct / incorrect / partially correct, and why):**


---

## (d) High craving alone, everything else fine

- **Drug class:** `cannabis`
- **Days seeded:** 7
- **Expected final-day score:** 37.5
- **Computed final-day score:** 37.5 ✅ match
- **Expected agent behaviour (§5.3):** Supportive patient message; probably not a doctor alert.

| Run | Outcome | Iter | Truncated | Fallback | Tools called | New alerts | Flagged | Agent msgs | Reasoning summary |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `timeout_fallback` | 2 | yes | no | `get_risk_score_trend`, `generate_xai_explanation` | 0 | no | 0 | — |
| 2 | `alerted` | 4 | no | no | `get_risk_score_trend`, `generate_xai_explanation`, `generate_xai_explanation`, `send_doctor_alert` | 1 | no | 0 | Acute craving spike from 2 to 9/10 in cannabis patient with 6 days stable baseline; alerted doctor at medium urgency for early intervention while mood and engagement remain intact. |
| 3 | `timeout_fallback` | 3 | yes | no | `get_patient_checkins`, `get_risk_score_trend`, `get_zone_breaches`, `generate_xai_explanation`, `generate_xai_explanation`, `send_patient_message` | 0 | no | 1 | — |

**Judgement (fill in by hand — correct / incorrect / partially correct, and why):**


---

## (e) Same high score as yesterday, already alerted

- **Drug class:** `cannabis`
- **Days seeded:** 7
- **Expected final-day score:** 78.5
- **Computed final-day score:** 78.5 ✅ match
- **Expected agent behaviour (§5.3):** Restraint — no duplicate alert for an unchanged, already-alerted score.

| Run | Outcome | Iter | Truncated | Fallback | Tools called | New alerts | Flagged | Agent msgs | Reasoning summary |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `multi_action` | 3 | no | no | `generate_xai_explanation`, `get_risk_score_trend`, `get_zone_breaches`, `send_doctor_alert`, `send_patient_message`, `flag_for_urgent_review` | 1 | yes | 1 | Sharp, multi-domain collapse on July 20–21 (mood 8→2, sleep 7→3, craving 2→9, isolation onset, inactivity) persisting unchanged: alerted doctor at high urgency with explanation, sent supportive message to patient, and flagged for urgent review. |
| 2 | `multi_action` | 3 | no | no | `generate_xai_explanation`, `send_doctor_alert`, `send_patient_message`, `flag_for_urgent_review` | 1 | yes | 1 | Acute deterioration across mood, sleep, isolation and craving on 2026-07-20 sustained into 2026-07-21: raised high-urgency alert to doctor, sent supportive message to patient, and flagged for urgent review. |
| 3 | `multi_action` | 3 | no | no | `generate_xai_explanation`, `send_doctor_alert`, `send_patient_message`, `flag_for_urgent_review` | 1 | yes | 1 | Sharp multi-domain deterioration over 48 hours (mood, sleep, craving, isolation, activity all worsened simultaneously) in a cannabis patient with persistent high risk and no recovery — high-urgency alert sent, patient message for support, and case flagged for urgent review. |

**Judgement (fill in by hand — correct / incorrect / partially correct, and why):**


---

## (f) Slow week-long deterioration

- **Drug class:** `cannabis`
- **Days seeded:** 7
- **Expected final-day score:** 80
- **Computed final-day score:** 80 ✅ match
- **Expected agent behaviour (§5.3):** Alert — the gradual slope is exactly what a fixed threshold misses until day 7.

| Run | Outcome | Iter | Truncated | Fallback | Tools called | New alerts | Flagged | Agent msgs | Reasoning summary |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `timeout_fallback` | 3 | yes | no | `generate_xai_explanation`, `get_risk_score_trend`, `send_doctor_alert`, `flag_for_urgent_review`, `send_patient_message` | 1 | yes | 1 | — |
| 2 | `multi_action` | 3 | no | no | `generate_xai_explanation`, `send_doctor_alert`, `flag_for_urgent_review`, `send_patient_message` | 1 | yes | 1 | Escalated: 7-day steep decline in mood (8→2), sleep (7→2), craving (3→9), emergence of isolation on day 6, and activity collapse on day 7 (6000→1500 steps) represent a clustering of risk factors requiring urgent clinical review despite no breaches yet—sent high-urgency alert, flagged for urgent review, and sent supportive message to patient. |
| 3 | `multi_action` | 3 | no | no | `generate_xai_explanation`, `send_doctor_alert`, `flag_for_urgent_review`, `send_patient_message` | 1 | yes | 1 | **Summary:** High-urgency alert sent to doctor with clinical explanation; patient flagged for urgent review; supportive message sent to patient. The rapid 7-day descent from low baseline (17.5 → 80), combined with acute mood/sleep collapse, isolation onset, activity drop, and maxed craving (9/10) on 2026-07-21 constitutes acute decompensation requiring same-day clinical contact. |

**Judgement (fill in by hand — correct / incorrect / partially correct, and why):**


---

## (g) Low score throughout, but a high-risk zone breach 2 days ago

- **Drug class:** `cannabis`
- **Days seeded:** 7
- **Expected final-day score:** 14.5
- **Computed final-day score:** 14.5 ✅ match
- **Expected agent behaviour (§5.3):** Judgement call — the breach is context the score never sees.

| Run | Outcome | Iter | Truncated | Fallback | Tools called | New alerts | Flagged | Agent msgs | Reasoning summary |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `no_action` | 1 | no | no | — | 0 | no | 0 | I'll review the patient's situation systematically.  **Data summary:** - Cannabis patient, 7 consecutive days of identical check-ins (mood 8, sleep 7, craving 2, isolated no, steps 6000) - Risk score flat at 14.5 with zero slope across the week - One zone breach 2 days ago (2026-07-19, classified high_risk) but no new breaches - Not currently flagged for urgent review  **Assessment:** This is a stable cannabis patient with low craving, good mood/sleep, no isolation, and consistent engagement (steps). The risk score is low and completely flat. The zone breach from two days ago is isolated and has not recurred. All indicators are consistent and non-alarming.  **Decision:** No action required. This is routine monitoring of a stable patient.  Did nothing: cannabis patient with stable low risk, flat craving, good mood/sleep, and no new concerning changes across 7 consecutive identical check-ins. |
| 2 | `no_action` | 2 | no | no | `get_patient_checkins`, `get_risk_score_trend`, `get_zone_breaches` | 0 | no | 0 | **No action taken.**  The patient shows seven consecutive days of completely stable metrics: consistent mood (8/10), sleep (7/10), low craving (2/10), no isolation, stable activity (6000 steps), and unchanged risk score (14.5). The trend slope is zero. A single zone breach on 2026-07-19 occurred but the patient's check-in data has remained stable before and after it, suggesting they are coping appropriately. For a cannabis patient with low craving and strong mood/sleep stability over a full week, this represents steady-state recovery without deterioration or escalation. No alert or flag is warranted. |
| 3 | `agent_error_fallback` | 2 | no | no | `get_patient_checkins`, `get_risk_score_trend`, `get_zone_breaches` | 0 | no | 0 | — |

**Judgement (fill in by hand — correct / incorrect / partially correct, and why):**


---

## (h) Persistent isolation, otherwise stable

- **Drug class:** `cannabis`
- **Days seeded:** 7
- **Expected final-day score:** 29.5
- **Computed final-day score:** 29.5 ✅ match
- **Expected agent behaviour (§5.3):** Probably a supportive message; a week of isolation is not a doctor alert on its own.

| Run | Outcome | Iter | Truncated | Fallback | Tools called | New alerts | Flagged | Agent msgs | Reasoning summary |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `no_action` | 1 | no | no | — | 0 | no | 0 | I'll analyze this patient's check-in by reviewing the current data provided.  **Analysis:**  The check-in data shows: - **Risk score**: 29.5 (low-to-moderate range) - **Trend**: 0 points per check-in — completely flat across 7 consecutive days - **Mood, sleep, craving**: All stable (8/10, 7/10, 2/10 respectively) - **Isolation**: Consistent (self-reported isolated) - **Activity**: Stable (6000 steps daily) - **Zone breaches**: None in the last 7 days - **Substance class**: Cannabis (lower acuity than opioid/stimulant) - **Already flagged**: No  **Clinical reasoning:**  This is a stable, routine check-in. The patient shows consistent, low craving (2/10), good mood and sleep, and no behavioral deterioration. The risk score is modest and unchanging. The isolation is a background feature but not new. There is no trend, no breach, no escalation, and no clinical signal warranting intervention.  This is exactly the kind of check-in that should not trigger an alert — the patient is maintaining recovery without signs of acute risk.  **Decision:** No action.  ---  Did nothing: score stable at 29.5 with zero trend, low craving (2/10), good mood/sleep, no zone breaches, routine cannabis recovery monitoring. |
| 2 | `no_action` | 2 | no | no | `get_patient_checkins`, `get_risk_score_trend`, `get_zone_breaches` | 0 | no | 0 | **Decision: No action.**  This patient shows a completely stable pattern over 7 consecutive days: consistent mood (8/10), sleep (7/10), low craving (2/10), and zero risk score drift (slope = 0). Craving is minimal, isolation is the only concern factor but stable and constant, and there have been no zone breaches. For a cannabis patient in early recovery with these metrics and no deterioration, this represents stable engagement in recovery without clinical urgency. The score of 29.5 itself is moderate but unremarkable in context of unchanging stability—alerting on a flat line would create the alert fatigue that undermines monitoring. No doctor alert, no flag, no patient message needed.  Did nothing: risk score stable at 29.5 with flat trend across 7 days, low craving, no zone breaches, and no change in any metric requiring intervention. |
| 3 | `no_action` | 2 | no | no | `get_patient_checkins`, `get_risk_score_trend`, `get_zone_breaches` | 0 | no | 0 | **Analysis:**  This patient presents a completely stable picture: - Risk score of 29.5 (moderate baseline, not alarming for a cannabis patient) - All metrics have remained identical for 7 consecutive days: mood 8/10, sleep 7/10, craving 2/10, isolation self-reported, 6000 steps - Zero slope (0 points per check-in) — no upward or downward trend - No zone breaches in the last 7 days - Not currently flagged for urgent review  There is nothing that has changed or deteriorated. The patient is reporting stable mood, good sleep, very low craving, and consistent engagement (daily check-ins, regular steps). While isolation is present, the overall risk picture is static and within a manageable range for this substance class.  **Decision:** No action required.  Did nothing: risk score stable at 29.5 with no trend, all metrics flat for 7 days, no zone breaches, low craving, and no change from prior alerting. |

**Judgement (fill in by hand — correct / incorrect / partially correct, and why):**


---

## (i) New patient — only 3 days of history, sharp jump on day 3

- **Drug class:** `cannabis`
- **Days seeded:** 3
- **Expected final-day score:** 73.5
- **Computed final-day score:** 73.5 ✅ match
- **Expected agent behaviour (§5.3):** Act on thin history without over-reading a 3-point trend.

| Run | Outcome | Iter | Truncated | Fallback | Tools called | New alerts | Flagged | Agent msgs | Reasoning summary |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `timeout_fallback` | 3 | yes | no | `get_patient_checkins`, `get_risk_score_trend`, `generate_xai_explanation`, `send_doctor_alert`, `flag_for_urgent_review`, `send_patient_message` | 1 | yes | 1 | — |
| 2 | `multi_action` | 3 | no | no | `generate_xai_explanation`, `send_doctor_alert`, `flag_for_urgent_review`, `send_patient_message` | 1 | yes | 1 | **Audit note:** High-urgency alert sent to doctor, patient flagged for urgent review, and supportive message delivered; acute multi-domain deterioration (craving doubled, mood/sleep halved, isolation+inactivity) within 24 hours across stable baseline warrants immediate clinical assessment. |
| 3 | `timeout_fallback` | 2 | yes | no | `get_risk_score_trend`, `generate_xai_explanation`, `send_doctor_alert`, `send_patient_message` | 1 | no | 1 | — |

**Judgement (fill in by hand — correct / incorrect / partially correct, and why):**


---

## (j) Drug-class sensitivity — scenario (b)'s exact sequence, opioid patient

- **Drug class:** `heroin_opioids`
- **Days seeded:** 7
- **Expected final-day score:** 90.275
- **Computed final-day score:** 90.27499999999999 ✅ match
- **Expected agent behaviour (§5.3):** Same inputs as (b) but heroin_opioids: expect more urgency in the agent's framing, not just a higher number. Compare directly against (b)'s runs.

| Run | Outcome | Iter | Truncated | Fallback | Tools called | New alerts | Flagged | Agent msgs | Reasoning summary |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `multi_action` | 3 | no | no | `generate_xai_explanation`, `get_risk_score_trend`, `send_doctor_alert`, `flag_for_urgent_review`, `send_patient_message` | 1 | yes | 1 | **Action taken:** High-urgency alert sent to doctor with clinical explanation, patient flagged for urgent review, and warm supportive message sent to patient. This opioid patient has shown catastrophic acute deterioration (craving 2→9/10, mood 8→2/10, new isolation, sleep collapse) in a single check-in after six days of stability—pattern and substance class together warrant immediate clinical contact. |
| 2 | `multi_action` | 3 | no | no | `generate_xai_explanation`, `get_risk_score_trend`, `send_doctor_alert`, `flag_for_urgent_review`, `send_patient_message` | 1 | yes | 1 | Alert sent, patient flagged, and supportive message delivered: opioid patient with six-day stability has crashed into high-risk presentation (craving 9/10, mood 2/10, isolation, sleep 3/10) in a single check-in, requiring urgent clinical assessment for relapse prevention. |
| 3 | `multi_action` | 3 | no | no | `generate_xai_explanation`, `get_risk_score_trend`, `send_doctor_alert`, `send_patient_message`, `flag_for_urgent_review` | 1 | yes | 1 | **Audit:** Acute multi-domain collapse in opioid patient (mood, sleep, craving, isolation, activity all deteriorated sharply on one day); flagged for urgent review, sent high-urgency alert to doctor with XAI explanation, and sent supportive message to patient encouraging immediate contact with clinician. |

**Judgement (fill in by hand — correct / incorrect / partially correct, and why):**


---
