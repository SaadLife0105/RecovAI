# RecovAI — Phase 7.3-B: Client Bundle Secrets Audit

**Verdict: ✅ CLEAN** — no secrets leaked into the client bundle. Performed
2026-07-22, independently spot-checked (a direct grep of `lib/supabase.ts`
confirming no `service_role` reference and an explicit in-code comment
already stating the boundary) in addition to Claude Code's own audit.

## What was checked
- Grepped `app/`, `lib/`, `components/`, `constants/` for `sk-ant-`,
  `service_role`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY` — no matches.
- Broad JWT-pattern sweep (`eyJ….eyJ…`) across the same four directories —
  no matches (no hardcoded service_role key hiding under a different name).
- Grepped for `process.env` / `EXPO_PUBLIC_` — only `lib/supabase.ts` reads
  env vars, and only the two public ones.
- Read `app.config.js`, `.env`, `lib/supabase.ts` in full.
- Checked for a `dist/`/build-output folder to grep the actual bundled JS —
  none exists yet (see note below).

## Client-exposed values — exactly the 3 deliberately-public ones

| Value | Where | Status |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | `.env:1` → `lib/supabase.ts:5` | public by design |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `.env:2` → `lib/supabase.ts:6` | JWT decodes to `"role":"anon"` — confirmed anon, not service_role; RLS-governed |
| `GOOGLE_MAPS_API_KEY` | `.env:6` → `app.config.js:21` | build-time config (not an `EXPO_PUBLIC_*` bundle var), platform-restricted at Google Cloud Console, per `BUILD_TROUBLESHOOTING.md` |

`lib/supabase.ts`'s client is constructed with `(supabaseUrl, supabaseAnonKey)`
only — no service-role path exists in client code. `app.config.js` exposes
only the EAS `projectId` (a public identifier) beyond the Maps key above.

## `Deno.env.get()` inventory — server-side Edge Functions (expected, correct)

All 34 calls live under `supabase/functions/`, none in client code:

| Function | Server-side secrets read |
|---|---|
| `create-patient`, `reset-patient-password`, `sync-patient-login-email`, `rag-chat` | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| `risk-agent` | + `ANTHROPIC_API_KEY` |
| `generate-weekly-report-summary` | + `ANTHROPIC_API_KEY` |
| `generate-xai`, `notify-zone-breach` | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| `generate-missed-checkin-alerts`, `generate-weekly-reports` | `CRON_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| `embed-kb` | `KB_SEED_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| `_shared/xaiExplanation.ts` | `ANTHROPIC_API_KEY` |
| `_shared/googleTranslate.ts` | `GOOGLE_TRANSLATE_API_KEY` |

All `SUPABASE_SERVICE_ROLE_KEY` / `ANTHROPIC_API_KEY` / `CRON_SECRET` /
`KB_SEED_SECRET` / `GOOGLE_TRANSLATE_API_KEY` reads are confined to
server-side functions. Correct.

## Bundle-output check — not performed (no build exists yet)

No `dist/`, `web-build/`, or exported bundle exists in the repo, so the
"what actually ships" raw-bundle grep couldn't run. To produce one later
for a real device-level verification:
```powershell
npx expo export --platform android --output-dir dist
# then: grep -rE 'service_role|sk-ant-|SUPABASE_SERVICE_ROLE' dist/
```
Not run as part of this audit (no build was triggered, per project
convention that builds happen deliberately, not incidentally).
