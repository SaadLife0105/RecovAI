# RecovAI

Mobile relapse-prevention companion app — 2026 BSc dissertation project. A patient checks in daily (mood/sleep/craving + passive GPS/step data), a rule-derived risk engine scores relapse risk, a doctor monitors a caseload dashboard, and two AI layers (a RAG chatbot and an autonomous agent) support the patient and reduce doctor alert fatigue.

**The full build plan lives at [docs/Development Plan.md](docs/Development%20Plan.md) — read it before starting any phase.** It has the exact schema, the risk formula, the drug-class taxonomy, phase-by-phase milestones, and a "Critical Cautions" section of traps that have already bitten this project once (Expo Go limitations, timezone bugs, formula scaling errors, etc.). Do not re-derive decisions that are already made there.

## Stack

- Expo SDK 56 + TypeScript, Expo Router (file-based routing, typed routes on)
- NativeWind v4 (Tailwind classes via `className`) — styling goes through `constants/theme.ts` tokens + matching Tailwind classes in `tailwind.config.js`. Never hardcode a hex value in a screen or component.
- Supabase (Postgres + pgvector + Auth + Edge Functions) as the only backend
- `react-native-svg` (risk gauge), `react-native-chart-kit` (sparklines/forecast charts), `@react-native-async-storage/async-storage` (offline cache + session persistence)
- Claude Haiku (pinned version string, never a floating alias) for the RAG chatbot, XAI explanations, and the autonomous agent — called only from Supabase Edge Functions, never from the client

## Folder structure

```
app/
  (auth)/          splash, role-select, login, forced-password-change
  (patient)/       home, check-in, history, chat, journal, profile
  (doctor)/        dashboard, patient/[id], zones/[patientId], alerts, reports, profile
components/
  gauges/          risk gauge (SVG arc)
  sparklines/       7-day + forecast mini-charts
  sliders/          mood/sleep/craving inputs
  cards/            stat cards, patient cards, alert/report cards
  sos/              persistent SOS button + crisis sheet
lib/               supabase client, risk engine, forecasting, shared TS types
constants/         theme.ts — design tokens (colors, spacing, radius, risk-band helpers)
assets/
  illustrations/   65 hand-made illustrations — see docs/Illustrations.md for the full filename → description manifest before picking one for a screen
supabase/
  functions/       Edge Functions (risk-agent, rag-chat, generate-xai, weekly-report)
  migrations/      versioned SQL — schema + RLS policies, written with the migration not after
docs/              Development Plan.md and other dissertation-facing design docs
```

## Conventions

- **Design tokens only.** `constants/theme.ts` is the single source of truth for colors/spacing/radius; `tailwind.config.js` must mirror it exactly. If you need a new color, add it in both places in the same change.
- **Drug classes, not drugs.** The system models six drug *classes* (`cannabis`, `synthetic_cannabinoids`, `heroin_opioids`, `stimulants`, `sedatives_benzo`, `other_polydrug` — see `lib/types.ts`). This taxonomy is used in exactly three places: the risk-engine sensitivity coefficient, RAG knowledge-base filtering, and agent prompt context. Do not let it grow into per-class algorithms, withdrawal-stage detection, or overdose prediction — that overclaims what self-report + GPS + steps can support, and it's a dissertation-integrity risk as much as an engineering one.
- **Mauritius time (UTC+4) for all "daily" logic** — check-in uniqueness, streaks, missed-check-in cron, weekly report windows. Supabase stores UTC; convert deliberately at one boundary utility, not ad hoc per call site.
- **Secrets never reach the client.** The Anthropic API key and the Supabase service-role key live only in Edge Function environment variables. `EXPO_PUBLIC_*` vars in `.env` are the anon key only — that's the only key allowed in the app bundle.
- **RLS ships with the migration that creates the table, not after.** Patients see only their own rows; doctors see only their assigned patients; `journal_entries` has no doctor policy at all. Test cross-role access with two real accounts whenever the schema changes.
- **No live risk preview during check-in input** — the score is computed on submit only (honest self-report, not a slider users can game against a live number).
- Build vertically, one phase at a time, per the Development Plan's milestones — not all-UI-first. Each milestone should be a demonstrable end-to-end slice.

## Commands

```bash
npx expo start        # dev server; press w for web, scan QR for Expo Go
npx expo start --android
npx expo start --ios
npx tsc --noEmit       # typecheck
```

No test runner or lint config is wired up yet — add Jest when the risk engine (`lib/riskEngine.ts`) is implemented in Phase 2, test-first, per the Development Plan.

## Known platform traps (see Development Plan §Critical Cautions for the full list)

- Push notifications, background GPS, and `react-native-maps` all require an EAS **development build** — none of them work in Expo Go. Don't discover this mid-phase.
- Android pedometer only supports `watchStepCount` (live deltas since subscription), not `getStepCountAsync` (iOS-only). Accumulate into AsyncStorage.
- `react-native-chart-kit` has no native dashed-line support for the forecast overlay — plan the workaround before building the dashboard chart.
