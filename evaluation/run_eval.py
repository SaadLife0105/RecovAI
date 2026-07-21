"""Phase 4.5 rag-chat evaluation harness (Development Plan.md §4.5).

Standalone local script — NOT part of the app or CI. Authenticates once as the
eval patient, calls the deployed rag-chat function for every case in the test
set, then scores each reply with DeepEval metrics judged by Claude Sonnet
(judge_model.py). Crisis-flag correctness is a direct equality check, never
LLM-judged. Writes a per-case CSV and a per-category markdown summary to
results/, ready to paste into the dissertation Testing chapter.

Run: python run_eval.py   (see README.md for setup)
"""

import csv
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

# Opt out of DeepEval's telemetry / Confident-AI login prompts (local run only).
os.environ.setdefault("DEEPEVAL_TELEMETRY_OPT_OUT", "YES")

import requests
from dotenv import load_dotenv

from deepeval.metrics import (
    AnswerRelevancyMetric,
    BiasMetric,
    ContextualPrecisionMetric,
    ContextualRecallMetric,
    FaithfulnessMetric,
    HallucinationMetric,
    ToxicityMetric,
)
from deepeval.test_case import LLMTestCase

from judge_model import ClaudeJudge

HERE = Path(__file__).parent
TESTSET_PATH = HERE / "chatbot-eval-testset.json"
RESULTS_DIR = HERE / "results"

# Patients authenticate with a synthetic email derived from their username
# (migration 0001: {username}@patients.recovai.internal).
PATIENT_EMAIL_DOMAIN = "patients.recovai.internal"

RATE_LIMIT_SLEEP_S = 1.5  # stay well under rag-chat's 10/min cap

# Metric columns in CSV order. The first five run only on cases WITH an
# expected_output (general_coping, class_specific_coping); toxicity + bias run
# on every case.
RETRIEVAL_METRICS = [
    "answer_relevancy",
    "faithfulness",
    "contextual_precision",
    "contextual_recall",
    "hallucination",
]
UNIVERSAL_METRICS = ["toxicity", "bias"]
ALL_METRICS = RETRIEVAL_METRICS + UNIVERSAL_METRICS


def authenticate(supabase_url: str, anon_key: str, username: str, password: str) -> str:
    """Supabase password grant → JWT (same flow as manual testing)."""
    email = f"{username}@{PATIENT_EMAIL_DOMAIN}"
    resp = requests.post(
        f"{supabase_url}/auth/v1/token",
        params={"grant_type": "password"},
        headers={"apikey": anon_key, "Content-Type": "application/json"},
        json={"email": email, "password": password},
        timeout=30,
    )
    resp.raise_for_status()
    token = resp.json().get("access_token")
    if not token:
        raise RuntimeError(f"No access_token in auth response: {resp.text[:200]}")
    return token


def call_rag_chat(supabase_url: str, anon_key: str, jwt: str, message: str) -> dict:
    resp = requests.post(
        f"{supabase_url}/functions/v1/rag-chat",
        headers={
            "Authorization": f"Bearer {jwt}",
            "apikey": anon_key,
            "Content-Type": "application/json",
        },
        json={"message": message, "includeDebugContext": True},
        timeout=60,
    )
    resp.raise_for_status()
    return resp.json()


def build_metric(name: str, judge: ClaudeJudge):
    common = dict(model=judge, async_mode=False, verbose_mode=False)
    if name == "answer_relevancy":
        return AnswerRelevancyMetric(**common)
    if name == "faithfulness":
        return FaithfulnessMetric(**common)
    if name == "contextual_precision":
        return ContextualPrecisionMetric(**common)
    if name == "contextual_recall":
        return ContextualRecallMetric(**common)
    if name == "hallucination":
        return HallucinationMetric(**common)
    if name == "toxicity":
        return ToxicityMetric(**common)
    if name == "bias":
        return BiasMetric(**common)
    raise ValueError(f"Unknown metric: {name}")


def run_llm_metrics(judge: ClaudeJudge, record: dict) -> tuple[dict, dict]:
    """Returns (scores, reasons) keyed by metric name. A failing metric is
    recorded as None rather than aborting the run."""
    retrieved = record.get("retrieved_context") or []
    test_case = LLMTestCase(
        input=record["input"],
        actual_output=record["reply"],
        expected_output=record.get("expected_output"),
        retrieval_context=retrieved,
        context=retrieved,  # HallucinationMetric reads .context, not .retrieval_context
    )

    metric_names = list(UNIVERSAL_METRICS)
    if record.get("expected_output"):
        metric_names = RETRIEVAL_METRICS + UNIVERSAL_METRICS

    scores, reasons = {}, {}
    for name in metric_names:
        try:
            metric = build_metric(name, judge)
            metric.measure(test_case)
            scores[name] = metric.score
            reasons[name] = metric.reason
        except Exception as exc:  # one metric failing must not kill the case
            scores[name] = None
            reasons[name] = f"ERROR: {exc}"
            print(f"    ! {name} failed: {exc}")
    return scores, reasons


def mean(values):
    nums = [v for v in values if isinstance(v, (int, float))]
    return sum(nums) / len(nums) if nums else None


def write_csv(records: list[dict], path: Path) -> None:
    fieldnames = [
        "id",
        "category",
        "language",
        "crisis_expected",
        "crisis_actual",
        "crisis_pass",
        *ALL_METRICS,
        "error",
    ]
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for r in records:
            row = {
                "id": r["id"],
                "category": r["category"],
                "language": r.get("language", ""),
                "crisis_expected": r.get("expected_crisis_flag"),
                "crisis_actual": r.get("crisis_actual"),
                "crisis_pass": r.get("crisis_pass"),
                "error": r.get("error", ""),
            }
            for m in ALL_METRICS:
                row[m] = r.get("scores", {}).get(m)
            writer.writerow(row)


def write_markdown(records: list[dict], path: Path, generated_at: str) -> None:
    # --- Crisis detection (equality check, kept strictly separate) ---
    checked = [r for r in records if r.get("expected_crisis_flag") is not None and "error" not in r]
    passed = [r for r in checked if r.get("crisis_pass")]
    crisis_acc = (len(passed) / len(checked) * 100) if checked else 0.0

    # Per-category metric averages.
    categories = sorted({r["category"] for r in records})

    lines = [
        "# rag-chat Evaluation Results",
        "",
        f"_Generated {generated_at}. Judge model: Claude Sonnet (`claude-sonnet-5`)._",
        "",
        "## Crisis detection (direct equality check — not LLM-judged)",
        "",
        f"**Overall accuracy: {len(passed)}/{len(checked)} = {crisis_acc:.1f}%**",
        "",
        "| Category | Cases | Correct | Accuracy |",
        "| --- | --- | --- | --- |",
    ]
    for cat in categories:
        cat_checked = [r for r in checked if r["category"] == cat]
        if not cat_checked:
            continue
        cat_pass = [r for r in cat_checked if r.get("crisis_pass")]
        acc = len(cat_pass) / len(cat_checked) * 100
        lines.append(f"| {cat} | {len(cat_checked)} | {len(cat_pass)} | {acc:.1f}% |")

    # --- LLM-judged metrics, per category ---
    lines += [
        "",
        "## LLM-judged metric averages (by category)",
        "",
        "Blank = metric not applicable to that category "
        "(retrieval metrics need a reference answer; toxicity/bias run on all).",
        "",
        "| Category | " + " | ".join(ALL_METRICS) + " |",
        "| --- |" + " --- |" * len(ALL_METRICS),
    ]
    scored = [r for r in records if "error" not in r]
    for cat in categories:
        cat_recs = [r for r in scored if r["category"] == cat]
        if not cat_recs:
            continue
        cells = []
        for m in ALL_METRICS:
            avg = mean([r.get("scores", {}).get(m) for r in cat_recs])
            cells.append(f"{avg:.3f}" if avg is not None else "")
        lines.append(f"| {cat} | " + " | ".join(cells) + " |")

    # Overall row across all cases.
    overall = []
    for m in ALL_METRICS:
        avg = mean([r.get("scores", {}).get(m) for r in scored])
        overall.append(f"{avg:.3f}" if avg is not None else "")
    lines.append("| **all** | " + " | ".join(overall) + " |")

    errored = [r for r in records if "error" in r]
    if errored:
        lines += ["", "## Cases that failed to call rag-chat", ""]
        for r in errored:
            lines.append(f"- `{r['id']}`: {r['error']}")

    lines.append("")
    path.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    load_dotenv(HERE / ".env")

    supabase_url = os.environ["SUPABASE_URL"].rstrip("/")
    anon_key = os.environ["SUPABASE_ANON_KEY"]
    username = os.environ["EVAL_PATIENT_USERNAME"]
    password = os.environ["EVAL_PATIENT_PASSWORD"]
    if not os.environ.get("ANTHROPIC_API_KEY"):
        raise RuntimeError("ANTHROPIC_API_KEY (for the judge model) is not set")

    testset = json.loads(TESTSET_PATH.read_text(encoding="utf-8"))
    cases = testset["cases"]

    # Optional: python run_eval.py <category> runs only that category's cases
    # (cheap targeted re-checks after a fix, instead of the full 33 every time).
    if len(sys.argv) > 1:
        category = sys.argv[1]
        cases = [c for c in cases if c["category"] == category]
        if not cases:
            categories = sorted({c["category"] for c in testset["cases"]})
            raise SystemExit(f"No cases in category '{category}'. Available: {', '.join(categories)}")
        print(f"Filtered to category '{category}': {len(cases)} case(s)")

    print(f"Authenticating as {username}...")
    jwt = authenticate(supabase_url, anon_key, username, password)

    judge = ClaudeJudge()
    records: list[dict] = []

    for i, case in enumerate(cases, 1):
        cid = case["id"]
        print(f"[{i}/{len(cases)}] {cid} ({case['category']})")

        record = {
            "id": cid,
            "category": case["category"],
            "language": case.get("language"),
            "input": case["input"],
            "expected_output": case.get("expected_output"),
            "expected_crisis_flag": case.get("expected_crisis_flag"),
        }

        # --- call the deployed function; log-and-continue on failure (NFR8) ---
        try:
            result = call_rag_chat(supabase_url, anon_key, jwt, case["input"])
        except Exception as exc:
            record["error"] = str(exc)
            print(f"    ! rag-chat call failed: {exc}")
            records.append(record)
            time.sleep(RATE_LIMIT_SLEEP_S)
            continue

        record["reply"] = result.get("reply", "")
        record["crisis_actual"] = result.get("crisisFlag")
        record["retrieved_context"] = result.get("retrievedContext", [])

        # --- crisis correctness: direct equality, never LLM-judged ---
        if record["expected_crisis_flag"] is not None:
            record["crisis_pass"] = record["crisis_actual"] == record["expected_crisis_flag"]
            mark = "OK" if record["crisis_pass"] else "MISMATCH"
            print(f"    crisis: expected={record['expected_crisis_flag']} "
                  f"actual={record['crisis_actual']} [{mark}]")

        # --- LLM-judged metrics ---
        scores, reasons = run_llm_metrics(judge, record)
        record["scores"] = scores
        record["reasons"] = reasons

        records.append(record)
        time.sleep(RATE_LIMIT_SLEEP_S)

    RESULTS_DIR.mkdir(exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    csv_path = RESULTS_DIR / f"results-{stamp}.csv"
    md_path = RESULTS_DIR / f"summary-{stamp}.md"
    write_csv(records, csv_path)
    write_markdown(records, md_path, generated_at)

    print(f"\nWrote {csv_path}")
    print(f"Wrote {md_path}")


if __name__ == "__main__":
    main()
