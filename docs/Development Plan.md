# RecovAI — Precise Development Plan
> Build plan for the 2026 BSc dissertation project. Aligned with `dissertation-context.md`, the 15-screen UI design, and the Dissertation_2026 report structure.

---

## 0. Guiding Constraints

- **Solo developer, tight deadline** — development velocity is the top priority. Build vertically (one complete feature end-to-end) rather than horizontally (all UI first, all backend later), so there is always a demonstrable system.
- **Everything built must be defensible in the dissertation** — every phase below maps to a chapter section (Design, Implementation, Testing).
- **Environment**: Windows + PowerShell, VS Code + Claude Code, Expo Go for on-device testing, GitHub for version control (commit at the end of every work session minimum; feature branches optional for solo work).
- **Secrets discipline**: the Anthropic API key lives ONLY in Supabase Edge Function environment variables. It never enters the mobile app bundle.

---

## Phase 1 — Foundations & Scaffolding (Week 1)

### 1.1 Project initialisation
- [ ] `npx create-expo-app recovai --template` with Expo SDK 56 + TypeScript
- [ ] Install and configure: Expo Router, NativeWind v4, `@expo/vector-icons`, `react-native-svg`, `react-native-chart-kit`, AsyncStorage
- [ ] Set up the design system as code first: `constants/theme.ts` with the teal/white palette from the UI mockups, spacing scale, typography, and a `tailwind.config.js` matching it. Every screen after this uses tokens, never hardcoded colours.
- [ ] Folder structure:
  ```
  app/
    (auth)/          splash, role-select, login
    (patient)/       home, check-in, history, chat, journal, profile
    (doctor)/        dashboard, patient/[id], zones/[patientId], alerts, reports, profile
  components/        gauges, sparklines, sliders, cards, SOS button
  lib/               supabase client, risk engine, forecasting, types
  supabase/functions/  edge functions (agent, rag-chat, xai, weekly-report)
  ```

### 1.2 Supabase project setup
- [ ] Create Supabase project; enable pgvector extension
- [ ] **Database schema** (write as versioned SQL migration files — these go verbatim into the dissertation Design chapter):

| Table | Key columns | Notes |
|---|---|---|
| `profiles` | id (FK auth.users), role (patient/doctor), full_name, assigned_doctor_id, archived, **sobriety_start_date** | Row created via trigger on signup; sobriety date drives the "days sober" counter |
| `push_tokens` | user_id, expo_push_token, platform, updated_at | Needed for doctor alerts — Expo push requires storing each device's token server-side |
| `checkins` | patient_id, date, mood (1–10), sleep (1–10), craving (1–10), isolated (bool), steps, risk_score, created_at | Unique (patient_id, date) |
| `patient_substances` | patient_id, drug_class (enum), is_primary (bool), recovery_start_date | **New.** A patient can have multiple rows (polydrug use is common in Mauritius). Doctor sets these at account creation; patient can view but not edit. `is_primary` marks the class the risk engine keys off |
| `risk_zones` | patient_id, doctor_id, lat, lng, radius_m (50–1000), zone_type (now optional), classification (safe / low_risk / medium_risk / high_risk — widened from the original binary safe/risk during Phase 3.4), label | |
| `zone_breaches` | patient_id, zone_id, detected_at | Written by location task |
| `alerts` | patient_id, doctor_id, type, urgency, xai_explanation, read, created_at | |
| `journal_entries` | patient_id, content, mood_emoji, created_at | RLS: patient-only, doctor has NO policy |
| `chat_messages` | patient_id, role (user/assistant), content, created_at | |
| `doctor_notes` | patient_id, doctor_id, content, created_at | |
| `kb_documents` | content, embedding vector(N), source, category, **drug_class (nullable)** | RAG knowledge base. `drug_class` tags class-specific content (opioid overdose warnings, cannabis coping, etc.); NULL = general content applicable to all |
| `streaks` | patient_id, current_streak, longest_streak, last_checkin_date | Engagement metric only — rewards consecutive check-ins, NOT sobriety. See `relapse_logs` below; the two must never be conflated |
| `relapse_logs` | patient_id, logged_at, notes (nullable) | **New.** Patient-initiated, honest relapse logging — see the note under 2.2 below. Doctor-visible (used for Patient Detail history + a doctor alert), separate from the engagement streak |

- [ ] **Row Level Security on every table from day one** — patients see only their own rows; doctors see only their assigned patients; journal is patient-only. RLS policies are a dissertation talking point (data protection for a vulnerable population), so document each policy as it's written.
- [ ] Supabase Auth: email/password; `must_change_password` flag drives the forced-password-change flow.

### 1.3 Drug-class taxonomy (define once, used everywhere)
The system does **not** model individual drugs — it models drug *classes*, grounded in the National Drug Observatory Report 2024 breakdown of the Mauritian drug landscape. A "top-20 drugs" list would be mostly near-zero-prevalence padding and would invent clinical distinctions the app's sensors can't support. The defensible taxonomy (define as a Postgres enum + a TS union type):

| Class enum | Covers | Why it's in the model |
|---|---|---|
| `cannabis` | Cannabis / "gandia" | Most prevalent — 40.9% of 2024 drug offences |
| `synthetic_cannabinoids` | NPS, synthetic cannabinoids/cathinones ("Black Mamba", "Spice") | 27.6% and fastest-rising; Mauritius ranked #1 in the Southern-African synthetic-drug trade; unpredictable potency, rising hospital admissions |
| `heroin_opioids` | Heroin, opioids, methadone-dependent | 15.4%; historically dominant; highest overdose-death risk on relapse (tolerance drop) |
| `stimulants` | Cocaine, crystal meth, amphetamines | Smaller but present in seizure data; distinct crash-craving relapse pattern |
| `sedatives_benzo` | Sedatives, tranquilizers, benzodiazepines | 1.7%; clinically distinct; dangerous withdrawal |
| `other_polydrug` | Everything else / multiple substances | Polydrug use is common locally — a required catch-all |

This enum is referenced by `patient_substances.drug_class`, the risk-engine sensitivity map, `kb_documents.drug_class`, and the agent context. Define it before Phase 2.

### 1.4 Auth flow (Screens 1–4)
- [ ] **Only doctors self-register via email.** Patients never sign up themselves. Doctor registers → creates patient accounts (username + password) → sets each patient's drug class(es) at creation → relays credentials to the patient offline
- [ ] Splash → Role Select → Login (role, email/username, password) → Permissions request screen (location, motion/pedometer, notifications, health data framing)
- [ ] Patients log in directly with their doctor-assigned username and password — no forced password change gate. Patients can change their password at any time from Settings, and can edit their own profile (name, address, contact), but the doctor retains ownership of clinical fields (drug class, recovery start date)
- [ ] Route guard in Expo Router: unauthenticated → auth stack; patient role → patient tabs; doctor role → doctor tabs

**Milestone 1:** Doctor can register, create a patient with an assigned drug class, and both roles land on their home screen. Schema deployed with RLS. *(Dissertation: Design chapter — architecture diagram, ERD, security design, drug-class taxonomy.)*

---

## Phase 2 — Patient Core Loop (Weeks 2–3)

The single most important vertical slice: **check-in → risk score → display**. Everything else hangs off it.

### 2.1 Risk engine (pure TypeScript, built test-first)
- [ ] `lib/riskEngine.ts` implementing the weighted formula:
  ```
  base  = craving×0.30×10 + (10−mood)×0.20×10 + (10−sleep)×0.15×10
        + (isolated ? 15 : 0) + (steps<2000 ? 10 : 0) + zoneDangerContribution
  score = clamp( base × classSensitivity[primaryDrugClass], 0, 100 )
  ```
  **Updated in Phase 3.4** (see the Dissertation Alignment Check at the bottom of this document): the original `(nearRiskZone ? 10 : 0)` flat boolean term was replaced with a graduated `zoneDangerContribution` lookup — `safe`/no zone = 0, `low_risk` = 3, `medium_risk` = 6, `high_risk` = 10 — once the zone classification itself was widened from binary safe/risk to a 4-level scale. The ceiling is unchanged (a patient near a high-risk zone still contributes exactly 10, preserving the original worst-case-scores-100 design), but zone severity now scales the contribution instead of an on/off switch.
- [ ] **Drug-class sensitivity modifier** — a single small coefficient per class, NOT a separate algorithm. The same formula runs for everyone; the class scales how hard the score responds. Justified by the withdrawal/relapse-timeline literature (opioid relapse is fast and carries overdose-death risk — higher sensitivity; cannabis is milder — slightly lower). Suggested starting values (tune + document):
  ```
  heroin_opioids: 1.15   synthetic_cannabinoids: 1.10   stimulants: 1.05
  sedatives_benzo: 1.05  other_polydrug: 1.05          cannabis: 1.00
  ```
  Keep the modifier modest and defensible — the app senses self-report + GPS + steps, so it must NOT claim withdrawal-stage detection or overdose prediction. The class is *context*, not a clinical instrument.
- [ ] Write unit tests FIRST (Jest): boundary cases (all-zero, all-max, isolation-only, cap at 100) AND class-modifier cases (identical inputs across two classes yield the expected ratio). These tests are direct evidence for the Testing chapter.
- [ ] Band mapping: 0–39 Low (green), 40–69 Medium (amber), 70–100 High (red)

### 2.2 Daily Check-In (Screen 6) + Success + Missed screens
- [ ] Sliders for mood/sleep/craving, isolation toggle; passive data (steps, zone status) shown read-only in "Today's Info"
- [ ] **No live risk preview during input** (design decision — honest reporting). Score computed on submit.
- [ ] On submit: insert check-in row → update streak → invoke agent Edge Function (Phase 5; stub it for now) → Success screen with streak animation
- [ ] Missed check-in nudge screen when app opens with no check-in today
- [ ] One check-in per day enforced at DB level (unique constraint) and UI level
- [ ] **Streak edge cases**: define "day" in Mauritius time (UTC+4), not UTC — otherwise a 2 a.m. check-in counts for the wrong day. Handle: missed day → streak resets to 0; same-day duplicate attempt → blocked; test the tier boundaries (2–3 days, 6–7, 364–365)
- [ ] **Relapse logging — found missing during Phase 2 implementation, not in the original 15-screen design.** Before this, `sobriety_start_date`/`streaks` had no relapse concept at all: the engagement streak (consecutive check-ins) and "days sober" were effectively the same number, meaning a patient could report severe craving daily and their sober-days counter would climb forever regardless. Two problems with that: it's factually wrong, and it creates a perverse incentive — if logging a relapse reset the same streak that rewards showing up, patients have a real reason to hide relapses or stop checking in exactly when they need support most (a known failure mode in recovery-app design, not a hypothetical). Fix, to be built:
  - Add an explicit "Log a Relapse" action (check-in screen and/or Home) — a real, honest, patient-initiated event, never inferred from craving/mood scores.
  - Logging a relapse inserts a row into the new `relapse_logs` table (doctor-visible history) AND resets `profiles.sobriety_start_date` to today. It does **not** touch `streaks.current_streak` — the engagement streak stays intact, since checking in to honestly report a relapse should still count as a good, supported check-in day, not be punished.
  - Should raise a doctor alert (likely `urgency: 'high'`, new alert `type: 'relapse_logged'`).
  - UI copy needs the same non-judgemental, supportive tone as the rest of the app (Critical Caution #23) — this is a moment where tone matters most, not least.
  - **Dissertation note**: Chapter 3's FR10 already correctly describes the streak as "based on consecutive check-ins" (no sobriety-conflation issue in what's written) — this is new content to add when that section is next revised, not a correction of something wrong. The app's own UI currently *does* have the conflation (multiple screens literally say "Days Sober" while showing the check-in streak number) — fix those labels as part of building this, so the app matches what the dissertation already correctly claims.
  - **Built** (see Known-Issues.md's Resolved entry for the full account): `relapse_logs` table + RLS (`0002`), `LogRelapseModal` + `check-in.tsx` wiring, `relapse-logged.tsx` confirmation screen, `StreakCard.tsx` relabelled to "Day Streak", `profile.tsx` given a genuine `daysBetween()`-based "Days Sober" stat, `useAlerts()`/`alerts.tsx` retrofitted to real Supabase. Live testing (not just reading the SQL) surfaced two real RLS/trigger bugs, fixed in `0003_fix_role_invariant_trigger_rls.sql` and `0004_alerts_patient_insert_policy.sql` — both are genuinely citable Testing-chapter material (RLS policies behaving correctly only becomes verifiable once tested from each role's own session, not by inspection).

### 2.3 Patient Home (Screen 5)
- [x] Circular SVG risk gauge (react-native-svg arc, colour-banded)
- [x] Days-sober counter, safe-zone status chip, today's steps + activity classification (Staying In <2k / Light Movement / Active Day / Very Active), recent check-in summary, Check In Now CTA
- [x] Streak flame component: 9 tiers (0–2 none → 365+ rainbow crown), driven by `streaks` table

**Verification note (checked against the live app, not assumed done) — now fully resolved.** First pass found: gauge, recent check-in summary, Check In Now CTA, and the streak flame were genuinely done (the flame is actually richer than spec — 16 illustrated tiers via `lib/streakIllustration.ts` rather than the planned 9, a reasonable refinement) but three gaps remained on `home.tsx`. All three now fixed and re-verified directly against the file: (1) a genuine "Days Sober" stat (`daysBetween(sobrietyStartDate, today)`, sourced from `usePatientProfile()`) now appears in both the checked-in and not-yet-checked-in branches, guarded on `sobrietyStartDate` existing; (2) the safe-zone chip now reads `MOCK_PASSIVE.zone` (hoisted to `lib/mockPassiveData.ts`, shared with `check-in.tsx`) with a real green/red branch — still mock until Phase 2.4, but no longer dead UI; (3) `activityLabel()` now implements the correct 4-tier scheme ("Staying In" <2k / "Light Movement" <5k / "Active Day" <10k / "Very Active") in place of the old 3-tier Low/Moderate/High version.

### 2.4 Passive data collection
- [x] Pedometer: superseded by Health Connect — see the dedicated entry below, kept separate since it's a genuine architecture change, not just an implementation detail of this line
- [x] GPS: `expo-location` foreground watcher; haversine distance check against the patient's `risk_zones`; writes `zone_breaches` on entry into a risk zone; computes `nearRiskZone` flag for the risk engine
- [x] **Zone breach debounce**: in-memory entry/exit transition tracking — only logs a new breach on a genuine entry, never while stationary inside a zone
- [x] Graceful degradation path: denied permission degrades to `steps: 0` / `currentZoneStatus: null`, never crashes; both hooks surface *why* (permission vs. no sensor/signal) rather than failing silently
- [x] Both hooks moved to a shared `app/(patient)/_layout.tsx` provider so tracking runs for the entire time the patient is anywhere in the app, not just on the check-in screen — an earlier version scoped `usePedometer()` to `check-in.tsx` alone, which meant steps were only counted while that one screen happened to be open. Caught via live device testing, not code review.
- [x] Background location — `expo-task-manager` + `Location.startLocationUpdatesAsync`, genuinely continues logging `zone_breaches` while the app is backgrounded (confirmed real via Expo's documented TaskManager location-task support). Requires Android's persistent foreground-service notification and the separate `ACCESS_BACKGROUND_LOCATION` permission — both are OS-mandated, not something the app can hide.
- [x] **Background step counting — resolved via Health Connect, superseding the earlier "not achievable" conclusion.** The original finding was correct as far as it went: `expo-sensors`' `Pedometer` genuinely has no background task hook (confirmed against Expo's own docs), so continuing down that path could not have worked. The actual fix was to stop trying to make RecovAI's own sensor watcher run in the background at all, and instead read from **Android Health Connect** — an OS-level data store that Samsung Health (or equivalent) already writes into continuously, independent of whether RecovAI is open. `usePedometer()` was rewritten around `initialize()` / `getGrantedPermissions()` / `aggregateRecord()` from `react-native-health-connect`, entirely replacing the old `watchStepCount` + AsyncStorage-accumulation approach (that code, and `expo-sensors` itself, were removed from the project). Verified genuinely working via live device testing: step totals read correctly increased across repeated queries while walking (460 → 490 → 496) and reflected data accumulated by Samsung Health even when RecovAI had been closed. Worth being precise in the dissertation about the distinction this reveals: RecovAI does not itself sense steps in the background (that remains genuinely impossible with this tooling) — it reads a continuously-updated store that something else populates. The practical outcome (a step count that reflects the whole day regardless of app state) is achieved either way; only the mechanism differs from what "background collection" might imply. See the Dissertation Alignment Check section below for the exact chapter passages (FR5, the Chapter 3 tools table) this affects.

### 2.5 History (Screen 7) + Journal + SOS
- [x] Check-in history list with per-day risk badge and mood/sleep/craving icons
- [x] Private journal (free text + mood emoji) — verified with a real doctor account that RLS truly blocks access
- [x] Persistent floating SOS button on all patient screens — crisis sheet (SAMU 114, Emergency 999, hotlines)

**Verification note (checked against the live app and real device/DB testing, not assumed done).** SOS/crisis sheet was already fully built with real tap-to-call and the correct Mauritius numbers — nothing needed there. Everything else needed real fixes, not just retrofits:
- `useActivityFeed()` had a default-parameter bug: `patientId: string = PATIENT_ID` (a mock constant) was being explicitly passed down to `useCheckIns`/`useRiskZones`/`useJournalEntries`, overriding their own correct session-based defaulting — History would have shown the wrong patient's data (or none) regardless of who was logged in. Fixed by making the parameter genuinely optional and letting each sub-hook resolve the session itself.
- The "Alerts" filter was calling `useAlerts()`, which is doctor-oriented (`WHERE doctor_id = ...`) — on a patient's own session this could never match anything. Patients also had **zero RLS read access to `alerts` at all** (only a doctor-full-access policy and a patient-insert-only policy existed). Fixed with a new, narrowly-scoped `"alerts: patient reads own"` SELECT policy (`0005_alerts_patient_select_policy.sql`) and a genuinely separate `usePatientAlerts()` hook, deliberately not merged with the doctor-facing one.
- The "Zones" filter was a placeholder predating real `zone_breaches` tracking — it only ever synthesized one fake "entered safe zone" item anchored to the latest check-in's timestamp, and only if a *safe*-classified zone existed (never true for real risk-zone breaches, which is all that existed to test against). Replaced with a real `useZoneBreaches()` hook reading actual breach rows, joined against `risk_zones` for label/classification — verified against a real breach row logged during Phase 2.4's background-location testing.
- `journal-new.tsx` was a complete no-op — its own comment said so ("Static UI; no real journal persistence yet"); Save just called `router.back()`. Now genuinely inserts into `journal_entries`, with a submitting state and a visible error on failure instead of the old unconditional silent navigate-away.
- A day-labeling bug identical to the one already found and fixed once in `alerts.tsx` (comparing against the frozen `MOCK_TODAY` mock constant instead of the real date) existed independently in `history.tsx` too — fixed the same way, with `getMauritiusDateString()`.
- A raw-UTC timestamp display bug (same class as both of the above, not caught until live-tested: a journal entry written ~15 minutes earlier displayed as roughly 4 hours off — Mauritius's exact UTC+4 offset) existed in both `journal.tsx` and `history.tsx`. Fixed with `toDeviceLocalIsoString()` at the display/grouping layer only — the underlying hooks still correctly return genuine UTC, per the project's established convention.
- **The RLS journal claim was proven, not assumed**: a temporary button was added to the doctor's Patient Detail screen that ran `supabase.from('journal_entries').select('*')` with zero filters — the broadest possible test — from a real, logged-in doctor session. Result: `{"data": [], "error": null}`, despite the patient having a real journal entry in the table at the time. Confirmed and removed afterward.

**Milestone 2 — genuinely, fully complete.** The entire patient core loop (check-in → risk score → display, passive GPS/steps foreground and background, history, journal, SOS) is real, backed by actual Supabase data, and verified through live device testing and a real cross-role RLS test rather than assumed from reading code or migration files. *(Dissertation: Implementation chapter — risk engine, EMA implementation, digital phenotyping pipeline.)*

---

## Phase 3 — Doctor Side (Weeks 4–5)

### 3.1 Forecasting engine
- [x] `lib/forecast.ts`: least-squares linear regression over last 7 daily risk scores → 3-day projection, clamped 0–100
- [x] Unit tests: known slope cases, flat series, <7 data points (fallback: no forecast shown)

**Verified** (checked against the actual files, not the Claude Code summary): `computeForecast` requires exactly 7 chronological scores (fewer OR more → null — the caller slices, not the function), projects day+1/+2/+3, clamps [0,100]. 9 new Jest tests, hand-verified the linear/flat/clamp cases. `forecastsHighRisk` flags any of the 3 projections ≥70.

### 3.2 Mission Control Dashboard (Screen 10)
- [x] Stat cards: Total Patients, High Risk Now, Predicted High Risk (48h) — the last one computed by running the forecaster over every patient
- [x] Patient cards sorted by current risk: avatar, name, risk badge, trend arrow, 7-day sparkline (dotted 3-day forecast overlay deferred to Patient Detail's full chart — the dashboard row only shows a mini historical sparkline + trend arrow, not a forecast overlay per row; this is a reasonable scope narrowing, not a gap, since a dotted forecast at sparkline size (50×20px) wouldn't be legible)
- [x] Search bar + filter pills (All / High / Medium / Low / Inactive / Pending / Archived) — all real filtering now, including a genuine three-tier sort (today's score desc → last-active-first → pending alphabetical) and archived patients correctly separated rather than dropped

**Verified**: `usePatients()` now derives real `trendData`/`trendDelta` (2-point minimum) and a real `predictedHighRisk` count (7+ check-ins required, forecast crosses High band, excludes patients already High today to avoid double-counting with `highRisk`). Dashboard search does case-insensitive substring match on name + patientId; filter pills source-swap to a separate `archivedPatients` array for the Archived pill rather than filtering a merged list.

### 3.3 Patient Detail (Screen 11)
- [x] Full 7-day chart + dotted forecast + danger threshold line at 70 — built as a raw react-native-svg component (`RiskTrendChart.tsx`), not react-native-chart-kit, since chart-kit has no native dashed-line support (same reasoning already established for `MiniSparkline.tsx`)
- [x] AI Explanation card, recent alerts list, private doctor notes, archive/restore
- Scope note: only what this checklist actually lists was built at the time. The Check-ins/Alerts/Zones/Reports tabs on this screen were all "Coming soon" — those aren't 3.3 items, they're later-phase work the UI mockup happened to scaffold early. Since then Zones and Reports have both been fully built (Zones via its own dedicated screen; Reports as the itemized accordion on this screen), leaving only Check-ins and Alerts still showing the "Coming soon" placeholder.
- AI Explanation card now shows a real alert's `xai_explanation` when one exists, or an honest neutral "coming soon" placeholder otherwise — the previous hardcoded text (fabricated "late-night phone usage" analysis, describing data the app doesn't even track) was replaced rather than left in place, independent of Phase 4's XAI function landing later.
- New migration `0006_profiles_doctor_update_patient_policy.sql`: there was no RLS policy letting a doctor update a patient's `profiles` row at all until now (only self-update existed) — required for archive/restore. **Deployed and tested from a real doctor session** (archive + restore both confirmed to persist). Deployment needed a bookkeeping repair first — `0005` was already applied on the remote (from earlier manual RLS testing in Milestone 2) but wasn't marked as such in Supabase's migration history, so `db push` tried to reapply it and collided; fixed with `supabase migration repair --status applied 0005` (repairs tracking only, doesn't re-run SQL) before pushing 0006 cleanly.

**Bugs caught in device testing (not by Claude Code's own summary, not by static verification either — these only surfaced on-device):**
1. `edit-note.tsx` seeded its draft text from `note?.content` inside `useState`'s initializer. Since the note loads asynchronously, that initializer only ever saw the pre-fetch `null` — the editor would open blank even when a note already existed, and Save would have silently overwritten real content. Fixed directly (hydrate-once `useEffect` gated on `isLoading`, input disabled with a loading placeholder until real content arrives). Same bug class as the Phase 2 default-parameter issues: async data arriving after initial state was already set.
2. Trend delta displayed as raw floating-point noise (`20.349999999999998`) instead of a rounded number — screenshot evidence caught this, static code review would not have (nothing about the code itself looked wrong; the bug only appears with real subtraction of two real float scores). Fixed with `.toFixed(1)` + explicit sign in `patient/[id].tsx`.
3. **Stale-after-navigation**: archiving/restoring a patient and navigating back to the dashboard did not refresh the list — confirmed by live device testing, required manually switching tabs to force a refetch. Root cause: expo-router keeps the previous screen mounted underneath the stack rather than remounting it, so a plain mount-only `useEffect` never re-fires on return. Same root cause would also have affected doctor notes (edit, save, return to Overview → stale content) and Patient Detail's alerts/archived-state generally. Fixed by adding `useFocusEffect` (re-exported from `expo-router`, not `@react-navigation/native` directly — that package isn't a top-level resolvable dependency in this project) to `usePatients`, `usePatientDetail`, `useDoctorNote`, and `usePatientAlertsForDoctor`, so all four refetch on focus, not just on mount. **Re-verified on device after the fix**: archive → dashboard updates automatically; restore → same; note edit → Overview shows new content immediately. All confirmed working, no tab-switch workaround needed anymore.

**Verified end-to-end on a real device with real data**, not just code review: migration 0006 deployed and tested from a live doctor session; a patient topped up to 9 real check-ins showed the forecast rendering correctly (dashed orange projection continuing the trend, crossing the red danger-threshold line as expected given the upward trend); archive and restore both confirmed to persist and to reflect on the dashboard without manual refresh; doctor notes confirmed to save, persist, and reflect immediately on return.

**3.3 is done.**

### 3.4 Risk Zones (Screen 12)
- [x] Map interface (`react-native-maps` via Expo): doctor taps/drags a pin per patient, sets radius via slider, an optional zone type tag (Bar/Nightclub, Drug Market, Friend's House, Workplace, Home, Other), and a danger-level classification
- [x] Zone list view with radius + classification chips

**Design change from the original plan, made mid-implementation at Sa'ad's direction after live testing**: the original binary Safe/Risk classification was replaced with a 4-level scale (Safe / Low Risk / Medium Risk / High Risk), and the zone-type tag was downgraded from required to optional — the free-text label is now the primary identifier a doctor sets, zone type is a supplementary tag. This is a genuine improvement on the original design, not just a UI tweak: `riskEngine.ts`'s zone contribution was a flat +10 boolean bump for "near any risk zone" regardless of severity; it's now a graduated lookup (safe=0, low_risk=3, medium_risk=6, high_risk=10) that lets zone danger scale the risk contribution instead of a crude on/off switch — more realistic, and more defensible as a dissertation modelling choice. The 4-level colour gradient (Safe→Low→Medium→High = riskLow→moodOkay→riskMedium→riskHigh) deliberately reuses existing theme colours rather than inventing new ones, so it stays visually consistent with the risk-score bands used everywhere else in the app. Implemented via a Postgres enum widening (`alter type zone_classification rename value 'risk' to 'high_risk'` + two `add value` statements — additive, no data migration needed since existing rows keep their meaning) plus updates across the risk engine, `useZoneMonitor.ts` (foreground zone-proximity watcher, now priority-ordered so the most dangerous overlapping zone wins), `useActivityFeed.ts`, and every zone-status display on both the doctor and patient sides.

**Bug found in verification, not in the original build**: `add-zone.tsx`'s save handler used `router.push('/(doctor)/zones', ...)` instead of `router.back()` on success. Since this screen is always reached from an existing Zones screen already on the navigation stack, `push` left a duplicate Zones entry behind it — pressing back (in-app or the phone's own OS back button, which follows the same stack) landed on the just-submitted Add Zone form instead of Patient Detail. Not a fundamental navigation-architecture problem — Android's back button and expo-router's back both correctly follow whatever the real push/back history is; this was one bad call site building bad history. Fixed by using `router.back()`, since Zones is guaranteed already on the stack in the only flow that reaches this screen.

**Timezone convention bug, also found in verification**: the doctor-notes feature (3.3) displayed `note.updatedAt` by calling `formatTimestamp()` directly on the raw UTC value from the database, skipping the `toMauritiusIsoString()`/`toDeviceLocalIsoString()` conversion step every other timestamp in the app goes through first — `formatTimestamp` deliberately does no timezone math itself (it reads digits straight out of the string), so an unconverted UTC timestamp displayed as if it were already local, off by a fixed 4 hours. Prompted a broader fix, not just a patch: display timestamps across the app (alerts, notes) now consistently use `toDeviceLocalIsoString()` (matching what a patient's own `RecentCheckInCard` already did) rather than the Mauritius-fixed conversion, so what's shown always matches the viewer's own phone clock. `dayLabel()`'s "Today"/"Yesterday" relative-day logic was updated to match (device-local "today", via a new `todayDeviceLocalDateString()` helper) for the same reason. Business-logic day-boundaries (check-in uniqueness, streaks, missed-check-in detection, forecast windows) deliberately stay Mauritius-fixed — that's a correctness requirement (a patient's streak shouldn't break because their phone's timezone briefly drifts), not a display concern, and nothing about that logic changed.

**A significant build/environment saga, worth recording accurately for the dissertation's methodology/evaluation honesty**: getting a working `react-native-maps` build onto a device took three separate root causes, found one at a time, each confirmed before moving to the next rather than guessed at:
1. `package-lock.json` had silently desynced from `package.json` (missing `expo-modules-core` and the entire Jest dependency tree despite `npm install` reporting success) — root cause of every earlier "dependencies not matching" EAS build failure this project had hit. Fixed with a full clean reinstall; `npm ci` (the exact command EAS's cloud build runs) was used as the local pass/fail gate from then on, not `npm install`'s own summary, which proved unreliable at accurately reporting the tree's real state on this machine more than once during the same recovery.
2. A genuine version conflict between `react-native-reanimated@4.5.2` (pulled in transitively via `expo-router` → `@expo/ui`, not used directly by this app at all) and `react-native-worklets` — npm's natural resolution kept two different worklets versions side by side to satisfy conflicting peer ranges, which built successfully but crashed at runtime with a native JSI assertion. Root-caused by reading reanimated's own `compatibility.json` and Gradle assertion scripts directly rather than guessing from the error text, and fixed with an npm `overrides` entry forcing a single resolved version.
3. Even with (1) and (2) fixed, the app still crashed on every launch with the same native assertion. Diagnosed from an Android `adb bugreport` capture (ADB itself was uncooperative that night — USB debugging authorization issues — so a full on-device bug report was used instead of live `logcat`) cross-referenced against `react-native-worklets`' own troubleshooting docs: Expo disables Metro's `inlineRequires` by default, which breaks worklets' native initialization pipeline. Fixed with a `metro.config.js` change (`getTransformOptions` forcing `inlineRequires: true`) — a pure JS-bundling fix requiring no native rebuild, verified by reloading the existing dev-client build rather than spending another one.

Total cost: three EAS builds (of a very limited nightly budget) before the app opened at all. Worth citing in the dissertation as a concrete example of a real obstacle in cross-platform native dependency management, and of triangulating root causes from primary evidence (Gradle assertion source, compatibility manifests, on-device crash captures) rather than trial-and-error rebuilding.

### 3.5 Patient account creation + Alerts screen (Screen 13) + Doctor Profile (Screen 15)
- [x] Doctor creates patient with a password (via Edge Function using the service role — the client must never hold admin keys) **and selects the patient's drug class(es) from the six-class dropdown, marking one as primary** (dropdown, never free text — keeps the data clean and analysable); patient logs in directly with these credentials (no forced password change), and can change their own password at any time from Settings; doctor keeps metric visibility and ownership of the clinical fields (drug class, recovery start date), never account/login management
- [x] Alerts inbox with All/Unread/High Risk tabs; notification preference toggles in profile

**Verified** (found already built from an earlier session, just never checked off here — confirmed by reading the actual files, not assumed): `add-patient.tsx` genuinely calls the `create-patient` Edge Function with real validation, multi-class selection with primary marking, and proper submitting/error states. `alerts.tsx` genuinely uses `useAlerts()` with working All/Unread/High Risk filters. `alert-preferences.tsx`'s toggles are real interactive UI, honestly self-documented as not yet backend-enforced ("enforcing these at alert-send time is a Phase 6 backend concern") — correct scoping, not a gap, since the actual notification-sending pipeline doesn't exist until Phase 6.

**Milestone 3:** Full two-sided system working with rule-driven data. *(Dissertation: Implementation — dashboard, forecasting; Design — doctor workflows.)*

---

## Phase 4 — AI Layer I: RAG Chatbot + XAI (Weeks 6–7)

### 4.1 Knowledge base construction
- [x] **Embedding model — decided, not open.** The model is Supabase's built-in `gte-small` (runs inside Edge Functions via `new Supabase.ai.Session('gte-small')`, free, 384-dim, no external API key). This was chosen and documented in Chapter 3 §3.5/§3.8 — the same model embeds both the knowledge base and live queries, and `kb_documents.embedding` is `vector(384)` to match. (The earlier "open decision" framing predated that choice.)
- [x] **Schema already shipped.** `kb_documents` (with `embedding vector(384)`, nullable `drug_class`), the ivfflat index (`kb_documents_embedding_idx`, `vector_cosine_ops`, lists=100), and the `match_documents(query_embedding, match_count, patient_drug_class)` SQL function (returns chunks where `drug_class IS NULL OR drug_class = patient_drug_class`, ordered by cosine similarity) all exist in `supabase/migrations/0001_initial_schema.sql`. Do not recreate or alter them.
- [x] **KB content curated.** `supabase/seed/kb-content.ts` holds `KB_SEED_CONTENT` (19 chunks, ~150–350 words each, each tagged `content`/`source`/`category`/`drug_class`): CBT (thought records, trigger identification), craving management (urge surfing, delay-distract-decide, plus class-specific variants for cannabis, stimulants, opioids, sedatives/benzo), sleep hygiene, relapse prevention (early-warning signs, lapse-vs-relapse, support networks, self-compassion, isolation), overdose recognition for opioids and synthetic cannabinoids, and two crisis-resource chunks — one matching `components/modals/CrisisResourcesModal.tsx` exactly (Emergency 999, SAMU 114, Addiction Helpline 5 255 9050), one covering Collectif Urgence Toxida and Befrienders Mauritius with contact numbers verified directly against cut.mu and befriendersmauritius.com.
- [x] **Embed and insert into `kb_documents` — done.** Ran via the one-off `supabase/functions/embed-kb` seed function (one chunk per invocation, looped from PowerShell, after an initial batched attempt hit Supabase's Edge Function resource limit). Confirmed via direct SQL query against `kb_documents`: 19 rows, category/drug_class distribution matches the seed content exactly.

### 4.2 RAG Edge Function (`rag-chat`)
- [x] Pipeline: patient message → embed query → **class-filtered** pgvector top-k retrieval (patient's drug class + general chunks) → Claude Haiku with a safety-focused system prompt + retrieved chunks + short conversation history → response. This is where drug differentiation is cheapest and highest-value: no model changes, just metadata filtering, so an opioid patient gets opioid coping + overdose warnings while a cannabis patient gets class-appropriate content
- [x] System prompt rules: never give medical/dosage advice, always ground in retrieved content, escalate to crisis resources on self-harm signals, warm supportive tone
- [x] Crisis keyword pre-filter that surfaces the SOS resources banner (visible in Screen 8 mockup) — verified independent of the LLM's own output, and verified working correctly on Kreol Morisien input specifically (see the Dissertation Alignment Check entry below for the full account of a real safety-relevant bug found and fixed here)
- [x] **Prompt-injection hardening**: patient messages are untrusted input flowing into both the chatbot and (via check-in free-text/journal context if ever included) the agent. Wrap user content in clear delimiters, instruct the model that user text is data not instructions, and test with injection attempts ("ignore your instructions and…") — include these in the DeepEval adversarial set. Live-tested against the deployed function 2026-07-20: an injection attempt was declined and redirected supportively.
- [x] **Beyond original scope**: trilingual support (English/French/Kreol Morisien), via a translation-layer architecture built and validated 2026-07-20 after prompt-engineering-only approaches proved unreliable — full account in the Dissertation Alignment Check entry below.

### 4.3 Chat UI (Screen 8)
- [x] Chat screen with persistent crisis banner, message history from `chat_messages`, typing indicator — built, verified against the actual files, and confirmed working live on-device (including a real Android-15-edge-to-edge keyboard-avoidance bug found and fixed through direct on-device iteration, and the crisis banner confirmed to actually render on a real crisis-flagged Kreol message)
- [x] **Beyond original scope**: multi-conversation support (new chat_conversations table + conversation_id on chat_messages, migration 0009) — patients can start a new chat, browse past conversations, and reopen any of them, rather than being stuck on one continuous thread. Full account (including a real layout bug found and fixed) in the Dissertation Alignment Check entry below.
- [x] **Beyond original scope**: empty-state quick-start — the input box and send button are always visible (not gated behind a single "Say Hello" button as the original mockup implied), with a row of tappable suggestion chips above the input for a low-effort start; typing any message directly works identically to tapping a suggestion.

### 4.4 XAI explanation function (`generate-xai`)
- [x] Edge Function: given a patient's recent check-ins, score delta, and zone breaches, Claude Haiku writes a 2–3 sentence plain-English clinical summary of contributing factors — stored on the alert row and shown on Patient Detail. Fires from `check-in.tsx` when a submitted score ≥ 70, non-blocking (graceful degradation, NFR8). Verified end-to-end on-device: a genuine high-score check-in produced a real `alerts` row with a real `xai_explanation`, correctly displayed on the doctor's Patient Detail screen. A real staleness bug was found and fixed in the same pass — full account in the Dissertation Alignment Check entry below.
- [x] Push notification to doctor via `expo-notifications` when score crosses 70 — built, deployed via a real native rebuild, and confirmed genuinely working end-to-end on-device (real notification received on the doctor's phone). Full account — including the Firebase/FCM V1 setup this required, a foreground-notification-handler gap, and a silent-no-op bug found via targeted logging — in the Dissertation Alignment Check entry below.

### 4.5 Chatbot evaluation with DeepEval
- [x] Build a test set of ~30–50 representative patient queries (include adversarial ones: dosage requests, self-harm statements) — 33 cases across 8 categories (`evaluation/chatbot-eval-testset.json`): general coping, class-specific coping (with reference answers for retrieval-quality scoring), crisis/self-harm, prompt injection, dosage-refusal, off-topic, multilingual, positive reinforcement.
- [x] Run DeepEval metrics: answer relevancy, faithfulness, contextual precision/recall, hallucination, toxicity, bias — standalone Python harness (`evaluation/`), judged by Claude Sonnet (single-vendor choice over DeepEval's OpenAI default, documented trade-off vs. an independent judge model). Crisis-flag correctness is checked separately via direct equality, never LLM-judged — deliberately kept apart from the LLM-graded metrics as a safety-critical result.
- [x] Export results tables — final run: `evaluation/results/summary-20260720-135012.md` / `results-20260720-135012.csv`. Full account, including a real safety bug the harness itself caught, in the Dissertation Alignment Check entry below.

**Milestone 4:** Working, evaluated RAG chatbot + XAI alerts. *(Dissertation: Implementation — RAG pipeline diagram, prompt design; Testing — DeepEval results.)*

---

## Phase 5 — AI Layer II: Autonomous Agent (Week 8)

The dissertation's novelty claim — build it carefully and log everything.

### 5.1 Agent Edge Function (`risk-agent`)
- [x] Triggered on every check-in submission (called from the check-in flow after insert)
- [x] Tool definitions (Anthropic tool use API, JSON schemas):
  - `get_patient_checkins`, `get_risk_score_trend`, `get_zone_breaches`, `get_recent_alerts` (read tools — the fourth added 2026-07-21, see below)
  - `send_doctor_alert(urgency)`, `generate_xai_explanation`, `send_patient_message`, `flag_for_urgent_review` (action tools)
- [x] Agent loop: assemble patient context → Claude Haiku with tools → execute tool calls → feed results back → repeat until the model stops calling tools (cap at ~6 iterations as a safety bound)
- [x] System prompt defines the agent's role, decision criteria, and restraint rules (e.g., don't alert the doctor for routine low-risk check-ins — avoid alert fatigue). **The patient's drug class is passed into the agent context and shapes thresholds and tone**: a rising-craving opioid patient in early recovery is treated as more urgent (fast relapse + overdose risk) than the same pattern in a cannabis patient, and patient-facing messages use class-appropriate language. This is prompt context, not new code

### 5.2 Agent observability
- [x] Log every agent run to an `agent_runs` table: input context, reasoning summary, tools invoked, outcomes. This log is dissertation gold — it lets you show concrete traces of autonomous reasoning in the Implementation and Testing chapters.

### 5.3 Agent testing
- [x] Scripted scenario suite: (a) routine low-risk check-in → expect no action; (b) sharp score spike → expect alert + XAI; (c) medium score but compounding signals (zone breach + sleep decline + rising craving) → expect nuanced multi-action response; (d) high craving alone → expect supportive patient message. Extended to ten scenarios in practice — see the 2026-07-21 results entry below.
- [x] Record agent decisions per scenario in a results table; discuss correct/incorrect judgements honestly (examiners reward honest failure analysis)

**Milestone 5:** Agent autonomously reasoning and acting on check-ins, fully logged.

### 5.0 Design decisions reached before implementation (2026-07-21)

Three things Phase 5.1's checklist above leaves open were deliberately talked through and resolved before writing any code, rather than defaulted into mid-implementation. Recorded here in the same spirit as every other phase's design-change entries, since each is a real decision with dissertation implications, not just an implementation detail.

**1. The agent replaces the deterministic `score >= 70` trigger; it does not run alongside it.** `check-in.tsx` currently calls `generate-xai` directly whenever a submitted score is 70+ — that block is removed entirely and replaced with an unconditional call to `risk-agent` on every check-in, regardless of score. The alternative (keeping the `>=70` call running in parallel with the agent, as a second, independent path) was considered and rejected: it would mean the exact fixed-rule approach §2.9.3 argues is inadequate is still doing the actual alerting for the highest-stakes case, undermining the evidential value of the agent's own restraint/judgement (Ch.3's own scenario suite — "routine low-risk → no action," "sharp spike → alert + XAI" — only demonstrates the agent's judgement if nothing else could also produce that outcome), and it risks duplicate alerts on the same check-in with no de-dup logic to resolve them.

The safety cost of removing the deterministic path outright (a genuinely high-risk check-in could pass with zero alert if the agent malfunctions) is addressed with an in-agent fallback, not a parallel path: if the agent's tool loop throws, times out, or exhausts its 6-iteration cap *without ever having called `send_doctor_alert`/`generate_xai_explanation`*, and the score is ≥70, `risk-agent` runs the exact deterministic logic that runs today (unchanged) as a fallback, before returning. Critically, this fallback fires **only** on the agent failing to reach a conclusion — never on the agent reaching one. A successful run that reasons over the full context and chooses `no_action` on a ≥70 score (e.g. because it's the same elevated score as an already-alerted previous day) is a valid, intended outcome and is never second-guessed by the fallback; only genuine non-completion (exception, timeout, truncation-without-action) triggers it. Every outcome — normal, fallback-triggered, or truncated — is logged to `agent_runs` regardless, so the audit trail always fully accounts for what happened on every check-in.

The internal timeout is set at the full NFR2 budget (15 seconds), measured from the moment the `risk-agent` Edge Function handler starts executing — deliberately *not* from when the patient's device sent the request, so a patient's own slow/unreliable connection can never be mistaken for the agent failing. (The patient-side leg of this call is fire-and-forget/non-blocking exactly like today's `generate-xai` call — the check-in itself always succeeds regardless of how the agent invocation resolves or how long it takes to get back to the device, per NFR8.)

**2. `flag_for_urgent_review` gets a real, persistent column, not an alerts-table entry.** A new `profiles.flagged_for_urgent_review` boolean (migration `0011`) models this correctly as an ongoing *state* the doctor must actively clear, rather than a one-off *event* — the alternative (inserting into `alerts` with a distinct `type` string, no new schema) was rejected because it would make this tool structurally indistinguishable from `send_doctor_alert`, undermining Table 3.14's claim that these are two different tools with two different purposes. This needs, and gets: an RLS policy letting a doctor update this one column on their assigned patients (same pattern as `0006`'s archive/restore policy), a doctor-facing "clear flag" action on Patient Detail, and — because a persistent flag with no visible surface would be pointless — both a small badge on the affected patient's card in Mission Control's normal list view *and* a new "Flagged" filter pill alongside the existing seven (All/High/Medium/Low/Inactive/ Pending/Archived), reusing `usePatients()`'s existing filter-and-sort pattern rather than inventing a new one.

**3. `send_patient_message` reuses the rag-chat translation architecture, via a new stored language preference.** rag-chat currently detects the patient's language live, per message, from what they just typed — there is no stored signal an agent-initiated message (which has no incoming text to detect from) can use. Sending agent messages in English unconditionally was considered and rejected as a real, avoidable inconsistency: a Kreol Morisien–speaking patient would get warm, grounded chatbot replies in their own language but a proactive, supposedly-more-personal agent message in English, in the same app. Instead: a new `profiles.preferred_language` column (nullable; part of migration `0011`) is populated opportunistically — rag-chat's Step 13 gains two lines writing the `[LANG:xx]` marker it already parses to this column every time the patient chats, no behavioural change to the chat itself. `send_patient_message` writes its message in English, then translates it into `preferred_language` using the same Google Translate call rag-chat already makes on its outbound leg — falling back to English, untranslated, if the patient has never used the chatbot yet and the column is still null.

### 2026-07-21 — Phase 5.3: agent scenario testing results, real infrastructure fixes found along the way, and two honest divergences from prediction

Ten scenarios (the original four from §5.3's checklist plus six added to exercise cases the first four didn't cover), three repeats each, run against a standalone harness (`scenario-testing/`) purpose-built for this: one dedicated test patient (`testpatient3`), full reset between every run, real check-in history seeded via `lib/riskEngine.ts` itself (not hand-typed scores), and a genuine authenticated HTTP call to the deployed `risk-agent` function — only the *history* is synthetic, the formula and the agent are the real, deployed ones. Full day-by-day inputs, hand-verified score expectations, and every run's actual reasoning text are in `scenario-testing/scenarios.ts` and `scenario-testing/results/scenario-results-20260721-170927.md` (the ten-scenario sweep) plus `scenario-results-20260721-175852.md` (a targeted retest of scenario (e) after the fix described below).

**Two real infrastructure bugs were found and fixed before any result could be trusted, both worth citing as methodology, not just footnotes:**

1. **Transient Anthropic-side failures (529 "overloaded_error", then separately a 500 "Internal server error"), diagnosed from Supabase's own function logs rather than guessed at from timing alone.** An early sweep showed roughly a third of runs failing with no completed action at all, in well under a second in some cases — far too fast to be genuine model latency. Reading the actual `Agent loop error:` log lines (not just the harness's own summary) showed both were transient, server-side Anthropic failures, not anything wrong with the request. Fixed with a shared retry helper (`_shared/anthropicFetch.ts`) that retries 429/500/502/503/529 specifically, with capped backoff, bounded by the same absolute deadline the caller already tracks — genuine client errors (400/401/403) are never retried, since retrying those only wastes the deadline on a call that will fail identically every time. This is the same class of diagnosis-before-fix discipline as the `react-native-maps` build saga and the push-notification obstacles above — a real problem, root-caused from primary evidence, not patched from a guess.
2. **A genuine, structural correctness gap in scenario (e)** ("same high score as yesterday, already alerted" — the restraint case §5.3's checklist explicitly asks for). Failed 3/3 on first run: the system prompt already instructed the agent not to re-alert an unchanged, already-alerted score, but the agent had no way to check that instruction against anything — there was no `get_recent_alerts` tool, and `<patient_context>` carried no alert history at all. This was not the agent reasoning poorly; it was being asked to respect a constraint it was structurally blind to. Fixed by adding an eighth tool (`get_recent_alerts`) and embedding a 14-day alert-history summary directly in `<patient_context>`, the same pattern the existing checkins/zone-breach data already uses. Retested clean, 3/3 (`scenario-results-20260721-175852.md`) — zero duplicate alerts, and every reasoning summary now explicitly cites the mechanism ("doctor already notified yesterday of same crisis picture — no change today, only persistence"), direct evidence the fix changed what the agent could reason from, not just what it happened to output.

A third, smaller finding worth recording: roughly a third of completed runs end via `timeout_after_action` — the agent's real, correct clinical actions (alert, flag, message) complete successfully, and only the model's own one-sentence closing summary is lost to the 15-second (NFR2) budget. This was investigated (not just observed) via per-step timing instrumentation added to `risk-agent` and kept permanently once it proved informative: the *first* Anthropic call in a run is consistently the dominant cost, often 5-8 seconds on its own. Two things address this without hiding it: the fallback-skip guard was widened so a genuinely completed action (not just an alert/explanation specifically) correctly prevents the deterministic fallback from double-acting, and a clearly bracket-prefixed synthesized summary (`[Auto-generated — ...]`) fills the audit gap when the model's own sentence is lost, visually distinct from anything the model actually said. Worth stating plainly in the Testing chapter as a known characteristic of the 15-second budget, not something engineered away entirely — the substantive decision is never lost, only its self-narration.

**Results, by scenario, against the §5.3 predictions:**

| # | Scenario | Outcome |
|---|---|---|
| a | Routine low-risk, flat | **Correct, 3/3.** No action; reasoning cites the actual numbers, not a generic template. |
| b | Sharp spike after a calm week | **Correct, 3/3.** Alert + XAI explanation every time. |
| c | Compounding signals (breach + sleep decline + rising craving), score 58 | **Correct, 3/3.** Full multi-action response; reasoning explicitly cites the slope, not just the current score. |
| d | High craving alone, score 37.5 (Low band) | **Divergent, 3/3 consistently.** Predicted "probably not" an alert; every run alerted anyway, treating an acute craving spike as independently significant regardless of the overall band. Not obviously wrong (craving spikes are a recognised relapse precursor) but a genuine, repeatable mismatch with what was predicted, recorded honestly rather than smoothed over. |
| e | Same high score as yesterday, already alerted | **Failed 3/3 as originally run — a real structural bug, fixed same day, retested clean 3/3.** See above. |
| f | Slow week-long deterioration reaching 80 by day 7 | **Correct, 3/3.** Alerted every time; reasoning names the trajectory ("17.5→80 over seven days"), exactly the case a fixed threshold only catches on day 7 itself. |
| g | Low score throughout (14.5) but a high-risk zone breach 2 days prior | **Correct, 3/3 — the strongest evidence of genuine investigation in the suite.** Every run explicitly discusses the breach and reasons about why it doesn't represent an active escalation given the days of stability since, rather than simply not seeing it. |
| h | Persistent isolation, otherwise stable, score 29.5 | **Divergent, 3/3 consistently.** Predicted "probably a supportive message"; every run took no action at all, treating unchanged, non-worsening isolation as baseline. Same shape of finding as (d), opposite direction — there we predicted restraint and got action, here we predicted action and got restraint. |
| i | Sparse history (3 days), sharp jump on day 3 | **Correct, 3/3.** Treated the jump as a genuine acute event without over-reading the mild two-point rise beforehand as itself a trend. |
| j | (b)'s exact sequence, opioid vs. cannabis | **Correct / supportive, small-sample caveat.** 3/3 opioid runs flagged for urgent review vs. 2/3 cannabis; visibly more clinically urgent language on an identical day-by-day sequence — directionally consistent with FR34, but 3 runs per class is a small basis and should be reported as suggestive, not proven. |

**Overall**: 7 of 10 matched prediction, 2 of 10 are genuine, consistent, honestly-reported divergences (not scored as failures, since the agent's actual behaviour in both cases is internally coherent and arguably defensible — just not what the scenario was written to expect), and 1 of 10 exposed a real structural gap that was found, fixed, and re-verified within the same session. This is exactly the honest correct/incorrect discussion §5.3's own checklist calls for, and a legitimate result for the Testing chapter: not a suite that passed everything, but one whose failures and divergences are each understood, attributable to a specific cause, and — where fixable — fixed and confirmed rather than left open.

**Chapter 3 cross-reference needed**: Table 3.14 (AI Agent Tools) currently lists seven tools; `get_recent_alerts` needs an eighth row, with the same justification given above (the agent cannot honour its own restraint instruction about repeat alerts without it).

**Chapter 3 cross-reference needed (2026-07-22, Phase 6 Stage 3)**: Table 3.14 needs a ninth and tenth row for `get_three_day_forecast` (the real `lib/forecast.ts` 3-day regression, copied inline into `risk-agent` — distinct from the agent's own looser `scoreSlope` trend, and unavailable below 7 check-ins per Critical Caution #19) and `flag_predicted_high_risk` (raises a `predicted_high_risk` alert at `medium` urgency, kept as a narrow single-purpose action tool rather than a `type` parameter on `send_doctor_alert`, for the same reason `flag_for_urgent_review` is separate).

### 2026-07-21 — On-device verification pass: one real regression found and fixed, two features added beyond original scope

Everything above this point was verified through the standalone scenario harness calling `risk-agent` directly — the actual patient-facing app had never once exercised this path end-to-end. A dedicated on-device pass (real check-ins, submitted through the real UI, on a real device) surfaced one genuine bug this session's own verification process had missed, plus two gaps found through the same testing that were closed the same day.

**1. A real regression: every check-in, not just high-risk ones, was blocking the Success screen for up to 15 seconds.** `check-in.tsx`'s call to `risk-agent` was `await`ed before `router.replace('/checkin-success')` — the accompanying code comment said "its outcome must never block the check-in from completing (NFR8 graceful degradation)," but the code did not match the comment. Before Phase 5, this same await pattern existed but called the old deterministic `generate-xai` (a single ~1-2s Haiku call, gated to scores >=70); once Phase 5 replaced that with an unconditional call to the full agent loop (which can legitimately run up to 15 seconds) on every check-in, the same await pattern turned a rare, small delay into a routine, large one. This was missed during this session's own file-by-file verification of the Phase 5 build -- risk-agent, the shared helpers, and every dashboard/UI file touched were re-read directly, but check-in.tsx itself was not, on the assumption Claude Code's summary describing it as changed was sufficient. It wasn't; only real on-device testing (submitting an ordinary, non-high-risk check-in and timing the delay by feel) caught it. Fixed by making the `supabase.functions.invoke('risk-agent', ...)` call genuinely fire-and-forget (`.catch()` only, no `await`), matching what NFR8 already claimed. Worth citing directly as a methodology point for the Testing chapter: a case where reading the code changes was not sufficient and only device testing found the gap, despite a thorough-seeming static verification pass immediately after the build.

**2. Chat auto-resume, added after a real on-device gap.** The Chat tab previously always opened blank (`app/(patient)/chat.tsx`'s own comment: "arriving with none starts empty, same as New Chat"), regardless of whether the risk-agent had just sent a proactive message into the patient's "RecovAI Check-ins" conversation -- confirmed on-device: the message was genuinely invisible unless the patient specifically opened the conversation-history list and found it manually. Fixed by having the Chat tab, when opened with no explicit conversation id, look up and resume the patient's single most-recently-updated conversation (`chat_conversations.last_message_at`, any conversation, no special-casing by title) instead of always starting fresh -- "New Chat" continues to give a genuinely blank compose screen exactly as before. Implementation detail worth citing: this required a one-shot, ref-guarded effect (not keyed off `conversationId` directly, since `handleNewChat()` also sets that to `undefined` and must not re-trigger the resume), plus a loading-state gate so the empty-state illustration never flashes before snapping to a resumed conversation.

**3. Patient-facing push notifications for agent messages -- genuinely beyond Phase 5's original scope, added because on-device testing showed the gap immediately.** The original plan only ever specified push notifications to the doctor (FR22, Phase 4.4); nothing pushed to the patient when the agent proactively messaged them, so a patient would only see it if they happened to open Chat. Built by reusing existing infrastructure rather than adding new schema: `push_tokens`' RLS was already generic (`user_id = auth.uid()`, never doctor-specific), and `lib/registerPushToken.ts` already took any `userId` -- so the only app-side change needed was calling it from `(patient)/_layout.tsx`, mirroring the doctor layout exactly. The push step added to risk-agent's `send_patient_message` reads the caller's own tokens via `callerClient` (no service role needed, unlike the doctor-alert push, which reads another user's tokens) and sends deliberately generic, warm copy ("We're here for you. Open the app to see your message.") -- no message content, no risk level, nothing crisis-implying, per the same data-minimisation reasoning as the doctor push (Critical Caution #10). A further addition, also found necessary only through on-device testing (tapping a real notification and finding it just opened the app generically): notification-tap handling in `(patient)/_layout.tsx` reads the `conversationId` the push already carries and navigates straight to that conversation, covering both the cold-start case (`getLastNotificationResponseAsync`) and the already-running case (`addNotificationResponseReceivedListener`), with a dedupe (keyed on the notification's own request identifier) added after checking Expo's own type definitions confirmed the two paths are not contractually guaranteed not to overlap on a single tap.

None of the three required a new EAS build -- all are pure JavaScript/Edge-Function changes reusing native capabilities (expo-notifications, background location) already compiled into the existing dev-client build from earlier phases.

**A fourth finding from the same on-device pass wasn't fixable the same way — a real, upstream Expo bug in background location, documented rather than patched.** The app crashed while sitting fully backgrounded, doing nothing (`IllegalArgumentException: The module wasn't created! You can't access the hosting runtime`), and recurred once more after an initial JS-level fix. Investigation traced this to a genuine, long-standing issue in Expo's own native module bridge — confirmed against `expo/expo` GitHub issue #28728, describing the identical error class and the same intermittent reproduction pattern ("if it works fine on first try, repeat the steps and it should crash on second or third try"), with related reports on this category going back to at least 2019 across many Expo SDK versions and no clear evidence of a definitive fix by SDK 56 (this project's version). Full account — including exactly what WAS fixed in this session (a real, separate gap in `useZoneMonitor.ts`'s foreground watcher, now correctly gated to `AppState`) versus what wasn't (the background task's own interaction with Android killing/reclaiming the app process, which is a fundamentally different code path and happens inside Expo's native bootstrapping before this app's JS ever runs) — is in `BUILD_TROUBLESHOOTING.md`'s "Background location crash" entry and `Known-Issues.md`'s corresponding Open item, which flags the concrete action needed before the demo: verifying on a genuine standalone build, not just the dev-client. Worth citing directly in the dissertation's Evaluation/Limitations discussion, in the same honest spirit as the existing NFR16 discussion: background location genuinely works, but it inherits a real, currently-unresolved reliability limitation from the underlying framework, independent of anything in this app's own code.

---

## Phase 6 — Automation, Reports & Polish (Week 9)

- [x] **Weekly report Edge Function** on a Monday cron (Supabase Cron, Edge Function job type). **Design decision (2026-07-22): in-app only, no email.** The original "HTML email via Resend" line above is superseded — Resend/domain-verification infrastructure was considered and deliberately dropped in favour of a simpler, fully in-app Reports screen (Screen 14): per patient, aggregate 7-day avg risk score, compliance rate, alert count, zone breach count, generated automatically via `generate-weekly-reports` + a Supabase Cron job, rather than a combined all-patients view. **Reworked 2026-07-22:** the screen no longer has a patient-picker step — it shows live current-week snapshot cards for every active patient directly, and tapping a patient's card opens their Patient Detail Reports tab for completed-week history. See the dated Dissertation Alignment Check entry below.
- [x] **Missed check-in detection cron** — the Alerts mockup (Screen 13) shows "Check-in missed" alerts, but nothing generates them without a scheduled job. Daily Supabase Cron job (21:00 Mauritius time) via `generate-missed-checkin-alerts`, finding patients with no check-in for the day and writing an alert + a gentle patient push reminder. Verified deployed and running on schedule.
- [x] Enforce doctor **notification preferences** at alert-send time (agent and threshold alerts must both check them, or the toggle is decorative). Built across three stages 2026-07-22: real persistence (new `notify_*` columns on `profiles`, replacing `alert-preferences.tsx`'s previous pure local state), enforcement inside `_shared/doctorAlert.ts` (mutes the push only, never the alert row itself — see the dated Dissertation Alignment Check entry below for the full account, including two entirely new alert types — Zone Breach and Predicted High Risk — built from scratch so all four toggles gate something real, and a live Realtime fix for the Alerts screen found along the way).
- [x] Onboarding 3-screen walkthrough on first patient login. No mockup existed for this one (unlike every other Phase 6 item); built as a skippable 3-slide walkthrough gated by a new `profiles.onboarding_completed` column (defaults true, so existing accounts are never surprised by it — only genuinely new patients created via `create-patient` start false). Single decision point in `(patient)/_layout.tsx`, verified no redirect loop and no flash-of-wrong-screen.
- [x] Empty states, loading skeletons across all screens — confirmed largely already done in earlier phases (see the "Empty-vs-populated-state family" Known-Issues.md entry); no further gaps found on inspection.
- [x] Error toasts. New `ToastProvider` (mounted at the root layout, outside both route groups) wired into every genuinely SILENT failure point found across the codebase (4 sites: doctor zone deletion, both patient/doctor sign-outs, a failed onboarding-completion write) — deliberately not added to screens that already show adequate inline error UI, to avoid a redundant second error surface everywhere. **Offline queue (check-ins, sync on reconnect) deliberately deferred** — needs a new native dependency (`@react-native-community/netinfo`) for reliable connectivity detection; batched for the next EAS build rather than triggering one alone, per the same reasoning as the deferred PDF export. Full design discussion in Known-Issues.md's Open entry (2026-07-22).
- [x] Accessibility pass: touch targets, contrast, screen-reader labels on sliders/gauge. Real screen-reader labels/roles/values added to `RatingSlider` and `RiskGauge` (neither had any before); 30 icon-only buttons across 22 files given concrete `accessibilityLabel`s; `hitSlop` added to small icon touch targets to reach ~44pt without any visual resize; a full WCAG AA contrast audit of every text/background pair in `constants/theme.ts`, with three tokens (`primary`, `textMuted`, `riskHigh`) deliberately darkened to fix six real failures — kept in sync with `tailwind.config.js` per that file's own duplication rule. See the dated Dissertation Alignment Check entry below for the full account, including the one judgement call (the gauge's decorative arc bands are exempt from non-text contrast requirements, since the file's own pre-existing comment already establishes they don't communicate the value on their own).

---

## Phase 7 — System Testing, App-Wide Audit & Polish, Demo Data (Week 10)

**Reordered 2026-07-22.** A full app-wide real-vs-decorative audit (all ~26
screens, patient + doctor + auth) was conducted at the start of this phase,
followed by a triage session deciding what gets fixed, cut, or built new.
The complete, checkbox-tracked list of findings and decisions lives in
`docs/Final-Edits-and-Fixes.md` — this section records the resulting phase
sequencing, not the individual items themselves.

1. [x] **App-wide real-vs-decorative audit** (patient + doctor, all screens)
       — done; see `docs/Final-Edits-and-Fixes.md` for the full findings list.
2. [x] **Fix what's worth fixing from the audit** (`docs/Final-Edits-and-Fixes.md`).
       Fully complete as of 2026-07-22 — six bundled Claude Code sessions
       covered password/security, alerts, both profile rebuilds, Patient
       Detail's Check-ins/Alerts/Zones tabs, real check-in
       reminders/notification preferences, and (bundle six) journal/History
       detail views, the patient tab bar's Check-In tab removal, and
       History's date filter. Dark theme was scoped and deliberately cut
       (see that file's own entry for why). Every item independently
       re-verified against the actual changed files, not just against
       Claude Code's summaries. Known-Issues.md's four open items (the
       one-check-in-per-day decision, the background-location crash
       verification, the offline check-in queue, and a new reminder-
       permission edge case) remain deliberately deferred, tracked
       separately — not part of this checklist item's scope.
3. [ ] **Unit / integration / security tests** — run in parallel with steps
       1–2, not blocking on them:
       - **Unit tests**: risk engine, forecaster, streak logic (already
         written; finalise coverage report)
       - **Integration tests**: check-in → score → agent → alert end-to-end
         on a staging patient
       - **Security tests**: attempt cross-patient data access with a second
         account (prove RLS); confirm journal invisible to doctor; confirm no
         API keys in the app bundle
4. [ ] **Visual/aesthetic pass** — screen-by-screen briefs (what's on each
       screen and how it currently looks/behaves) → external design tool
       (ChatGPT/Codex or similar), alongside `docs/mockups/` → translated back
       into real style/layout changes here. No new features, no changed
       behaviour — purely how it looks.
5. [ ] **Usability testing**: small informal walkthrough (3–5 people) with
       task completion + SUS questionnaire, run on the **post-redesign** UI
       (after step 4) so real complaints reflect the app's final look rather
       than a rougher intermediate state — gives the Testing chapter a
       human-evaluation dimension.
6. [ ] **The one EAS build**: standalone profile, bundling
       `@react-native-community/netinfo` + `expo-print`/`expo-file-system`
       together (rather than separate builds for each). Used for:
       - (a) background-location crash verification via Android's built-in
         bug report tool + terminal logs (Known-Issues.md's open item)
       - (b) enabling the offline check-in queue + PDF export for weekly
         reports (both previously deferred, Future Work section below)
       Slotted in around step 2, since the offline-queue design notes
       (Known-Issues.md) belong with the other fixes.
7. [ ] **Demo dataset**: seed script creating ~5 synthetic patients with 14
       days of varied check-in history (one stable, one deteriorating, one
       erratic, one zone-breacher, one non-compliant) so the dashboard,
       forecasts, and agent all have something meaningful to show in the
       viva demo. Make the trajectories *defensible, not arbitrary*: derive
       the day-to-day patterns from the digital-phenotyping literature (see
       `RecovAI_Data_Sources.md` §E) and follow the ChatThero principle (§G)
       of matching synthetic output to real clinical parameters. This turns
       "I made up data" into "I generated data grounded in published
       behavioural patterns."
8. [ ] Record a full demo run-through video as backup against live-demo
       failure — last, once the app reflects its final state.

---

## Phase 8 — Dissertation Integration (Continuous, hardens in Weeks 10–12)

**Correct the existing draft first.** Dissertation_2026.md's abstract, aims, scope, and objectives still describe the OLD architecture — a web-based guardian/sponsor platform, screen time, app usage, and communication-activity monitoring. None of that exists in RecovAI. Sweep every occurrence and rewrite to match: mobile app + doctor role, EMA check-ins, GPS + step count, RAG chatbot, autonomous agent. Similarly, the current literature review outline (2.5–2.12) covers generic ML/DL and behaviour monitoring but has **no sections for the concepts that actually define the system**: EMA methodology, LLMs in mental health, RAG vs fine-tuning, agentic AI / tool use, XAI in clinical decision support, gamification, and LLM evaluation (DeepEval). Restructure the chapter outline before writing more sections, or the review will justify a system that was never built. Also note references are currently Harvard-style while the committed format is IEEE numbered — convert during the correction pass.

Artefacts each phase must produce for the report (collect as you go, not at the end):

| Chapter | Evidence from build |
|---|---|
| Analysis & Design | Architecture diagram, ERD, RLS policy table, risk formula derivation, UI wireframes (the 15-screen design), use-case diagrams |
| Implementation | Code excerpts: risk engine, RAG pipeline, agent loop + tool schemas, forecaster; screenshots of every screen; agent run traces |
| Testing | Jest coverage, DeepEval metric tables, agent scenario results, RLS security test evidence, SUS scores |
| Evaluation | Honest limitations: no real patient data, formula not clinically validated, linear regression as trend indicator only, single-country context |

All dissertation prose written from these artefacts follows the `saad-dissertation-writer` skill (IEEE citations, analytical voice, structural variation).

---

## ⚠️ Critical Cautions During Development

Things that will silently break the project or the dissertation if ignored. Read this list before each phase.

### Expo / platform traps
1. **Push notifications do not work in Expo Go** on recent SDKs — remote push requires a **development build** (`eas build --profile development`). Plan for this before Phase 3.4/4.4, not when the first alert silently fails. Budget setup time for EAS on Windows.
2. ~~**Pedometer behaves differently per platform**...~~ **Superseded.** The originally planned `watchStepCount` + AsyncStorage-accumulation approach was built, then fully replaced with Android Health Connect (`react-native-health-connect`) — see Phase 2.4's entry for the full account and why. `expo-sensors` was removed from the project entirely.
3. ~~**Background GPS doesn't run in Expo Go**... foreground-only tracking... is defensible...~~ **Superseded.** Background GPS was built and proven working via `expo-task-manager` + a real dev build — see Phase 2.4 and the Dissertation Alignment Check section (NFR16 now needs revising to match). The original foreground-only scoping was the right conservative default at the time this was written; it turned out not to be a hard constraint.
4. **react-native-maps needs native config** (Google Maps API key on Android, dev build). Another reason to move to a development build early rather than living in Expo Go.
5. **react-native-chart-kit has no native dashed-line support** for the forecast overlay. Workarounds: render forecast as a second dataset with `withDots` styling, or use `propsForBackgroundLines`-style hacks, or fall back to victory-native. Prototype the chart early — it's on both dashboard and detail screens.

### Security / data protection (a vulnerable population — examiners will probe this)
6. **The Anthropic API key must never ship in the app bundle.** Every AI call goes through an Edge Function. Verify by searching the built bundle for the key prefix.
7. **Service role key stays server-side only** — patient account creation by doctors uses an Edge Function, never the client.
8. **Write RLS policies with the migration, not after.** A missing policy on one table (e.g. `journal_entries`) is a headline failure in a project whose selling point is protecting vulnerable users. Test cross-role access with two real accounts every time the schema changes.
9. **Rate-limit the chat Edge Function** (per-user, e.g. N messages/min). Without it, one user (or a bug in your own retry logic) can burn the API budget or spam the agent.
10. **Cite the Mauritius Data Protection Act 2017** and GDPR-style principles (data minimisation, purpose limitation) in the ethics section — you are collecting health + location data. Tie each principle to a concrete design choice (RLS, private journal, no risk score shown during check-in).

### AI-layer traps
11. **Pin the model version** (`claude-haiku-…` with explicit version string) in every Edge Function. Anthropic model updates mid-project would invalidate your DeepEval results and agent scenario tables.
12. **Cap the agent loop** (~6 tool iterations) and add a hard timeout — Edge Functions have execution limits, and an agent stuck calling tools will hit them. Log the truncation event when it happens.
13. **Agent restraint is as important as agent action.** Alert fatigue is a real, citable clinical problem. Your scenario tests must include "agent correctly does nothing" cases, and your prompt must forbid alerting on routine low-risk check-ins.
14. **The embedding model is a hard dependency** (see Phase 4.1). Do not start embedding the knowledge base until it's chosen — re-embedding everything after a switch is wasted work, and mixed-model embeddings will silently return garbage retrievals.
15. **Never let the chatbot output reach patients unfiltered on crisis topics.** The crisis keyword pre-filter runs *before* the LLM; the SOS resources must appear regardless of what the model says.

### Data / logic correctness
16. **Verify the risk formula scaling with worked examples before coding.** Craving 10 × 0.30 = 3, not 30 — the formula only reaches 0–100 if slider terms are multiplied by 10 (or sliders are 0–100 internally). Write the unit test from hand-calculated expected values first; a silent scaling bug here corrupts every downstream number (forecasts, dashboards, agent decisions, dissertation results).
17. **All "daily" logic uses Mauritius time (UTC+4)**: check-in uniqueness, streaks, missed-check-in cron, weekly report window. Supabase timestamps are UTC — convert deliberately at the boundary, in one utility function, not ad hoc.
18. **Offline queue vs unique constraint**: a check-in queued offline and synced the next day can violate `unique(patient_id, date)` or land on the wrong date. Stamp the check-in with the client-side capture date and handle the conflict (upsert or reject-with-message) explicitly.
19. **Forecast with <7 data points**: new patients break the regression. Guard it (no forecast shown, dashboard "Predicted High Risk" excludes them) rather than extrapolating from 2 points.
19b. **Keep drug-class differentiation modest.** The class is a context modifier in three places only — a small risk-engine coefficient, KB retrieval filtering, and agent prompt context. Do NOT let it grow into withdrawal-stage detection, overdose prediction, or per-class ML models. The app senses self-report + GPS + steps; anything beyond a context modifier claims clinical capability the data can't back, which is both an engineering trap and a dissertation-integrity risk. Model *classes*, never individual drugs.

### Dissertation integrity
20. **Never claim clinical validity.** The formula is a literature-derived heuristic, the forecast a trend indicator, the whole system a prototype evaluated on synthetic data. Overclaiming is the fastest way to lose marks with a health-domain examiner; the honest framing is already written in the "Why We Made These Decisions" doc — keep it.
21. **Screenshot and export evidence the day you build each feature** (agent traces, DeepEval runs, RLS test transcripts). Reconstructing evidence in week 11 from a codebase that has since changed is painful and looks it.
22. **Keep the app and the report in lockstep.** Every time a feature is cut or changed during development, grep the dissertation for the old description the same day — the current draft's drift (web platform, guardians, screen time) is exactly what happens when this is deferred.
23. **Human-facing text in the app is dissertation-visible.** Recovery-contextual language ("Staying In", supportive agent messages, crisis copy) is a stated design contribution — review every string for tone before the demo, since screenshots go in the report.

---

## Suggested Timeline (12 weeks)

| Weeks | Phase |
|---|---|
| 1 | Foundations, schema, auth |
| 2–3 | Patient core loop (check-in, risk, passive data) |
| 4–5 | Doctor dashboard, forecasting, zones |
| 6–7 | RAG chatbot + XAI + DeepEval |
| 8 | Autonomous agent |
| 9 | Reports, automation, polish |
| 10 | Testing + demo data |
| 11–12 | Buffer + dissertation writing surge |

---

## Future Work (Explicitly Not Building Now)

- **Twice-daily check-ins (morning + evening).** Considered during Phase 2 implementation and deliberately deferred, not forgotten. Would require real schema/logic changes, not just a UI tweak: the `checkins` unique constraint would need a `period` dimension, the risk engine would need a merge policy for two same-day scores (average? worse-of-two? evening-weighted?), and the streak/forecaster/dashboard/agent (Phase 3 and 5) would all need to handle two data points per day instead of one. The EMA-frequency argument cuts both ways too: more frequent sampling is often more rigorous, but EMA compliance research also shows compliance drops as prompt frequency rises — a real risk in a population already prone to disengagement, potentially producing *worse* data rather than better. Kept as one check-in per day; worth citing in the dissertation's Future Work section with this reasoning rather than presenting it as unconsidered.

- **PDF export for weekly reports (2026-07-22).** The Patient Detail → Reports download currently shares a plain-text summary via React Native's built-in `Share` API — deliberately, since a genuine file-based PDF export needs a new native dependency (`expo-print` to render an HTML template to PDF, plus `expo-file-system` to write it to disk so it can be shared — `Share` alone can only send text or an already-existing file, not raw bytes). Neither package is currently installed, and both carry native code, so adding them means a new EAS build — the same category of cost as the Firebase/FCM and Maps-key work earlier in this project. Deliberately deferred rather than triggering a build for one feature alone: batch this with whatever the next genuine native-dependency need turns out to be, rather than spending a build on this in isolation. The current plain-text export already includes real dated detail (itemised alerts, zone breaches, and the AI week summary) once a card's been expanded once — a real, working export, just not a formatted PDF.

---

## Risk Register (project risks, not patient risks)

| Risk | Mitigation |
|---|---|
| Expo pedometer/location quirks on specific devices | Test on real Android early; graceful degradation path already designed |
| Expo Go can't do push, background GPS, or maps | Move to an EAS development build by end of Week 2; treat Expo Go as UI-preview only |
| Embedding model chosen late — re-embedding rework | Decide in Week 1 alongside the schema (vector dimension is baked into `kb_documents`) |
| Anthropic API changes or rate limits | Pin model version; agent has iteration cap; costs already estimated (<$1 demo) |
| Scope creep | The 15 screens + this plan ARE the scope. New ideas go to a "future work" list (which feeds the dissertation's Future Work section anyway) |
| Time overrun | Phases 6's polish items and usability testing are the designated cut candidates; Phases 2, 4, 5 are non-negotiable (they carry the dissertation's contribution claims) |
| Demo-day failure | Seeded demo dataset + recorded video backup |

---

## Build-Order Rationale (one paragraph you can reuse in the report)

The system was built as successive vertical slices rather than in horizontal layers: the patient check-in loop first, because every downstream component (risk scoring, forecasting, dashboards, alerts, and the autonomous agent) consumes its output; the doctor-facing analytics second, since they require accumulated check-in data to be meaningful; and the AI layers last, because both the RAG chatbot and the agent depend on a stable schema, populated tables, and deployed Edge Function infrastructure. This ordering guaranteed a demonstrable end-to-end system at every milestone and localised risk to the newest slice.

---

## Dissertation Alignment Check — Chapters vs. Actual Implementation

### 2026-07-22 — Phase 6 closing pass: notification preferences, two new alert types, onboarding, and an accessibility/contrast pass — Table 3.14 and §3.8/§3.9 all need updates

This closes out Phase 6 in a single session (the Reports work earlier the same day has its own dated entry below). Consolidating the chapter-facing implications here rather than scattering them across the individual feature entries already logged in Known-Issues.md and this document's checklist above.

**1. Two genuinely new alert types, built from nothing — Table 3.7 (Alert Types) and Table 3.14 (AI Agent Tools) both need new rows.** The original design only ever specified four alert *categories* on the doctor's preference screen (High Risk, Missed Check-in, Zone Breach, Predicted High Risk) without two of them ever actually being raised by any code path. Zone Breach is now raised by a new `notify-zone-breach` Edge Function, called by `lib/backgroundLocationTask.ts` immediately after a genuine breach of a *medium_risk or high_risk* zone specifically (a safe/low_risk breach is recorded but never alerts — the same alert-fatigue restraint argument already made for the agent elsewhere in this document). Predicted High Risk is raised by the autonomous agent via two new tools (`get_three_day_forecast`, exposing the real `lib/forecast.ts` regression copied verbatim into the agent, distinct from its own looser `scoreSlope` heuristic; `flag_predicted_high_risk`, a narrow single-purpose action tool in the same style as `flag_for_urgent_review`) — Table 3.14 needs a ninth and tenth row, per the note already added to the Phase 5 section above. The system prompt was extended with an explicit rule distinguishing a forecast (not yet true today) from an actual high score (true today), tested directly against a seeded 7-day upward trend that stayed below 70 today but projected across it within 3 days — the agent correctly reached for the forecast tool, not the deterministic one.

**2. Notification preferences went from decorative to real — Table 3.9 (or wherever the Alert Preferences screen is currently described) needs correcting if it implies these toggles already did anything.** `alert-preferences.tsx` was pure local `useState` before this session (confirmed by direct inspection) — four new `profiles.notify_*` columns now persist real values, and `_shared/doctorAlert.ts` checks the relevant one before every push (never before the alert row itself is created — muting a category silences the notification, never the underlying clinical record). One deliberate exception worth stating precisely if this is written up: a `relapse_logged` alert always pushes regardless of any toggle, since none of the four categories a doctor is offered even claims to cover it, and a patient's own safety self-report shouldn't be silenceable by a settings screen.

**3. Onboarding walkthrough — genuinely new feature, no corresponding mockup or FR existed for it.** Unlike every other Phase 6 item, Development Plan.md's own checklist line for this never cited a screen number, and none of the 46 mockups depict it. Built as a skippable 3-slide sequence gated by a new `profiles.onboarding_completed` column (defaulting true, so no existing account was ever surprised by it — new patients created via `create-patient` are the only rows ever created with it false). Worth a new FR/use-case if Chapter 3 is meant to describe every real feature, since this one currently has no textual home at all.

**4. Accessibility and contrast — three theme tokens changed value, a real change to what the app visually looks like, not just an internal refactor.** A full WCAG AA contrast audit of every text/background pair in `constants/theme.ts` found six genuine failures (white text on the main CTA color, on the destructive/SOS color, and muted text on one background variant); three tokens (`primary`, `textMuted`, `riskHigh`) were deliberately darkened by the smallest amount that clears each failure, kept in sync with `tailwind.config.js` per that file's own duplication rule. If Chapter 3 or the UI/design section shows screenshots using the original hex values, note that the CTA teal and the destructive/SOS red are now both slightly darker than in earlier screenshots — worth flagging directly if a marker compares an old screenshot against the live app and notices the difference, rather than leaving it looking like an unexplained inconsistency.

**5. Offline check-in queue — the one Phase 6 item left deliberately unbuilt, not overlooked.** Needs `@react-native-community/netinfo`, a genuine native dependency requiring a new EAS build; deferred to be batched with whatever other native change is next needed (the same reasoning already applied to the deferred PDF export), rather than spending a build on this alone. Full design reasoning — including why a no-dependency alternative (foreground/launch/timer-based retries) was seriously considered and rejected as meaningfully less reliable for the specific case of an app left open while connectivity quietly returns — is in Known-Issues.md's Open entry (2026-07-22). Worth citing honestly in the Evaluation/Limitations chapter as a scoped, deliberate omission with a stated reason, in the same spirit as every other documented trade-off in this project.

### 2026-07-21 — Three unplanned technology additions this session, none yet reflected in Chapter 3 §3.8's stack table

Caught on review: the entries below for Google Translate and Firebase both narrate what happened in detail but never did the explicit "add this row to §3.8" cross-reference the earlier GPS/Health-Connect entries consistently did. Consolidating all three unplanned additions here, with what specifically needs to change in the chapter.

**1. Google Cloud Translation API (v2) — new row needed in §3.8.** Added for the Kreol Morisien translation-layer architecture (full account in the entry below). Correcting a common misreading of that architecture, worth being precise about for whoever writes the Design/Implementation prose from this: translation is **unconditional on the way in** (every inbound patient message is translated to English regardless of detected language, for two invisible purposes — the crisis pre-filter and retrieval embedding) and **conditional on the way out** (the reply is only translated if Claude's own `[LANG:xx]` marker names a non-English language). It is not "only if flagged as Kreol, only on the reply" — the inbound translation runs on every message, English and French included, precisely so the safety-critical crisis check never depends on language detection accuracy (see "Attempts that failed" #2 in the entry below for why that distinction was safety-relevant, not just a design nicety).

**2. Firebase Cloud Messaging (via `expo-notifications`'s Android requirement) — new row needed in §3.8.** Not part of the original architecture at all — Expo's shared push backend for Android was retired since this was originally scoped, requiring a dedicated Firebase project, `google-services.json`, and an FCM V1 service-account key uploaded to EAS credentials. Full account in the 2026-07-21 push-notifications entry below.

**3. The Google Maps API key exposure and remediation — not a new technology (react-native-maps/Google Maps was already in the original stack), but a genuine, live security incident worth its own citable methodology note, which didn't previously have one.** Early in this session, GitHub's secret scanning flagged a Google Maps API key hardcoded as a literal string in `app.json`, publicly exposed in the repository. Remediated by migrating the static `app.json` to a dynamic `app.config.js` that reads the key from `process.env.GOOGLE_MAPS_API_KEY` (`.env` locally, an EAS secret for cloud builds) instead, and restricting the key itself in Google Cloud Console (package name + SHA-1 fingerprint restriction) so a scraped value has limited use even if it ever leaks again. This is a real, concrete instance of exactly the secrets-discipline principle Critical Caution #6/#10 already argue for in the abstract — worth citing directly in the Security/Ethics or Testing chapter as a live test of that principle actually catching and correcting a real mistake, not just a stated intention. Note for methodology honesty: the key's *value* itself was not rotated (a deliberate, informed risk-acceptance decision, not an oversight) — only its exposure surface (no longer committed) and its scope (restricted by package+fingerprint) were fixed. Worth stating that distinction plainly if this is written up, rather than implying full remediation.

**Action needed on Chapter 3 §3.8 specifically**: add rows for Google Cloud Translation API and Firebase Cloud Messaging / `expo-notifications`, alongside the existing `gte-small`, Claude Haiku, and `expo-location` rows. No change needed to the Maps row itself (the technology didn't change, only its key-management approach did) — that belongs in a Security/Ethics methodology paragraph instead, not the stack table.

### 2026-07-21 — Push notifications (FR22): built, and three real, separate obstacles found and fixed along the way

**Status: confirmed working end-to-end on a real device** — a genuine high-risk check-in produced a real push notification, received on the doctor's phone, with the correct privacy-conscious generic text ("A patient's risk score needs your attention. Open the app to view details." — no patient name or clinical detail, per Critical Caution #10's data-minimisation principle).

**Obstacle 1 — `expo-notifications` requires its own Firebase project on Android**, a requirement change not anticipated when this was originally scoped (Expo used to run Android push through a shared backend; that's been retired). Required, beyond installing the package itself: creating a Firebase project, downloading `google-services.json` (public-facing project identifiers, safe to commit, wired into `app.config.js` via `googleServicesFile`) and a separate FCM V1 service-account key (genuinely sensitive — uploaded directly to EAS via `eas credentials`, gitignored via a `*firebase-adminsdk*.json` pattern, never committed). This only surfaced at the exact moment a real device requested a real push token (`"Unable to get Firebase Messaging instance... Default FirebaseApp is not initialized"`) — nothing earlier (`expo-doctor`, `tsc`, the build itself) could have caught it, since it's a runtime FCM requirement, not a config or compile-time one.

**Obstacle 2 — a genuinely fixed, real `eas build` failure, worth citing as its own methodology point.** `eas build` failed repeatedly with an opaque `"expo config --json exited with non-zero code: 1"` and nothing further — confirmed via research to be a different (and less-documented) failure mode than the same error in public GitHub issues, which all showed eas-cli falling back gracefully and continuing; this project's case showed no fallback at all. Root-caused by reasoning about *why* the difference existed rather than accepting "unfixable known bug": `app.config.js` had a deliberate hard `throw` if `GOOGLE_MAPS_API_KEY` was missing, added earlier for local safety — and eas-cli's internal preflight spawns its own `expo config --json` subprocess to read this file, which plausibly doesn't load `.env` the same way a normal terminal session does. Changing the throw to a warn-and-continue (`app.config.js`) let the real build proceed past the point that had been failing all day, confirmed by the build log itself showing genuine progress (credentials resolved, upload started) for the first time. A real, evidenced fix, not a workaround — the actual remote EAS build step still reads the key correctly from its own EAS secret regardless, unaffected either way.

**Obstacle 3 — a foreground-notification-handler gap, found via targeted server-side logging after a real device test showed nothing arriving.** The first true end-to-end test (through the actual check-in → `generate-xai` → push chain, not a direct API call) produced no visible notification, with no error anywhere. Diagnosed methodically rather than guessed at twice: (a) confirmed the alert/explanation itself was created correctly (same working pipeline as `generate-xai`'s text-generation half, already verified) — isolating the problem to the push step specifically; (b) sent an identical push directly via Expo's own API from the terminal, bypassing the app's code entirely — this arrived correctly, proving the Firebase/FCM/token chain itself was genuinely working; (c) added explicit logging to every branch of `generate-xai`'s push step that had previously failed silently (missing service-role key, empty token lookup, non-OK Expo response) and re-triggered directly (calling `generate-xai` on demand, without needing a fresh check-in each time, since the function doesn't itself gate on score — `check-in.tsx` does). The re-run's logs showed the push step completing successfully (`tokens found=1`, Expo `200 {"status":"ok"}`), and this same invocation was the one that produced the real notification on-device — strongly suggesting the very first failure was a one-off timing issue immediately after the FCM credentials were freshly assigned, not a code defect, though this couldn't be proven directly since it resolved on retry with the added logging in place to catch it again if it recurs.

**Separately, `lib/registerPushToken.ts` was missing `Notifications.setNotificationHandler(...)` entirely** — without it, Android does not reliably show a banner for a notification arriving while the app is already open (only while backgrounded/closed), which would have specifically broken the natural testing pattern of switching between the patient and doctor accounts within the app rather than backgrounding it. Added (current `expo-notifications` API: `shouldShowBanner`/`shouldShowList`, not the older `shouldShowAlert` naming) as a module-level call, so it applies regardless of foreground/background state before this gap could cause a second confusing false negative during testing.

**Chapter relevance**: FR22 (push notification to doctor on high-risk alert) is now genuinely implemented and verified, not just built. The three obstacles above — a platform requirement change, a root-caused build-tooling bug (not just worked around), and a systematic silent-failure diagnosis via targeted logging — are all directly citable Implementation/Testing-chapter material for exactly the kind of "real obstacles, evidenced diagnosis" methodology already established elsewhere in this document (the `react-native-maps` build saga, the Kreol Morisien translation-architecture journey).

### 2026-07-20 — DeepEval chatbot evaluation (Phase 4.5): a real safety bug caught by the harness itself, plus an honest, well-evidenced limitation on retrieval recall

**Final results** (33 cases, `evaluation/results/summary-20260720-135012.md`):

| Metric | class_specific_coping | general_coping | all (33 cases) |
|---|---|---|---|
| Crisis detection (33/33 cases, direct equality, not LLM-judged) | 5/5 | 6/6 | **33/33 = 100.0%** |
| Answer relevancy | 0.963 | 1.000 | 0.983 |
| Faithfulness | 1.000 | 0.988 | 0.994 |
| Contextual precision | 0.283 | 0.724 | 0.524 |
| Contextual recall | 0.300 | 0.833 | 0.591 |
| Hallucination (lower = better) | 0.160 | 0.000 | 0.073 |
| Toxicity / Bias | 0.000 / 0.000 across every one of the 33 cases, no exceptions |

**The standout finding — the evaluation harness caught a real safety defect that a full day of manual testing had not.** The very first full run (before any fix) scored crisis detection at only 4/6 (66.7%) on the `crisis_self_harm` category specifically, despite every other category (including the safety-adjacent dosage-refusal and prompt-injection categories) scoring 100%. Root cause, found by reading the two failing cases against `CRISIS_PHRASES` (`supabase/functions/rag-chat/index.ts`): the phrase `"end it all"` — a very common real idiom for suicidal ideation — was entirely absent from the list, and `"hurting myself"` (the gerund of "hurt") was missing even though `"harming myself"` (the gerund of "harm") was already covered — the same class of gap as the earlier apostrophe-normalization bug found the same day. Both were added, along with several related variants (`"end it all"`, `"ending it all"`, `"not worth living"`, `"hurting myself"`, `"cutting myself"`, `"self harm"`), and the full 33-case rerun confirmed 100% crisis-detection accuracy, holding across every category. This is directly citable Testing-chapter evidence for *why* a purpose-built evaluation harness matters beyond ad-hoc testing — the exact case DeepEval-style evaluation is meant to catch, caught for real, on the first run.

**Contextual recall on `class_specific_coping` (0.300) was investigated properly, not just reported.** Two real, separate interventions were tried and measured:
1. A ranking fix in `match_documents` (new migration `0010_boost_class_specific_retrieval.sql`) giving exact drug-class matches a modest similarity boost over general content, since the KB's small size (19 chunks at the time) meant a single relevant class-specific chunk often competed against ~13 general chunks for a top-5 retrieval slot. Result: precision moved (0.307 → 0.357), recall did not (0.300 → 0.300).
2. Five new KB chunks added (24 total), each targeting a genuine content gap identified by category (`synthetic_cannabinoids` had zero craving-coping content at all before this), each grounded in a real, verifiable source (NIDA's cannabis, opioid-MOUD, and stimulant-treatment pages; the 2025 ASAM/JGIM Joint Clinical Practice Guideline on Benzodiazepine Tapering — replacing the earlier generic "adapted, general clinical practice" attribution with real citations). Result: recall still did not move (0.300 → 0.300 → 0.300, unchanged across three separate measurements).

The honest, well-evidenced conclusion: recall for this category is bounded by the reference-answer/KB-content match for these specific five test questions, not by anything either intervention touched — the new chunks are real, useful, well-sourced content for the app generally, but were not written to match this specific test set's five existing reference answers, so their addition was correctly predicted (before spending the API credits) not to move this particular number. Worth citing directly: recall stayed at exactly 0.300 across four independent measurements today, which is itself a meaningful, stable, trustworthy result rather than noise — and a defensible one once benchmarked: AgriMoris (Seetul, 2024), a comparable dissertation RAG chatbot, reported 80.6–88.5% contextual recall using GPT-4o/Gemini 1.5 Pro against a substantially larger source corpus (a full reference book plus other sources) — RecovAI's lower number, on a 24-chunk hand-curated prototype KB with the cheapest available model (Haiku, a deliberate cost/latency choice, not an oversight), is consistent with recall's direct dependence on the breadth of available reference material rather than a flaw in the retrieval mechanism itself.

**Judge model**: Claude Sonnet (`claude-sonnet-5`), not DeepEval's OpenAI default — a deliberate single-vendor choice made after confirming ChatGPT Pro (a consumer subscription) does not grant OpenAI API platform access, and weighed against standing up an entirely separate vendor account for one evaluation pass. Worth stating plainly as a limitation: a same-vendor judge model (Sonnet judging Haiku) is a weaker methodological setup than a genuinely independent judge, even though using a larger model than the one under test partially mitigates the "grading its own homework" concern. Documented here rather than silently assumed.

**Model-tier decision, made explicitly rather than defaulted into**: considered upgrading the chat model from Haiku to Sonnet/Opus after seeing the evaluation numbers, and decided against it. None of the three real issues found and fixed today (Kreol Morisien generation, crisis-phrase gaps, contextual recall) were caused by model reasoning capacity — the Kreol problem was a training-data gap solved architecturally (translation), the crisis gaps were in a hardcoded list entirely independent of the LLM by design, and recall is a retrieval/KB-content issue. Meanwhile Haiku's own output quality was already at or near ceiling on every metric that measures it directly (faithfulness 0.994, relevancy 0.983, toxicity/bias 0.000/0.000). Given NFR1's 8-second response budget and the stated cost-conscious design of the project, keeping Haiku and validating it empirically via DeepEval is the more defensible methodology story than upgrading on a hunch with no evidence pointing at model size as the actual constraint.

### 2026-07-20 — AI Explanation card showed stale, misleadingly-current-looking content

Built `generate-xai` (Development Plan.md §4.4) and wired it into `check-in.tsx` to fire when a submitted score ≥ 70. On first live test, a 95.15 (High Risk) check-in correctly produced a real alert with a real, accurate `xai_explanation`, shown on the doctor's Patient Detail screen. On a follow-up test, the SAME patient submitted a 14.3 (Low Risk) check-in — correctly, per NFR8/the deliberate design, this did NOT generate a new alert (only scores ≥70 do). But the AI Explanation card kept showing the OLD 95.15 explanation, with no date on it at all, sitting directly beneath a risk gauge now correctly showing 14.3/Low Risk — a visible contradiction on the same screen, confirmed via screenshot.

Root cause, in `app/(doctor)/patient/[id].tsx`: `const latestAlert = alerts[0]` simply takes whichever alert is most recent overall, with no timestamp displayed on the card and no check against whether it still reflects the patient's current state. Since alerts are only created on discrete events (score crossing 70, or a relapse log), not on every check-in, this card was never actually describing "right now" — it was always describing "whenever the last alert-worthy event was" — but nothing in the UI communicated that distinction, so it read as a live summary regardless.

Fixed by adding a timestamp line to the card itself (reusing the same `dayLabel`/`formatTime` convention already used two sections down in "Recent Alerts", for consistency): "From alert on [date], [time] — may not reflect the patient's current status shown above." A minimal, honest fix — doesn't hide or fabricate anything, just stops presenting real-but-dated information as if it were live. A fuller fix (e.g. only surfacing an alert while it's still "active"/unresolved, or re-triggering explanation generation on every check-in regardless of score) would need real design work on what "resolved" means for an alert, which doesn't exist as a concept anywhere in the schema yet — noted as a legitimate open question, not silently decided either way.

### 2026-07-20 — Chat multi-conversation support: new schema, new screen, one real layout bug found and fixed

Original design (Screen 8 mockup, Chapter 3) implies a single continuous chat thread per patient — `chat_messages` had no conversation-grouping concept at all before this addition. Added after Sa'ad's direct feedback that being stuck on one thread with no way to browse history was a real usability gap, not a nice-to-have.

**Schema** (`supabase/migrations/0009_chat_conversations.sql`): new `chat_conversations` table (id, patient_id, title, created_at, last_message_at), RLS mirroring `chat_messages`' existing patient-only pattern. `chat_messages.conversation_id` added nullable, backfilled (one "Previous conversation" row per patient with existing rows, spanning their real min/max `created_at` from today's testing), then locked to NOT NULL — the NOT NULL constraint sits inside the same migration transaction as the backfill, so the migration succeeding at all is direct proof no row was left orphaned, not merely an assumption.

**`rag-chat` changes**: accepts an optional `conversationId`; creates a new `chat_conversations` row via the caller-scoped client if absent (RLS-safe, no separate ownership check needed). Step 9's conversation-history retrieval now filters by `conversation_id`, not just `patient_id` — without this, a brand-new conversation would have inherited context from the patient's OTHER past conversations, which defeats the point of separating them. First-message detection for auto-titling reuses the same history query's `length === 0` result rather than an extra lookup.

**New screen** (`app/(patient)/chat-history.tsx`): lists conversations most-recent-first, reusing the existing list-item visual pattern from `journal.tsx` rather than inventing new styling. Tapping a row reopens it via route params into the same `chat.tsx`.

**A real bug found and fixed on-device, worth citing as a concrete flexbox/React-Native methodology note**: the empty-state "quick suggestion" chips (four tappable starter phrases shown above the input when a conversation has no messages yet, replacing what had been a single centred "Say Hello" button) initially rendered as grossly oversized capsules stretching almost the full screen height, confirmed via screenshot. Root cause: a horizontal `ScrollView` with no explicit height, inside a flex-column parent chain, defaults to flexbox's cross-axis `alignItems: 'stretch'` behaviour — each chip stretched vertically to fill whatever height the ScrollView ended up allocated, rather than sizing to its own content. Fixed by wrapping the ScrollView in a `View` with an explicit fixed height (44px) and setting `alignItems: 'center'` on the content container, which is the correct general fix for this class of bug (any horizontal-scroll row of fixed-height chips inside a flex layout, not specific to this screen) — worth a citable example in the Implementation chapter of a subtle cross-platform layout default causing a real, screenshot-evidenced visual defect, diagnosed from the screenshot rather than guessed at from the code (nothing in the JSX itself looked wrong prior to seeing the rendered result).

**Deliberate simplification, not a gap**: the crisis banner's active/inactive state remains local, current-screen-session-only — reopening a past conversation that once triggered a crisis flag does not reconstruct that historical state. A reasonable scope boundary for a prototype, noted here so it isn't mistaken for an oversight later.

### 2026-07-20 — Kreol Morisien chatbot support: SOLVED (supersedes the entry below, kept for the record)

**Status: working, confirmed by native-speaker (Sa'ad) judgment on-device against the deployed function.** The entry directly below this one ("documented limitation, not solved") reflected where things stood mid-session; a working architecture was found afterward in the same session. Kept rather than deleted, since the sequence of failed attempts is itself citable methodology (see "Attempts that failed" below) — each one ruled out a plausible-looking approach for a specific, evidenced reason, not by assumption.

**Final architecture, implemented in `supabase/functions/rag-chat/index.ts`:**
1. The patient's raw message is sent to Claude Haiku UNTRANSLATED — Claude's comprehension of Kreol Morisien proved reliable throughout testing even when its generation wasn't (a genuine skill asymmetry, not assumed).
2. In parallel, the raw message is also translated to English via the Google Cloud Translation API (v2, REST) purely for two internal, patient-invisible purposes: the crisis keyword pre-filter (`CRISIS_PHRASES` is English-only) and the `gte-small` retrieval embedding (better alignment with the English-only knowledge base). This translation's imperfections don't matter since it's never patient-facing.
3. The system prompt instructs Claude to always write its reply in English and end the response with a machine-parseable marker, exactly one of `[LANG:en]`, `[LANG:fr]`, or `[LANG:mfe]`, naming the language the patient's message was written in. Critically, the prompt collapses ANY Creole-like input to `[LANG:mfe]` without asking Claude to identify which specific Creole it resembles — since this app serves only Mauritius, that classification is redundant risk, not required precision (see "Attempts that failed" #2 below for why this mattered).
4. Server-side, the `[LANG:xx]` marker is parsed and stripped. If it names a non-English language, Claude's reply text is first force-translated to English via Google (regardless of what language Claude actually used for it — see "Attempts that failed" #3), then that guaranteed-English text is translated into the target language via Google. Google Translate is therefore only ever asked to do the one thing it does reliably: translate INTO a language that's already been specified. It is never asked to detect which of several similar languages a short, ambiguous text is written in — that task is what failed repeatedly (see below).
5. A defensive regex strips any stray HTML-tag-shaped text (e.g. `<strong>`) from every Google Translate response before it can reach a plain-text chat bubble — found leaking through live testing despite the request specifying `format: 'text'`.

**Attempts that failed, in order, each with the specific evidence that ruled it out (genuinely citable failure-analysis for the dissertation, not just a list of dead ends):**
1. *Prompt-engineering only* (system-prompt disambiguation between Kreol Morisien and Haitian Kreyol, a domain glossary, three native-speaker-authored worked examples). Result: Claude continued producing Haitian Kreyol grammar ("yo" as a plural marker instead of Kreol Morisien's "bann") even with explicit correction in the prompt. Comprehension vs. generation is a real, separately-observed asymmetry: Claude understood Kreol Morisien input correctly throughout, including recognising crisis content, even when it could not reliably generate correct Kreol Morisien output.
2. *Translate-input-to-English, gated on an exact `detectedSourceLanguage === 'mfe'` match, translate reply back to the same detected language.* Result: Google's own language detector does not reliably return exactly `'mfe'` for short, casual Kreol Morisien text — confirmed two ways on-device: (a) a genuine Kreol Morisien crisis message failed to trigger `crisisFlag` at all, because the untranslated raw text never reached the English-only crisis filter; (b) once the crisis-check was decoupled from the exact-match gate (still checking translated text, but no longer requiring `'mfe'` specifically to trigger the reply-translation), the SAME crisis message was detected as `'crs'` (Seychellois Creole — a different, related but distinct language) rather than `'mfe'`, and the reply was fluently translated into the wrong Creole. Language identification for short, ambiguous, closely-related Creole text is a task Google's generic detector is demonstrably unreliable at, in a way that directly caused a safety-relevant false negative on the crisis flag.
3. *Let Claude self-report the language via the `[LANG:xx]` marker, and translate whatever Claude wrote into that language.* Partial success: Claude's own language classification (helped by the Mauritius-only-context collapse rule) was reliable — it consistently tagged genuine Kreol Morisien input as `[LANG:mfe]`. But Claude did not reliably follow the paired instruction to write the reply body itself in English, continuing to write in Kreol/French despite explicit instruction. Translating that already-broken Kreol into `'mfe'` just re-processed broken Kreol into differently-broken Kreol — confirmed by comparing Claude's raw output against the final translated output side by side, they were not meaningfully different in quality. Fixed by (4) above: never trusting that Claude wrote English, and forcing it via an unconditional Google Translate-to-English pass before the final target-language translation.

**Two further options were considered and explicitly ruled out, not simply unexplored:**
- *Fine-tuning Claude on Kreol Morisien text.* Verified via Anthropic's own current documentation: fine-tuning is not offered through the standard Claude API; the only fine-tuning path for Claude models is via a separate Amazon Bedrock enterprise product, requiring its own AWS account, training-data infrastructure, and cost — disproportionate for one feature in a solo dissertation prototype.
- *A retrieval-based approach* (native-speaker-authored Kreol Morisien response templates, retrieved via the existing RAG pipeline instead of generated fresh). Not needed once the translation-layer architecture above worked, but the reasoning for why it was considered (comprehension/generation asymmetry, low-resource-language generation risk) remains valid supporting context if ever revisited.

**A genuinely interesting finding worth citing on its own**: Google's *consumer* Translate product (translate.google.com / the mobile app) added Mauritian Creole support in a 110-language expansion in June 2024 (Google's own blog, "Google Translate adds 110 new languages," 2024), but as of the *developer* Cloud Translation API's current documentation (`docs.cloud.google.com/translate/docs/languages`, checked 2026-07-20), Mauritian Creole (`mfe`) is not listed as a supported API language at all — despite Haitian Creole (`ht`) and Seychellois Creole (`crs`) both being listed. This was verified directly against a live API call (successful `mfe` translation returned, contradicting the absence from the documented list), so the API evidently supports it in practice even though it's undocumented — a genuine discrepancy between Google's consumer product, its documentation, and its actual API behaviour, worth a footnote if this section is ever written up formally.

---

### 2026-07-20 (superseded by the entry above) — Kreol Morisien chatbot support: documented limitation, not solved

Attempted trilingual chat support (English/French/Kreol Morisien) via system-prompt engineering: explicit language-matching instruction, a domain glossary, and three native-speaker-authored (Sa'ad) worked examples. Live on-device testing found Claude Haiku's Kreol Morisien output drifting into Haitian Kreyol grammar — concretely, using "yo" (Haitian plural marker) instead of "bann" (Kreol Morisien's actual plural marker). Explicit disambiguation naming the specific languages and the exact grammatical tell, plus the worked examples, were added to rag-chat's system prompt but did not fully resolve it on retesting. Ruled out: Anthropic fine-tuning (not offered on the standard API; only available via a separate Amazon Bedrock enterprise setup, disproportionate for one feature). Deferred, not ruled out: a retrieval-based approach (native- speaker-authored Kreol response templates retrieved via the existing RAG pipeline instead of freely generated) — judged achievable but out of scope given the remaining timeline (Phase 5 agent + Phase 4.5 DeepEval still open).

**Action for the dissertation (SUPERSEDED — do not use this paragraph; see the working solution documented above instead):** ~~a ready-to-use Limitations-section paragraph covering this... was drafted in chat on 2026-07-20~~. That draft is obsolete now that the feature works; the citation to Seetul (2024) AgriMoris is no longer needed for a limitations argument since there is no limitation to document, but the source may still be useful background for the multilingual-support Design/Analysis discussion generally (their chatbot also targeted English/French/Kreol Morisien, via a different model and without documenting how they handled — or avoided — the Haitian/Mauritian confusion this session found and fixed).

### 2026-07-22 — Phase 6: weekly reports built in-app only, no email — one new chapter-facing decision, plus an open verification item

**Design decision, made deliberately before implementation.** Development Plan.md's original Phase 6 line specified "HTML email via Resend," matching whatever the earliest scoping assumed. Discussed and dropped before any code was written: sending real weekly-summary emails to arbitrary doctor inboxes requires a verified sending domain (DNS records, a few dollars/year, propagation time) — infrastructure with no other purpose in this project and a real, avoidable dependency for a prototype's core demo path. Decided instead to keep the feature entirely in-app: `generate-weekly-reports` (a new Edge Function, service-role only, gated on a shared secret since it has no caller session) runs via a Supabase Cron job every Monday, aggregating each active patient's prior Mon–Sun week (avg risk score, check-in compliance %, alert count, zone breach count) into a new `weekly_reports` table (migration `0012`, RLS: doctor-read-only on assigned patients, no client write policy at all — writes only ever happen from the service role). The Reports screen (Screen 14) was rebuilt to match: a patient picker, empty by default (no patient selected on open, matching a deliberate "don't show one patient's data before the doctor's chosen who" decision), each entry showing that patient's *current* risk status so the doctor can pick by who needs attention today — then that patient's report history, most recent week first.

This also introduces the `risk_band` enum `0001_initial_schema.sql`'s own header comment anticipated back in Phase 1.2 ("`risk_band` (low/medium/high) will be introduced there rather than left unused here") — worth citing directly as evidence the schema was planned ahead of the phase that needed it, not improvised.

**Chapter action needed**: wherever Chapter 3 describes the weekly report feature (if it currently says "emailed" anywhere, matching the original Phase 6 scope line above), correct it to describe the in-app-only Reports screen and the Supabase Cron mechanism. Also worth a sentence in the Design/Analysis discussion on *why* email was considered and dropped (the domain-verification dependency) — a real, evidenced scoping decision, the same category of thing as the Phase 5 agent-vs-deterministic-trigger decision already documented above.

**Not yet verified**: per this document's own repeated rule (RLS and cross-role claims are proven by testing from each role's actual session, never by reading the policy SQL), `weekly_reports`' doctor-read/no-patient-access policy has only been verified by code review so far — the migration, function, and screen haven't yet been deployed or exercised with a real doctor session and a real patient session. Flagged here rather than silently assumed; the next step is the actual deploy + manual trigger + live two-role test, same as every other RLS claim in this project.

**Same-day addendum 1**: the deploy + manual-trigger + doctor-session verification above was completed, and it surfaced a real, unrelated bug — full account in Known-Issues.md's Resolved entry. A patient's report showed an implausible 112 zone breaches for one week; investigation traced this to a genuine race condition in `lib/backgroundLocationTask.ts`'s debounce logic (a read-check-write sequence with no locking against overlapping task invocations), not a data-entry mistake or normal test noise. Fixed by serializing every task invocation onto a single promise chain. Worth citing directly in the Testing chapter: this is a second, structurally distinct concurrency bug in the same debounce function whose *first* bug (a failed insert permanently "poisoning" the debounce state) was already fixed and documented back in Phase 2.4 — both are genuine, evidenced findings from live device/data testing, not from reading the code and assuming it was correct, and both are worth reporting honestly as separate findings rather than folding into one "debounce was buggy" sentence. The doctor-side Reports screen itself worked correctly throughout — it faithfully displayed whatever was actually in the table; the corruption was entirely upstream of anything built this phase.

**Same-day addendum 2 — RLS verification completed.** Tested from Test Patient's own real, authenticated session (a direct Auth API login as `testpatient1`, not the app UI, but a genuine user JWT — the same credential the app itself would hold), querying `weekly_reports` directly via PostgREST. Result: zero rows returned, despite this exact patient having two genuine report rows in the table at the time (confirmed by user id match: `4b95c8f4-389e-4c56-a022-e890194be72d`, the same patient whose reports the doctor session viewed successfully minutes earlier). This is a meaningful test, not a trivial one — the table wasn't empty for this patient, so an empty result here is real proof of the "doctor reads own patients, no patient policy at all" design working, not just an artifact of nothing existing to find. Phase 6's weekly-reports feature is now genuinely, fully verified end-to-end: schema, generation, doctor-side display, and cross-role security all confirmed by live testing rather than code review.

*Cross-checked against `RecovAI_Chapter1_Introduction_Problem_Stement_onward.docx`, `RecovAI_Chapter2_Literature_Review.docx`, and `RecovAI_Chapter3_Analysis.docx` after the Phase 2.4 background-location/Health-Connect session. Two kinds of drift found: places where the actual system now does **more** than what's written (exceeds an NFR/tool description), and places where the **mechanism** changed even though the described outcome still holds. Neither is a defect in the build — both need the chapters updated so implementation and specification agree, which examiners check directly.*

### 1. Direct contradiction — needs a decision, not just an edit

**NFR16** (Chapter 3, Table 3.9): *"Passive data collection shall be foreground-only in the prototype, degrading gracefully to self-report only when permission is denied."*

This is now factually false for GPS specifically. Background zone monitoring was built and proven this session — a real `zone_breaches` row was written while the app was fully closed, confirmed via device testing (see Phase 2.4 above), using `expo-task-manager` + `Location.startLocationUpdatesAsync`. This wasn't a stretch goal quietly achieved; Development Plan.md's own Critical Caution #3 explicitly scoped background GPS *out* as unnecessary ("foreground-only tracking... is defensible") before this session began — the actual build now exceeds that original, deliberately conservative scope.

Two honest options, not a foregone conclusion:
- **Revise NFR16** to describe what's actually true: background location genuinely works; background *step counting* remains foreground-dependent-in-effect (steps are read from Health Connect's continuously-updated store, not counted by RecovAI's own process — see item 2 below). The real tradeoffs discovered this session (Android's mandatory persistent foreground-service notification, `ACCESS_BACKGROUND_LOCATION` as a separate permission grant, Samsung's own battery-optimisation layer independently capable of killing the service regardless of Android's standard permissions) are all genuine, citable implementation findings for the Testing/Evaluation chapter.
- **Leave NFR16 as the original conservative requirement** and frame the background capability as exceeding spec — legitimate, but means explicitly stating in the report that the implementation surpassed its own requirement, which needs its own justification paragraph.

Either is defensible; leaving the contradiction unaddressed is not.

### 2. Mechanism changed, described outcome still (mostly) holds

**FR5** (Chapter 3): *"The system shall collect step-count data passively via the device pedometer."* No longer literally accurate. `expo-sensors`' `Pedometer` was fully removed this session (confirmed: not in `package.json`) and replaced with **Android Health Connect** (`react-native-health-connect` + `expo-health-connect`) — steps are read via `aggregateRecord()` from an OS-level data store that other apps (Samsung Health, etc.) write into, not sampled directly from a device pedometer sensor by RecovAI's own code.

This is a **better** architecture, not a downgrade — it's how genuinely continuous, background-inclusive step data becomes possible at all, since `expo-sensors`' `watchStepCount` was confirmed (via Expo's own current documentation) to have no background capability whatsoever. But the *mechanism* description needs updating: RecovAI does not itself passively sense steps in the background; it reads from a continuously-updated OS store that is populated by other apps regardless of whether RecovAI is open. Worth being precise about this distinction rather than letting "background collection" imply RecovAI is doing the sensing itself.

Same nuance applies to two passages already in the chapters:
- Chapter 1, Project Scope: *"the application collects GPS location and step counts in the background."*
- Chapter 2, §2.6.1: *"This is the principle behind RecovAI's background collection of step counts and location."*

Both are defensible in effect (the *outcome* — continuous data regardless of app state — is now genuinely true for GPS, and true-via-Health-Connect for steps) but neither currently distinguishes RecovAI's own background sensing (GPS) from reading an externally-populated store (steps). A precise sentence, not a rewrite, would resolve this.

### 3. Chapter 3's technology table — missing and outdated rows

The stack table (§3.8) needs updating:
- **`Sensors | expo-sensors (Pedometer)`** row is now inaccurate — the package was removed entirely.
- **Not listed at all**: `react-native-health-connect`, `expo-health-connect` (the actual step-data mechanism now), `expo-task-manager` (background task infrastructure), `expo-build-properties` (needed to bump `compileSdkVersion` for Health Connect's AndroidX dependency requirements).
- **`Location | expo-location | ... foreground-only in the prototype`** — the "foreground-only" qualifier is now outdated per item 1 above.

### 4. Confirmed consistent — no action needed

Worth recording what was checked and found *already correct*, so this doesn't need re-checking later:
- **Relapse logging** (FR35, Table 3.7, Use Case 3.1.1.7, the streak/sobriety-independence discussion in §3.1) — the dissertation's description matches the actual implementation precisely, including the non-conflation rationale. No drift.
- **Danger zone taxonomy** (Phase 3.4's six zone types) matches the actual `risk_zones.zone_type` database check constraint exactly (`bar_nightclub`, `drug_market`, `friends_house`, `workplace`, `home`, `other`). **Superseded by the Phase 3 session pass below** — this bullet was written before Phase 3.4 was actually built; zone_type is now optional and the classification itself was widened from binary. Kept here for the record rather than deleted, since the six-type taxonomy itself is still accurate.
- **NFR9** (zone-breach debounce) and **NFR8** (graceful degradation) — both genuinely implemented and tested this session (the debounce logic specifically survived a real bug hunt: an ordering flaw that let a single failed insert permanently "poison" the debounce state was found and fixed via live device testing, not code review — good Testing-chapter material in its own right).

### 5. Stale content inside Development Plan.md itself — now fixed

Per the request to check whether *earlier* implementations also drifted, not just today's — these were found and have since been corrected directly in this document:
- **Critical Caution #2** (originally: "Pedometer behaves differently per platform... watch live counts → accumulate into AsyncStorage") described the original `expo-sensors`-based approach, abandoned in favour of Health Connect later in this same session. Now marked superseded with a pointer to the real account in Phase 2.4.
- **Critical Caution #3** (originally: background GPS explicitly scoped out as unnecessary) is now marked superseded — background GPS was built and proven working.
- **Section 2.4's own checklist text** was corrected at the time this drift was found (same session) — the Pedometer line now correctly points to the Health Connect entry instead of describing the abandoned `watchStepCount` approach.
- **The "Future Work" section's Health Connect entry** was removed entirely, since what it described as future work is now done — superseded by Phase 2.4's detailed "Background step counting — resolved via Health Connect" entry.

---

## Dissertation Alignment Check — Phase 3 Session (Zones, Timezone Convention, Build Infrastructure)

*Cross-checked against the same three chapters after Phase 3.4 (Risk Zones) and the bug fixes that followed live device testing. This pass found one genuine formula/data-model change (not just wording drift), one mechanism refinement, and a build/tooling saga worth citing on its own merits.*

### 1. Direct contradiction — the chapters describe a formula and use case that no longer match the code

Three places in Chapter 3 describe the original binary safe/risk zone model, and one of them is the risk-score **formula itself**, not just descriptive prose:

- The worked formula: `... + (near risk zone ? 10 : 0)`
- **Table 3.16** ("Data Signals and Risk Contribution"): *"Location | Passive | GPS proximity to zone | +10 points if near a risk zone"*
- **Table 3.4** (Use Case: Assign Danger Zone): *"The doctor pins a location on a map and classifies it as a risk or safe zone... Doctor pins a location and selects a type and safety classification"*

All three are now factually incorrect, not just imprecisely worded. Following live testing feedback (a flat safe/risk toggle didn't distinguish a sketchy street corner from a known drug market, and treated zone type as mandatory when a doctor may not always know or care to categorise a location), the implementation changed to:
- **Classification**: 4 levels (Safe / Low Risk / Medium Risk / High Risk) instead of binary, each contributing a different weight to the risk score (0 / 3 / 6 / 10) instead of a flat +10 for any "risk" zone.
- **Zone type**: downgraded from a required field to an optional secondary tag — the free-text label is now the primary identifier a doctor sets.

Unlike the NFR16 case in the earlier alignment check, this isn't a "which framing is more defensible" choice — the actual numeric formula changed, so the chapters need updating to match, not the reverse. Recommended edits:
- Replace `(near risk zone ? 10 : 0)` with the graduated lookup in both the prose formula and Table 3.16, and note the ceiling is preserved (a high-risk zone still contributes exactly 10, so the documented "worst-case inputs score 100" property is unaffected).
- Update Table 3.4's Normal Flow to "Doctor pins a location, sets a danger level, and optionally tags a zone type" and its Description to reference the 4-level scale.
- This is a **strengthening** of the original design rationale in §2.4.6 ("proximity to a risk zone contributes to the score") — the graduated model is a more literal, more defensible implementation of exactly what that section already argues (severity should matter), so the surrounding literature-grounded argument in Chapter 2 needs no change, only the concrete numbers in Chapter 3.

### 2. Clarification worth adding — timestamp display vs. day-boundary logic are two distinct layers

**NFR10**: *"The system shall handle check-in timezones consistently using Mauritius local time (UTC+4)."* This NFR is not contradicted by anything this session — it specifically concerns check-in timezone *day-boundary* logic (uniqueness, streaks, missed-check-in detection), and that logic is unchanged and still genuinely Mauritius-fixed. What's worth adding is a clarifying sentence, since NFR10 as worded could be read by an examiner as implying *all* displayed timestamps use Mauritius time uniformly, which was never fully true (a patient's own check-in card already showed device-local time from an earlier session) and is now explicitly a deliberate two-layer convention:
- **Day-boundary / business logic** (check-in uniqueness, streaks, missed-check-in cron, forecast windows) — Mauritius-fixed, per NFR10, unchanged.
- **Display timestamps** (alert times, note "last updated," check-in card times) — the viewer's own device-local time, so what's shown always matches what the person's phone clock says. This was made consistent across the app this session after a bug was found: the doctor-notes feature (Phase 3.3) displayed a raw UTC timestamp with no conversion at all, off by exactly 4 hours, which is what prompted auditing every other display timestamp for the same class of mistake.

Recommended: one additional sentence near NFR10 (or in §3.7.3/wherever check-in timing is discussed) making this two-layer split explicit, rather than any change to NFR10's actual requirement.

### 3. Mechanism refinement — GPS accuracy tier, ties into the still-open NFR16 item

The earlier alignment check's NFR16 discussion (foreground-only passive collection) remains open and unresolved — this session adds a concrete, citable detail to that same discussion rather than a new separate contradiction. Both zone-proximity watchers (`useZoneMonitor.ts`, foreground display; `lib/backgroundLocationTask.ts`, the actual `zone_breaches` writer) were switched from `Location.Accuracy.Balanced` to `Location.Accuracy.High` after introducing a 50m minimum zone radius (down from 100m). This was a deliberate, evidence-based decision, not a default: Android's own documentation states `Balanced` targets ~100m accuracy and typically uses WiFi/cell positioning rather than GPS at all, which would make a 50m zone smaller than the position noise itself. `High` targets ~10m and does use GPS. An accuracy-aware safeguard was also added to both watchers — a position reading whose own self-reported uncertainty exceeds the zone's radius is treated as inconclusive rather than used to confidently (and possibly wrongly) place the patient in or out of a zone.

This is worth citing directly in the Design/Testing chapters as a concrete instance of a design parameter (zone radius) and a technical constraint (GPS accuracy tiers) being reasoned about together rather than chosen independently — a real methodology point, not just an implementation footnote. It also sharpens the already-open NFR16 discussion: whichever way that item is ultimately resolved in the chapters, the location mechanism should now be described as GPS-based (`High` accuracy) for zone monitoring specifically, not the coarser WiFi/cell-leaning `Balanced` tier the original prototype scope may have implied.

### 4. Chapter 3 technology table (§3.8) — needs a small update

The `Location | expo-location | Foreground GPS + zone proximity | ... foreground-only in the prototype` row's "foreground-only" qualifier was already flagged as outdated by the earlier alignment check (background location genuinely works); this session's accuracy-tier change is additional detail for whatever replacement wording is chosen, not a new open question.

### 5. Confirmed consistent — no action needed

- The six-type zone taxonomy (Bar/Nightclub, Drug Market, Friend's House, Workplace, Home, Other) is unchanged and still matches the DB check constraint exactly — only its *requiredness* changed, not the taxonomy itself.
- The drug-class sensitivity modifier, its coefficients, and the overall "transparent weighted formula over a trained classifier" argument (§2.8, §3.7.1) are entirely unaffected by the zone-model change — the modifier applies to the same `base` score regardless of how that base's zone term is computed internally.

### 6. Worth citing on its own merits — a real build/environment debugging episode

Getting a working `react-native-maps` build onto a physical device for this phase took three separate, unrelated root causes, each confirmed with primary evidence before moving to the next rather than guessed at from a stack trace alone:
1. A silently desynced `package-lock.json` (missing `expo-modules-core` and the Jest dependency tree despite `npm install` reporting success) — the actual root cause of every earlier "dependencies not matching" EAS build failure. Diagnosed by comparing `npm install`'s own summary against `npm ci` (the literal command EAS's cloud build runs) and against direct on-disk package.json inspection, rather than trusting either tool's reported success.
2. A genuine version conflict between `react-native-reanimated` (pulled in transitively via `expo-router` → `@expo/ui`, not used directly by this app) and `react-native-worklets`, root-caused by reading reanimated's own `compatibility.json` and Gradle assertion scripts directly rather than inferring a fix from the error text (an initial fix attempt, based on a plausible but wrong reading of a peer-dependency warning, made the problem worse before the correct direction was found this way).
3. A native runtime crash on every launch, diagnosed from an Android `adb bugreport` capture (live `logcat` was unavailable that session due to USB debugging authorization issues) cross-referenced against `react-native-worklets`'s own troubleshooting documentation, tracing to Expo's default-disabled Metro `inlineRequires` setting breaking worklets' native initialization — fixed with a `metro.config.js` change requiring no native rebuild at all.

This is strong, concrete material for the dissertation's Testing/Evaluation chapter as an example of triangulating root causes from primary evidence (dependency manifests, Gradle assertion source, on-device crash captures, official troubleshooting docs) under a genuinely constrained build budget, rather than trial-and-error rebuilding — worth a paragraph in its own right, independent of any specific feature it happened to be blocking.

