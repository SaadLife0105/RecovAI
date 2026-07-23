# RecovAI — Phase 7.3-C: RLS / Cross-Role Security Test Results

**For the dissertation's Evaluation/Testing chapter.** Verifies the row-level
security (RLS) boundaries this project's threat model depends on: that a
patient's clinical data (check-ins, risk zones) is visible only to
themselves and their own assigned doctor, that a patient's journal is
visible to **no one but the patient** (not even their own doctor — the
project's core privacy guarantee, NFR5), and that no doctor can see another
doctor's patients.

## Methodology

A dedicated, permanently-labeled fixture pair (a second doctor and a second
patient, assigned to each other, clearly named `TEST FIXTURE — … (RLS)` and
using an obviously synthetic `@recovai-test-fixture.internal` email domain
so they can never be mistaken for real accounts) was created via
`supabase/scripts/create-security-test-fixtures.mjs`, seeded with one real
row each in `checkins`, `journal_entries`, and `risk_zones` — data that
*must* exist for the test to be meaningful, since a security test that finds
nothing when there was never anything there to leak proves nothing.

`lib/securityRls.test.ts` then signs in as this fixture pair using ordinary
anon-key sessions — **exactly the same credentials and code path the real
app uses** (including reusing `login.tsx`'s own username→email lookup
mechanism), never the privileged service-role key, for the actual boundary
tests — and attempts a series of reads and writes across account boundaries,
using the project's existing, independent test patient/doctor accounts
(`4b95c8f4-…` / `884b5068-…`) as cross-boundary targets, referenced by ID
only (their passwords are never needed, since the test signs in as the
*attacking* account and attempts to read the *target's* data).

Every negative test (an access that should be denied) is paired with a
positive control proving the same query mechanism genuinely works when it
should — without this, an "empty result" could just as easily mean "RLS is
broken and this returns nothing for everyone" as "RLS correctly denied this
specific request." Both must hold for a negative result to mean anything.

## Results — 11/11 pass, run 2026-07-22

| # | Property tested | Result |
|---|---|---|
| 1 | Patient can read their own check-ins (positive control) | ✅ PASS |
| 2 | Patient can read their own journal entries (positive control) | ✅ PASS |
| 3 | Doctor can read their own patient's check-ins & risk zones (positive control) | ✅ PASS |
| 4 | Doctor can read their own patient's profile (positive control) | ✅ PASS |
| 5 | Patient **cannot** read another patient's check-ins | ✅ PASS (denied) |
| 6 | Patient **cannot** read another patient's journal entries | ✅ PASS (denied) |
| 7 | Patient **cannot** read another patient's risk zones | ✅ PASS (denied) |
| 8 | Patient **cannot** insert a check-in for another patient | ✅ PASS (rejected, RLS error 42501) |
| **9** | **Doctor cannot read their OWN patient's journal — NFR5, the core guarantee** | **✅ PASS (denied)** |
| 10 | Doctor **cannot** read another doctor's patient's profile | ✅ PASS (denied) |
| 11 | Doctor **cannot** read another doctor's patient's check-ins/risk zones | ✅ PASS (denied) |

**Every boundary this suite probes held.** No security finding to report or
remediate from this pass.

## Known limitation — closed 2026-07-22

The suite includes an optional strict pre-flight check (using the
service-role key) confirming the two pre-existing target accounts genuinely
exist in the database before the negative tests run against them — without
it, a negative test would report the same "empty result" whether RLS
correctly denied access OR the target simply didn't exist, which would be a
false confirmation. **This has now been run with `SUPABASE_SERVICE_ROLE_KEY`
set: 11/11 still pass, meaning the pre-flight check itself passed silently
(had either target account been missing, `beforeAll` would have thrown and
failed the entire suite, not passed quietly).** Both target accounts are
confirmed to genuinely exist; the negative results are real denials, not an
artifact of missing data.

## Files
- `supabase/scripts/create-security-test-fixtures.mjs` — one-time fixture
  creation (idempotent guard against re-running).
- `lib/securityRls.test.ts` — the test suite itself. Note in its own header:
  this is the one test file in the project that makes real network calls to
  the live Supabase project (all five other `.test.ts` files are pure-function
  unit tests) — it required a Jest environment override (`node` instead of
  the project's default `jest-expo`) and a minimal real-`fetch` shim (built on
  Node's `http`/`https`) since `jest-expo`'s mocked fetch cannot make genuine
  network requests. This is disclosed in-file and doesn't affect what's
  actually being tested — identical Supabase calls succeed unchanged in plain
  Node, and a broken shim would fail all 11 tests, not silently pass any of
  them.
