"""Custom DeepEval judge backed by Claude Sonnet (single-vendor, per Sa'ad's
decision this session — not DeepEval's OpenAI default).

Pinned to an explicit Sonnet string, same reasoning as the Haiku pin in the
Edge Functions: never a floating alias. `claude-sonnet-5` is the current
Sonnet release (bare model ID — Anthropic model IDs are complete as-is and
are never date-suffixed).

Uses ANTHROPIC_API_KEY from the local environment — this is a LOCAL var for
this script only, unrelated to the Supabase Edge Function secret of the same
name.
"""

import json
import re

from anthropic import Anthropic
from deepeval.models import DeepEvalBaseLLM

SONNET_MODEL = "claude-sonnet-5"


def _text(response) -> str:
    """Concatenate the text blocks of an Anthropic message response."""
    return "".join(b.text for b in response.content if b.type == "text").strip()


def _extract_json(text: str) -> str:
    """Grab the outermost {...} object from the model's reply (DeepEval judge
    schemas are always JSON objects). Tolerates stray prose or ``` fences."""
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError(f"No JSON object found in judge output: {text[:200]}")
    return match.group(0)


class ClaudeJudge(DeepEvalBaseLLM):
    def __init__(self, model: str = SONNET_MODEL):
        self.model = model
        self.client = Anthropic()  # reads ANTHROPIC_API_KEY from env

    def load_model(self):
        return self.client

    def get_model_name(self) -> str:
        return self.model

    def generate(self, prompt: str, schema=None):
        # When DeepEval passes a pydantic schema it expects an instance back.
        # ponytail: prompt-then-parse instead of the SDK's structured-output
        # helper — version-independent across deepeval/anthropic releases;
        # upgrade to messages.parse() if malformed-JSON retries ever show up.
        system = None
        if schema is not None:
            system = (
                "Respond with ONLY a single JSON object conforming to this JSON "
                "schema. No prose, no markdown fences.\n"
                + json.dumps(schema.model_json_schema())
            )

        response = self.client.messages.create(
            model=self.model,
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}],
            **({"system": system} if system else {}),
        )
        text = _text(response)

        if schema is not None:
            return schema.model_validate_json(_extract_json(text))
        return text

    async def a_generate(self, prompt: str, schema=None):
        # Synchronous under the hood — the harness runs cases serially anyway.
        return self.generate(prompt, schema)
