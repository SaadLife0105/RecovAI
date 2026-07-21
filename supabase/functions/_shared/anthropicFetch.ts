// anthropicFetch — one POST to /v1/messages, with backoff-and-retry for
// Anthropic's transient capacity errors only.
//
// Why this exists: every "Agent loop error" and unexplained timeout_fallback
// in the 2026-07-21 scenario sweeps traced (via Supabase's own function logs)
// to the same thing — `Anthropic API error (529): {"type":"overloaded_error"}`.
// That is Anthropic shedding load, not a bug here, and their own guidance is
// to retry 429/529 after a short backoff. Two heavy back-to-back sweeps (45
// Anthropic-calling invocations) was enough to hit it.
//
// This is purely a retry layer UNDERNEATH the caller's existing error
// handling: it never throws on a non-OK response, it just returns whatever
// Response it ended up with, so each caller's `if (!res.ok) throw ...` stays
// exactly as it was.

/** HTTP statuses worth retrying. 429 is Anthropic's explicit rate-limit
 * signal. The 5xx codes here (500, 502, 503, 529) are all server-side
 * failures — Anthropic's infrastructure, not something wrong with our
 * request — and are the standard class of transient, safe-to-retry errors;
 * 529 "overloaded_error" was the first one found in practice (2026-07-21),
 * a genuine "Internal server error" 500 was the second, found the same day
 * in the same investigation. Anything else — 400, 401, 403, 404 — is a real
 * client-side error describing something wrong with THIS request, and
 * retrying it just wastes the caller's deadline on a call that will fail
 * identically every time. */
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 529]);

const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [500, 1500]; // before attempt 2, then before attempt 3

/** Don't start an attempt that can't plausibly finish. */
const MIN_ATTEMPT_MS = 2_000;

/** Cap on how long a `Retry-After` header is allowed to make us wait — the
 * deadline check below would catch an absurd value anyway, but this keeps a
 * long Retry-After from burning the whole budget on one sleep. */
const MAX_RETRY_AFTER_MS = 5_000;

function retryAfterMs(res: Response): number | null {
  const header = res.headers.get('retry-after');
  if (!header) return null;
  // Anthropic sends seconds; tolerate a malformed value by ignoring it.
  const seconds = Number(header);
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  return Math.min(seconds * 1000, MAX_RETRY_AFTER_MS);
}

export async function callAnthropicWithRetry(
  body: Record<string, unknown>,
  opts: {
    anthropicKey: string;
    /** ABSOLUTE deadline (Date.now() + budget), not a duration — the caller
     * owns the budget this call and all its retries may consume. */
    deadlineMs: number;
  }
): Promise<Response> {
  const remaining = () => opts.deadlineMs - Date.now();
  let response: Response | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': opts.anthropicKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
      // Per-attempt timeout, still bounded by the same deadline — this is the
      // protection that was already here, kept rather than replaced.
      signal: AbortSignal.timeout(Math.max(remaining(), 1)),
    });

    if (!RETRYABLE_STATUSES.has(response.status)) return response;
    if (attempt === MAX_ATTEMPTS) break;

    const backoff = retryAfterMs(response) ?? BACKOFF_MS[attempt - 1];
    // Enough left for the sleep AND a further attempt worth making?
    if (remaining() - backoff < MIN_ATTEMPT_MS) {
      console.warn(
        `Anthropic ${response.status} on attempt ${attempt}; ${remaining()}ms left before deadline — not retrying.`
      );
      break;
    }

    console.warn(`Anthropic ${response.status} (overloaded/rate-limited) on attempt ${attempt}; retrying in ${backoff}ms.`);
    await new Promise((resolve) => setTimeout(resolve, backoff));
  }

  // Whatever we ended up with — including a still-529 Response. The caller's
  // own !ok handling decides what that means.
  return response!;
}
