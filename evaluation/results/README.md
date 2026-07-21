# Evaluation results — which file is which

Nothing in this folder has been deleted; every run from 2026-07-20 is kept
deliberately (see Development Plan.md's Dissertation Alignment Check for
why — the sequence of before/after results is itself citable Testing-
chapter evidence, not just noise to discard).

**For the dissertation, use `summary-20260720-135012.md` /
`results-20260720-135012.csv`.** This is the final, full 33-case run, after
every fix below was applied. It's the one cited in Development Plan.md.

Everything else is the trail that got there, in order:

| File (timestamp) | Scope | What it represents |
|---|---|---|
| `113818` | Full 33 cases | **Original baseline.** Before any of today's fixes. This is the run that surfaced the crisis-detection bug: only 4/6 on `crisis_self_harm` (66.7%), while every other category scored 100%. Root cause (found afterward): `"end it all"` and `"hurting myself"` were missing from `CRISIS_PHRASES`. |
| `121535` | `class_specific_coping` only (5 cases) | Run immediately after a `supabase db push` that reported "up to date" — at the time this looked like the retrieval-ranking migration (`0010`) had deployed, but the migration file had actually failed to save to disk and the push genuinely had nothing new to apply. This run is effectively a duplicate of the pre-fix baseline (precision ~0.307, matching `113818`'s class-specific subset), not a real "after" measurement. Kept for an accurate record of the false start, not as a second baseline data point. |
| `123158` | `class_specific_coping` only | After the retrieval-ranking boost (migration `0010`) was actually deployed this time (confirmed via the migration file genuinely existing and `db push` reporting a real apply). First real "after" measurement: contextual precision 0.307 → 0.357. Contextual recall unchanged (0.300 → 0.300). |
| `130856` | `class_specific_coping` only | After adding 5 new KB chunks (19 → 24 total), each targeting a genuine content gap and grounded in a real citation (NIDA, ASAM/JGIM). Second intervention measurement: precision 0.357 → 0.336 (within the range of run-to-run judge variance on an n=5 sample — not read as a real regression), recall still exactly 0.300 — unchanged across three separate measurements at this point (`113818`, `123158`, `130856`). |
| `135012` | **Full 33 cases** | **Final result.** Crisis detection now 33/33 (100%), confirming the phrase-list fix holds across the whole set, not just the two cases that failed originally. This is the number set that goes in the dissertation. |

Short version of the story these five files tell together: a purpose-built
evaluation harness caught a real safety gap that a full day of manual
testing hadn't (`113818` → fix → confirmed in `135012`); a genuinely
low retrieval-recall number was investigated with two separate real
interventions rather than assumed fixable or ignored, and both were
honestly reported as not moving that specific number (`123158`,
`130856`), which is itself defensible evidence once benchmarked against a
comparable dissertation project's KB scale (see the Alignment Check entry).
