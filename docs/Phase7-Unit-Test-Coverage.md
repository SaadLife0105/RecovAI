# RecovAI — Phase 7.3-A: Unit Test Coverage Report

**For the dissertation's Evaluation/Testing chapter.** Coverage for the 5
pure-logic unit test files, captured 2026-07-23. Scoped deliberately to just
these files — an unscoped, whole-project coverage run would report a
misleadingly low number, since the majority of this codebase is UI screens
and components that were never meant to carry unit tests (those are
verified instead by the security/integration tests and manual device
testing documented separately).

## Results

| File | Statements | Branches | Functions | Lines | Uncovered lines |
|---|---|---|---|---|---|
| `lib/riskEngine.ts` | 100% | 100% | 100% | 100% | — |
| `lib/streakLogic.ts` | 100% | 100% | 100% | 100% | — |
| `lib/geo.ts` | 100% | 100% | 100% | 100% | — |
| `lib/forecast.ts` | 100% | 83.33% | 100% | 100% | line 32 |
| `lib/mauritiusTime.ts` | 50% | 33.33% | 28.57% | 50% | lines 13-14, 26-52 |
| **All 5 combined** | **86.76%** | **85.71%** | **68.75%** | **85.48%** | |

30 tests, all passing, across these 5 suites (confirmed on an earlier
isolated run — `npm test`, exit 0).

## Honest note on `mauritiusTime.ts`

This file is the clear outlier and is disclosed rather than glossed over:
only 2 of its roughly 6-7 exported functions have any test coverage. The
tested functions (confirmed correct) are the ones the rest of the codebase
depends on most heavily for date-boundary logic; the untested remainder are
lower-risk formatting/convenience helpers. Worth a look before final
submission if the dissertation wants to claim comprehensive coverage of
this file specifically — not treated as blocking Phase 7.3 overall, since
the four other files (including the two most safety-critical — the risk
engine and the forecaster) are fully covered.

## How to reproduce this (without accidentally re-running the paid live tests)

```powershell
npx jest --coverage lib/riskEngine.test.ts lib/forecast.test.ts lib/streakLogic.test.ts lib/mauritiusTime.test.ts lib/geo.test.ts
```

**Do not** run bare `npx jest --coverage` with no file arguments — Jest
picks up every `.test.ts` file in the project by default, which includes
`lib/securityRls.test.ts` and `lib/integrationCheckinToAlert.test.ts`. The
former is free but slow; the latter makes a real, billed Anthropic API call
every time. Running the unscoped command once during this project
accidentally triggered both — see `docs/Phase7-Integration-Test-Results.md`'s
addendum for what that incidental second integration-test run revealed.
