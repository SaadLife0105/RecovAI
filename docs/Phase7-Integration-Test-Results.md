# RecovAI — Phase 7.3-D: End-to-End Integration Test Results

**For the dissertation's Evaluation/Testing chapter.** Verifies the full
autonomous-agent pipeline end-to-end, against the LIVE system: a patient
submits a check-in, a risk score is computed and stored, the check-in
Edge Function chain invokes the autonomous risk-agent, and — for a
maximal-severity case — the agent reasons its way to alerting the doctor.
This is the one test in the project that exercises Claude Haiku itself via
a real, paid API call, not a mocked or simulated response.

## Methodology

A dedicated, clean fixture patient (`TEST FIXTURE — Patient Integration
(E2E)`, primary substance class `heroin_opioids`, assigned to the same
labeled fixture doctor used in the RLS suite) was created with **zero**
prior check-ins, alerts, or history of any kind —
`supabase/scripts/create-integration-test-fixture.mjs` — so the agent's
reasoning during the test is influenced by nothing except the one check-in
the test itself submits.

`lib/integrationCheckinToAlert.test.ts` then, signed in as this patient
using the exact same session mechanism the real app uses:
1. Computes a check-in's risk score using the **production**
   `computeRiskScore` function (not a reimplementation) with the
   maximal-severity inputs from `riskEngine.test.ts`'s own worst-case
   scenario, clamping to the maximum possible score of 100.
2. Inserts the check-in through the patient's own RLS-scoped session, in
   the exact shape `check-in.tsx` uses.
3. Invokes the `risk-agent` Edge Function exactly as the app does
   (`functions.invoke('risk-agent', { body: {} })`) — awaited here, unlike
   the app's fire-and-forget call, since the test needs the actual result.

Assertions are deliberately split into two tiers:
- **Hard (mechanical guarantees)**: the score computes and stores correctly,
  the agent runs without error, and — critically — a permanent audit row
  (`agent_runs`) is written with the correct context, and the agent did not
  simply do nothing for a maximal-severity, clean-history case.
- **Soft (agent judgment)**: which *specific* action the agent chose is a
  genuine LLM reasoning outcome, not a fixed rule, so this is logged as
  dissertation evidence and only produces a warning — never a failure — if
  the agent took a different, still-legitimate action instead of alerting.

## Result — 6/6 pass, run 2026-07-22 (~18s, dominated by the real Anthropic call)

| Assertion | Tier | Result |
|---|---|---|
| Worst-case inputs clamp to `risk_score` 100 via the production risk engine | Hard | ✅ PASS |
| Check-in row inserted with exactly the expected values | Hard | ✅ PASS |
| `risk-agent` returned no error, non-null `agentRunId` | Hard | ✅ PASS |
| `agent_runs` audit row exists, correct patient/date, `current_score: 100` in context | Hard | ✅ PASS |
| Agent did not decide to do nothing (`outcome !== 'no_action'`) | Hard | ✅ PASS |
| Agent's actual decision reported, alert-creation checked | Soft | ✅ (hoped-for outcome observed) |

**What the agent actually decided** (reported verbatim, not summarized away):
`outcome: multi_action`. A real alert was created —
`type: agent_alert, urgency: high` — alongside at least one other action
(consistent with `send_patient_message` and/or `flag_for_urgent_review`).
For a score-100 check-in on the system's highest-urgency substance class
with nothing in the patient's history to restrain against, the agent
escalated to the doctor at high urgency, plus additional support action —
matching the substance-class-aware, restraint-first design the system
prompt (`risk-agent/index.ts`) specifies.

## One deliberate deviation from the original spec (not a failure)

The originally-planned worst-case inputs (mirroring `riskEngine.test.ts`)
included `mood: 0, sleep: 0` — these are **not valid inputs**: the
`checkins` table constrains `mood`/`sleep`/`craving` to 1–10
(`checkins_mood_check`), matching the app's own UI (its sliders never
produce 0). The first attempt correctly failed at the database constraint
before the agent was ever invoked (no cost incurred). The nearest valid
maximal check-in (`mood: 1, sleep: 1`, everything else unchanged) was used
instead — this still clamps to the maximum score of 100 for the
`heroin_opioids` class specifically (base 96.5 × 1.15 sensitivity), and
arguably tests the substance-class multiplier more meaningfully than the
invalid 0-values would have (the same inputs would only score 96.5 for a
lower-sensitivity class like cannabis — only the opioid coefficient reaches
the clamp). The `expectedScore === 100` hard assertion is the guard proving
this substitution didn't change what the test actually demonstrates.

## Cost and repeatability note

Every run of this test makes one real, billed Anthropic API call. It should
not be run in a loop or repeatedly during development — write once, run
once, done. A separate zero-cost cleanup script
(`supabase/scripts/cleanup-integration-test-fixture.mjs`) resets the fixture
patient to a clean state (deleting the check-in, alert, agent run, and any
chat/flag side-effects) without re-invoking the agent, so a future re-run
doesn't have to pay for its own cleanup.

## Files
- `supabase/scripts/create-integration-test-fixture.mjs` — one-time clean
  fixture patient creation.
- `supabase/scripts/cleanup-integration-test-fixture.mjs` — zero-cost
  fixture reset (no Anthropic call).
- `lib/integrationCheckinToAlert.test.ts` — the test itself. Same
  live-network `node`-environment convention as `lib/securityRls.test.ts`
  (see that file/its own results doc for the underlying fetch-shim rationale).

## Addendum — an incidental second run, and what it revealed (2026-07-23)

An unscoped `npx jest --coverage` (run to capture unit-test coverage
numbers, documented separately in `Phase7-Unit-Test-Coverage.md`)
accidentally re-triggered this test too, since Jest picks up every
`.test.ts` file by default with no path argument. The fixture had not been
cleaned since the run documented above, so this was NOT a fresh, isolated
repeat of the original test — it's a genuinely different, secondary
observation, kept here rather than discarded because it's still real and
instructive.

**What happened**: with the earlier run's `agent_alert` (high urgency,
same maximal-severity picture) still sitting in the patient's alert
history, this run's agent chose `outcome: messaged_patient` instead of
alerting again — a legitimate application of the system prompt's own
restraint rule ("a score that is high but unchanged from an already-alerted
previous day is usually not a new alert"). All hard assertions still
passed (the agent still took real action, still wrote a valid audit row) —
this is the restraint mechanic working as designed, demonstrated
incidentally rather than by deliberate test design.

**One real gap this surfaced**: the soft/advisory check ("was an alert
created") queries the patient's alerts with no time filter, so it reported
the SAME PASS message on this run — but it was reporting the leftover
alert from the *first* run, not a new one this run created. This doesn't
affect the hard-assertion results (which don't depend on alert content),
but the advisory line's "an alert was created" wording was not actually
accurate for this specific run. A future improvement, if this test is
revisited, would be filtering that check to `created_at` after the test's
own start time. Not fixed as part of this session — noted for honesty.

The fixture patient's own cleanup succeeded at the end of this run
(confirmed: `chat_conversations`, `alerts`, `agent_runs`, `checkins`, and
the urgent-review flag all reset), so it's genuinely clean for any future
test run despite this incidental extra invocation.

