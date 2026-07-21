# Agent Scenario Harness (Phase 5.3)

A **standalone local script** that drives the deployed `risk-agent` Edge
Function against ten scripted check-in histories, for the dissertation's
Testing chapter (Development Plan.md §5.3). It is **not part of the app or
CI** — run it by hand when you want fresh agent traces.

Sibling to `evaluation/` (the Phase 4.5 DeepEval harness), but TypeScript/Node
rather than Python, because it needs the Supabase JS client and the app's own
`lib/riskEngine.ts`.

## What is and isn't synthetic

| Real | Synthetic |
|---|---|
| The risk formula (`lib/riskEngine.ts`, imported directly — no score is ever hand-typed) | The check-in history |
| The deployed `risk-agent` function, called over HTTP with a real patient JWT | The zone breaches and the "already alerted" alert in scenario (e) |
| Claude Haiku, its tool loop, and every side effect it chooses | — |
| The `agent_runs` audit row, read back from Postgres | — |

Everything runs against **one dedicated test patient** (`testpatient3`), created
through the app's normal Add Patient flow. Every query, update and delete in the
script is scoped by that patient's UUID.

## Setup

```powershell
cp scenario-testing/.env.example scenario-testing/.env.local
# then fill in SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
```

## Running

Confirm the arithmetic first — no DB, no network, no API spend:

```powershell
npx tsx scenario-testing/run-scenarios.ts --check
```

Then the full sweep (10 scenarios × 3 runs = 30 real agent invocations):

```powershell
node --env-file=scenario-testing/.env.local node_modules/.bin/tsx scenario-testing/run-scenarios.ts
```

Useful flags: `--only=a,b,j` (subset), `--runs=1` (fewer repeats).

Results land in `scenario-testing/results/scenario-results-<timestamp>.md`, one
section per scenario with a per-run table and a blank **Judgement** line to fill
in by hand — §5.3 asks for an honest correct/incorrect discussion, and that
judgement is yours to make, not the harness's.

## What each run does

1. **Reset** — deletes this patient's check-ins, zone breaches, harness-created
   zones, alerts and `RecovAI Check-ins` conversation; clears
   `flagged_for_urgent_review`; restores the scenario's drug class. Runs before
   *every* run, not just every scenario.
2. **Seed** — inserts N days of check-ins ending today, each scored by
   `computeRiskScore`. Aborts loudly if a computed score disagrees with the
   hand-calculated expectation in `scenarios.ts`.
3. **Invoke** — `POST {SUPABASE_URL}/functions/v1/risk-agent` with the patient's
   own bearer token, empty body — byte-for-byte what `check-in.tsx` sends.
4. **Capture** — reads the newest `agent_runs` row, *and* separately counts
   alerts / checks the flag / counts messages in the agent's conversation. The
   audit row should agree with the tables; checking both is the point.

## The ten scenarios

`scenarios.ts` holds every day's inputs explicitly. The four from §5.3's
checklist are (a), (b), (c) and (d); (e)–(j) extend it to cover restraint
against a duplicate alert, slow deterioration, breach-without-score-change,
persistent isolation, a thin 3-day history, and drug-class sensitivity.

The expected scores in that file were hand-calculated against the formula before
the harness existed. **If a computed score ever disagrees with one, that is a
finding** — either the arithmetic or the formula changed. The script stops
rather than quietly adopting the new number.
