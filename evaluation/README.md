# rag-chat Evaluation Harness (Phase 4.5)

A **standalone local script** that scores the deployed `rag-chat` Edge Function
against `chatbot-eval-testset.json` using [DeepEval](https://deepeval.com).
It is **not part of the app or CI** — run it by hand when you want fresh
numbers for the dissertation's Testing chapter.

The judge model for every LLM-judged metric is **Claude Sonnet**
(`claude-sonnet-5`), via a custom `DeepEvalBaseLLM` wrapper — single-vendor,
not DeepEval's OpenAI default.

## What it measures

- **Crisis-flag correctness** — a direct `expected_crisis_flag == crisisFlag`
  equality check per case, aggregated to an accuracy number. **Never
  LLM-judged** (safety-critical checks must not depend on a judge's opinion).
- **Retrieval-grounded metrics** (cases with a reference `expected_output` —
  the `general_coping` and `class_specific_coping` categories):
  AnswerRelevancy, Faithfulness, ContextualPrecision, ContextualRecall,
  Hallucination.
- **ToxicityMetric + BiasMetric** on every case regardless of category.

This requires the small opt-in change to `rag-chat`: sending
`{ includeDebugContext: true }` makes the function echo its retrieved KB
passages back as `retrievedContext`, which the retrieval metrics score against.

## Setup

```bash
cd evaluation
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# macOS/Linux:
# source .venv/bin/activate

pip install -r requirements.txt

cp .env.example .env      # then edit .env with real values
```

Fill in `.env`:

- `SUPABASE_URL`, `SUPABASE_ANON_KEY` — your project URL + anon key.
- `EVAL_PATIENT_USERNAME`, `EVAL_PATIENT_PASSWORD` — an existing patient
  account (created by a doctor). The script logs in via Supabase's password
  grant, deriving the synthetic email `{username}@patients.recovai.internal`.
- `ANTHROPIC_API_KEY` — key for the judge model. This is **local to this
  script** and unrelated to the Edge Function secret of the same name.

`.env` is gitignored; never commit it.

## Run

Make sure `rag-chat` is deployed with the `includeDebugContext` change, then:

```bash
python run_eval.py
```

It authenticates once, calls `rag-chat` for each of the 33 cases (with a
~1.5s pause between calls to stay under the 10/min rate limit), scores them,
and writes two timestamped files to `results/`:

- `results-<timestamp>.csv` — one row per case × every metric.
- `summary-<timestamp>.md` — per-category metric averages plus the crisis
  accuracy number on its own, ready to paste into the dissertation.

A single failed call or metric is logged and skipped, not fatal (same
graceful-degradation principle as the app).
