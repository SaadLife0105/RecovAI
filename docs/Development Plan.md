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
    (auth)/          splash, role-select, login, forced-password-change
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
| `profiles` | id (FK auth.users), role (patient/doctor), full_name, assigned_doctor_id, must_change_password, archived, **sobriety_start_date** | Row created via trigger on signup; sobriety date drives the "days sober" counter |
| `push_tokens` | user_id, expo_push_token, platform, updated_at | Needed for doctor alerts — Expo push requires storing each device's token server-side |
| `checkins` | patient_id, date, mood (1–10), sleep (1–10), craving (1–10), isolated (bool), steps, risk_score, created_at | Unique (patient_id, date) |
| `patient_substances` | patient_id, drug_class (enum), is_primary (bool), recovery_start_date | **New.** A patient can have multiple rows (polydrug use is common in Mauritius). Doctor sets these at account creation; patient can view but not edit. `is_primary` marks the class the risk engine keys off |
| `risk_zones` | patient_id, doctor_id, lat, lng, radius_m, zone_type, classification (safe/risk), label | |
| `zone_breaches` | patient_id, zone_id, detected_at | Written by location task |
| `alerts` | patient_id, doctor_id, type, urgency, xai_explanation, read, created_at | |
| `journal_entries` | patient_id, content, mood_emoji, created_at | RLS: patient-only, doctor has NO policy |
| `chat_messages` | patient_id, role (user/assistant), content, created_at | |
| `doctor_notes` | patient_id, doctor_id, content, created_at | |
| `kb_documents` | content, embedding vector(N), source, category, **drug_class (nullable)** | RAG knowledge base. `drug_class` tags class-specific content (opioid overdose warnings, cannabis coping, etc.); NULL = general content applicable to all |
| `streaks` | patient_id, current_streak, longest_streak, last_checkin_date | |

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
- [ ] **Only doctors self-register via email.** Patients never sign up themselves. Doctor registers → creates patient accounts (username + temp password) → sets each patient's drug class(es) at creation → relays credentials to the patient offline
- [ ] Splash → Role Select → Login (role, email/username, password) → Permissions request screen (location, motion/pedometer, notifications, health data framing)
- [ ] **Forced password change** on first patient login; after this the patient can edit their own profile (name, address, contact) but the doctor retains ownership of clinical fields (drug class, recovery start date)
- [ ] Route guard in Expo Router: unauthenticated → auth stack; patient role → patient tabs; doctor role → doctor tabs

**Milestone 1:** Doctor can register, create a patient with an assigned drug class, and both roles land on their home screen. Schema deployed with RLS. *(Dissertation: Design chapter — architecture diagram, ERD, security design, drug-class taxonomy.)*

---

## Phase 2 — Patient Core Loop (Weeks 2–3)

The single most important vertical slice: **check-in → risk score → display**. Everything else hangs off it.

### 2.1 Risk engine (pure TypeScript, built test-first)
- [ ] `lib/riskEngine.ts` implementing the weighted formula:
  ```
  base  = craving×0.30×10 + (10−mood)×0.20×10 + (10−sleep)×0.15×10
        + (isolated ? 15 : 0) + (steps<2000 ? 10 : 0) + (nearRiskZone ? 10 : 0)
  score = clamp( base × classSensitivity[primaryDrugClass], 0, 100 )
  ```
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

### 2.3 Patient Home (Screen 5)
- [ ] Circular SVG risk gauge (react-native-svg arc, colour-banded)
- [ ] Days-sober counter, safe-zone status chip, today's steps + activity classification (Staying In <2k / Light Movement / Active Day / Very Active), recent check-in summary, Check In Now CTA
- [ ] Streak flame component: 9 tiers (0–2 none → 365+ rainbow crown), driven by `streaks` table

### 2.4 Passive data collection
- [ ] Pedometer: `expo-sensors` Pedometer, read daily step count on home focus + at check-in time; cache in AsyncStorage for offline resilience
- [ ] GPS: `expo-location` foreground watcher; haversine distance check against the patient's `risk_zones`; write `zone_breaches` on entry into a risk zone; compute `nearRiskZone` flag for the risk engine
- [ ] **Zone breach debounce**: only log a new breach if the patient has left the zone and re-entered, or after a cooldown window (e.g. 60 min). Without this, a patient sitting inside a zone generates a breach row per GPS tick and floods the doctor with alerts
- [ ] Graceful degradation path: if permission denied, risk engine runs on self-report only (document this — examiners will ask)

### 2.5 History (Screen 7) + Journal + SOS
- [ ] Check-in history list with per-day risk badge and mood/sleep/craving icons
- [ ] Private journal (free text + mood emoji) — verify with a doctor account that RLS truly blocks access
- [ ] Persistent floating SOS button on all patient screens — crisis sheet (SAMU 114, Emergency 999, hotlines)

**Milestone 2:** A patient can check in daily, see their gauge, streak, and history, with passive GPS/steps feeding the score. *(Dissertation: Implementation chapter — risk engine, EMA implementation, digital phenotyping pipeline.)*

---

## Phase 3 — Doctor Side (Weeks 4–5)

### 3.1 Forecasting engine
- [ ] `lib/forecast.ts`: least-squares linear regression over last 7 daily risk scores → 3-day projection, clamped 0–100
- [ ] Unit tests: known slope cases, flat series, <7 data points (fallback: no forecast shown)

### 3.2 Mission Control Dashboard (Screen 10)
- [ ] Stat cards: Total Patients, High Risk Now, Predicted High Risk (48h) — the last one computed by running the forecaster over every patient
- [ ] Patient cards sorted by current risk: avatar, name, risk badge, trend arrow, 7-day sparkline + 3-day dotted forecast (react-native-chart-kit)
- [ ] Search bar + filter pills (All / High / Medium / Low / Inactive / Pending / Archived)

### 3.3 Patient Detail (Screen 11)
- [ ] Full 7-day chart + dotted forecast + danger threshold line at 70
- [ ] AI Explanation card (populated by XAI function, Phase 4), recent alerts list, private doctor notes, archive/restore

### 3.4 Risk Zones (Screen 12)
- [ ] Map interface (`react-native-maps` via Expo): doctor drops pins per patient, sets radius, zone type (Bar/Nightclub, Drug Market, Friend's House, Workplace, Home, Other) and Safe/Risk classification
- [ ] Zone list view matching the mockup with radius + classification chips

### 3.5 Patient account creation + Alerts screen (Screen 13) + Doctor Profile (Screen 15)
- [ ] Doctor creates patient with temp password (via Edge Function using the service role — the client must never hold admin keys) **and selects the patient's drug class(es) from the six-class dropdown, marking one as primary** (dropdown, never free text — keeps the data clean and analysable); patient forced to change password on first login, after which doctor loses account management but keeps metric visibility and ownership of the clinical fields (drug class, recovery start date)
- [ ] Alerts inbox with All/Unread/High Risk tabs; notification preference toggles in profile

**Milestone 3:** Full two-sided system working with rule-driven data. *(Dissertation: Implementation — dashboard, forecasting; Design — doctor workflows.)*

---

## Phase 4 — AI Layer I: RAG Chatbot + XAI (Weeks 6–7)

### 4.1 Knowledge base construction
- [ ] Curate content: CBT techniques, urge-surfing/craving management, sleep hygiene, relapse prevention basics, **Mauritius-specific crisis resources**. Keep a source log (needed for the dissertation's ethics/method sections).
- [ ] **Choose an embedding model — this is an open decision the stack doesn't cover.** Anthropic does not provide an embeddings API, so the RAG pipeline needs a separate provider. Options: Supabase's built-in `gte-small` model (runs inside Edge Functions, free, 384-dim — simplest for a prototype), Voyage AI (Anthropic-recommended), or OpenAI `text-embedding-3-small`. Whichever you pick, the same model MUST embed both the knowledge base and the live queries, and `kb_documents.embedding vector(N)` must match its dimension (384 for gte-small, not 1536). Document the choice + justification for the Design chapter
- [ ] Chunk (~300–500 tokens), embed, insert into `kb_documents` with pgvector; **tag each chunk with a `drug_class` where relevant** (opioid overdose-risk warnings, cannabis-specific coping, stimulant crash management; leave NULL for general content); create an ivfflat/HNSW index; write a `match_documents(query_embedding, k, patient_drug_class)` SQL function that returns chunks matching the patient's class OR general (NULL) content

### 4.2 RAG Edge Function (`rag-chat`)
- [ ] Pipeline: patient message → embed query → **class-filtered** pgvector top-k retrieval (patient's drug class + general chunks) → Claude Haiku with a safety-focused system prompt + retrieved chunks + short conversation history → response. This is where drug differentiation is cheapest and highest-value: no model changes, just metadata filtering, so an opioid patient gets opioid coping + overdose warnings while a cannabis patient gets class-appropriate content
- [ ] System prompt rules: never give medical/dosage advice, always ground in retrieved content, escalate to crisis resources on self-harm signals, warm supportive tone
- [ ] Crisis keyword pre-filter that surfaces the SOS resources banner (visible in Screen 8 mockup)
- [ ] **Prompt-injection hardening**: patient messages are untrusted input flowing into both the chatbot and (via check-in free-text/journal context if ever included) the agent. Wrap user content in clear delimiters, instruct the model that user text is data not instructions, and test with injection attempts ("ignore your instructions and…") — include these in the DeepEval adversarial set

### 4.3 Chat UI (Screen 8)
- [ ] Chat screen with persistent crisis banner, message history from `chat_messages`, typing indicator

### 4.4 XAI explanation function (`generate-xai`)
- [ ] Edge Function: given a patient's recent check-ins, score delta, and zone breaches, Claude Haiku writes a 2–3 sentence plain-English clinical summary of contributing factors — stored on the alert row and shown on Patient Detail
- [ ] Push notification to doctor via `expo-notifications` when score crosses 70

### 4.5 Chatbot evaluation with DeepEval
- [ ] Build a test set of ~30–50 representative patient queries (include adversarial ones: dosage requests, self-harm statements)
- [ ] Run DeepEval metrics: answer relevancy, faithfulness, contextual precision/recall, hallucination, toxicity, bias
- [ ] Export results tables — these are the quantitative backbone of the Testing chapter

**Milestone 4:** Working, evaluated RAG chatbot + XAI alerts. *(Dissertation: Implementation — RAG pipeline diagram, prompt design; Testing — DeepEval results.)*

---

## Phase 5 — AI Layer II: Autonomous Agent (Week 8)

The dissertation's novelty claim — build it carefully and log everything.

### 5.1 Agent Edge Function (`risk-agent`)
- [ ] Triggered on every check-in submission (called from the check-in flow after insert)
- [ ] Tool definitions (Anthropic tool use API, JSON schemas):
  - `get_patient_checkins`, `get_risk_score_trend`, `get_zone_breaches` (read tools)
  - `send_doctor_alert(urgency)`, `generate_xai_explanation`, `send_patient_message`, `flag_for_urgent_review` (action tools)
- [ ] Agent loop: assemble patient context → Claude Haiku with tools → execute tool calls → feed results back → repeat until the model stops calling tools (cap at ~6 iterations as a safety bound)
- [ ] System prompt defines the agent's role, decision criteria, and restraint rules (e.g., don't alert the doctor for routine low-risk check-ins — avoid alert fatigue). **The patient's drug class is passed into the agent context and shapes thresholds and tone**: a rising-craving opioid patient in early recovery is treated as more urgent (fast relapse + overdose risk) than the same pattern in a cannabis patient, and patient-facing messages use class-appropriate language. This is prompt context, not new code

### 5.2 Agent observability
- [ ] Log every agent run to an `agent_runs` table: input context, reasoning summary, tools invoked, outcomes. This log is dissertation gold — it lets you show concrete traces of autonomous reasoning in the Implementation and Testing chapters.

### 5.3 Agent testing
- [ ] Scripted scenario suite: (a) routine low-risk check-in → expect no action; (b) sharp score spike → expect alert + XAI; (c) medium score but compounding signals (zone breach + sleep decline + rising craving) → expect nuanced multi-action response; (d) high craving alone → expect supportive patient message
- [ ] Record agent decisions per scenario in a results table; discuss correct/incorrect judgements honestly (examiners reward honest failure analysis)

**Milestone 5:** Agent autonomously reasoning and acting on check-ins, fully logged.

---

## Phase 6 — Automation, Reports & Polish (Week 9)

- [ ] **Weekly report Edge Function** on a Monday cron (Supabase scheduled functions): per doctor, aggregate 7-day risk trends, compliance rate, average scores, alerts, zone breaches → HTML email via Resend; downloadable list in Reports screen (Screen 14)
- [ ] **Missed check-in detection cron** — the Alerts mockup (Screen 13) shows "Check-in missed" alerts, but nothing generates them without a scheduled job. Add a daily pg_cron/Edge Function run (e.g. 21:00 Mauritius time) that finds patients with no check-in for the day and writes an alert + optional gentle patient push reminder
- [ ] Enforce doctor **notification preferences** at alert-send time (agent and threshold alerts must both check them, or the toggle is decorative)
- [ ] Onboarding 3-screen walkthrough on first patient login
- [ ] Empty states, loading skeletons, error toasts across all screens; offline handling for check-ins (queue in AsyncStorage, sync on reconnect)
- [ ] Accessibility pass: touch targets, contrast, screen-reader labels on sliders/gauge

---

## Phase 7 — System Testing & Demo Data (Week 10)

- [ ] **Unit tests**: risk engine, forecaster, streak logic (already written; finalise coverage report)
- [ ] **Integration tests**: check-in → score → agent → alert end-to-end on a staging patient
- [ ] **Security tests**: attempt cross-patient data access with a second account (prove RLS); confirm journal invisible to doctor; confirm no API keys in the app bundle
- [ ] **Usability**: small informal walkthrough (3–5 people) with task completion + SUS questionnaire — gives the Testing chapter a human-evaluation dimension
- [ ] **Demo dataset**: seed script creating ~5 synthetic patients with 14 days of varied check-in history (one stable, one deteriorating, one erratic, one zone-breacher, one non-compliant) so the dashboard, forecasts, and agent all have something meaningful to show in the viva demo. Make the trajectories *defensible, not arbitrary*: derive the day-to-day patterns from the digital-phenotyping literature (see `RecovAI_Data_Sources.md` §E) and follow the ChatThero principle (§G) of matching synthetic output to real clinical parameters. This turns "I made up data" into "I generated data grounded in published behavioural patterns"
- [ ] Record a full demo run-through video as backup against live-demo failure

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
2. **Pedometer behaves differently per platform**: `Pedometer.getStepCountAsync(start, end)` is iOS-only; on Android you can only `watchStepCount` (live increments since subscription) and Android requires the `ACTIVITY_RECOGNITION` permission. Design the step pipeline as: watch live counts → accumulate into AsyncStorage → persist daily total at check-in. Test on a real Android device in week 2, not week 9.
3. **Background GPS doesn't run in Expo Go** — background location needs a dev build with `expo-task-manager` config, and it drains battery. For the prototype, foreground-only tracking (while app is open + at check-in time) is defensible; state that limitation explicitly in the dissertation rather than pretending to have continuous tracking.
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
