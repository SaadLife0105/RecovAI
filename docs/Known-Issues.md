# RecovAI — Known Issues Log

Tracked issues deferred during UI-first development (screens 1–30+),
to be resolved in a deliberate pass rather than fixed ad hoc mid-build.
Add to this file as issues surface; remove/check off once resolved.

---

## Open

*(none — see below if this list is empty; check back before assuming everything's done)*

---

## Resolved
*(move items here once fixed, with a one-line note on the fix)*

- **Relapse logging (Development Plan.md §2.2) — built and verified end-to-end, including two real RLS/trigger bugs found via live testing with an actual patient session, not caught by reading the SQL alone.**
  Migration `0002_relapse_logs.sql` added the `relapse_logs` table + RLS.
  `LogRelapseModal`, `check-in.tsx`'s `handleLogRelapse`, and a new
  `relapse-logged.tsx` confirmation screen wired the full flow — insert
  `relapse_logs`, reset `profiles.sobriety_start_date`, insert a
  `type: 'relapse_logged'` doctor alert; `streaks` is deliberately never
  touched (see the existing 2.2 note on why). Also fixed the "Days
  Sober" / check-in-streak label conflation flagged in that same note:
  `StreakCard.tsx` now says "Day Streak"; a genuine "Days Sober" stat
  (via `daysBetween(sobriety_start_date, today)`) was added to
  `profile.tsx` — **still missing from `home.tsx`; see the Phase 2.3
  verification note in Development Plan.md.**
  Two schema bugs surfaced only once a real patient session (not the
  service role) wrote to these tables for the first time:
  - `enforce_profile_role_invariants()` (0001) wasn't `security
    definer`, so its own internal "does assigned_doctor_id point at a
    real doctor" check ran under the calling session's RLS — a patient
    updating their own `sobriety_start_date` couldn't see their own
    doctor's profile row (blocked by RLS) to satisfy its own trigger's
    check, so any patient self-update to `profiles` failed with
    "assigned_doctor_id must reference a doctor profile" even with
    fully valid data. Fixed in
    `0003_fix_role_invariant_trigger_rls.sql` (`security definer` +
    explicit `search_path`).
  - `alerts` had no INSERT policy for patients at all — only the
    doctor-full-access policy existed, so a patient-initiated alert
    insert failed RLS outright. Fixed in
    `0004_alerts_patient_insert_policy.sql`, scoped narrowly (a patient
    can only insert an alert naming themselves and their own currently-
    assigned doctor) — AI-agent alerts (Phase 5) still go through the
    service role, not this policy.
  Also fixed while retrofitting `useAlerts()`/`alerts.tsx` to real
  Supabase for this feature: `dayLabel()` was comparing against the
  frozen mock `MOCK_TODAY` constant, and `alert.createdAt` was rendered
  without converting real UTC timestamps to Mauritius wall-clock time
  (`toMauritiusIsoString`) — both would have silently mis-displayed
  every real alert's date/time.

- **Drug-class selection missing from `add-patient.tsx` (found during Phase 1.2 prep).**
  A real gap vs. Milestone 1 (Development Plan.md) — `DrugClass`,
  `DRUG_CLASS_LABELS`, and `PatientSubstance` already existed in
  `lib/types.ts`, just never wired into any screen. Added a 6-chip
  multi-select with one markable as primary (auto-assigned on first
  selection, reassigned sensibly on deselect). Also removed
  `Profile.mustChangePassword` — dead field left over from the
  forced-password-change design already removed elsewhere (confirmed
  zero remaining references repo-wide).
  Still outstanding: no read-only display of a patient's assigned
  class anywhere on the patient side yet (FR31) — noted, not yet
  built.

- **`add-patient.tsx` trivial bugs (was #3).** Start Date now shows
  "Select start date" placeholder in `colors.textMuted`; Create
  Patient button uses `colors.primary`.
- **`dashboard.tsx` vs mockup #31 (was #6).** Rebuilt to match: header
  is now menu icon / "Mission Control" / bell-with-dot; stat row
  removed from this screen (data/hook kept for possible reuse
  elsewhere); Add Patient moved to a floating action button (user
  decision, since the mockup's header has no equivalent action and no
  drawer menu exists yet); `PatientListRow` rebuilt with ID/age
  subtitle, `RiskRingBadge` (new small single-band ring component),
  and the "Inactive (7+ days)" / "Not Logged In" status variants.
  Bonus fix: Alex Brown's dashboard mock score (was 42) now matches
  her `patient/[id].tsx` mock and the mockup (72) — this was a real
  data inconsistency, not just a visual gap.
- **Small trivial fixes batch (was #7).** `patient/[id].tsx` now shows
  3 Recent Alerts rows (added Zone breach); "Trend" → "Trend (7
  days)"; "High risk score" → "High risk score predicted".
  `journal-new.tsx` MAX_LENGTH 1000 → 2000.
- **Empty-vs-populated-state family (was #2, #5, #8, #9, #12, #13).**
  Resolved together using mockups now stored in docs/mockups/:
  - `home.tsx` (#2): splits on `useCheckIns().hasCheckedInToday`.
    Populated branch unchanged (full RiskGauge, recap sliders).
    Empty branch built to mockup 30 (StreakCard card-compact +
    RiskRingBadge stat row, banner, Today's Check-in card, Quick
    Actions grid). A `DEV_FORCE_EMPTY` flag was added since the mock
    data can't currently produce the empty state naturally.
  - `journal.tsx` (#5): retrofitted to `useJournalEntries()`; visual-
    only filter tabs added (All Entries/Mood/Triggers/Notes — not
    functional yet, JournalEntry has no category field to filter by);
    empty state built to the fuller screens-43-46 version (tip card,
    "Write Your First Entry").
  - `chat.tsx` (#8): new `ChatMessage` type, `CHAT_MESSAGES` mock
    conversation, and `useChatMessages()` hook added. Populated state
    (bubbles, read receipts, input bar) built to mockup 39; empty
    state left as-is (already correct).
  - `alerts.tsx` (#9): empty state and populated rows are now mutually
    exclusive (`ALERTS.length > 0 ? … : …` — previously both always
    rendered). Copy updated to "All clear!" / "No new alerts right
    now. You'll be notified if anything needs your attention." Not
    retrofitted to `useAlerts()` yet — deferred to item #4, needs a
    separate name/badge-mapping design pass.
  - `reports.tsx` (#12): the empty-state conditional and subtext
    ("...every Monday") were already correct on inspection — the
    "possibly still broken" note in the old entry was wrong. Only
    change: added the tip card from mockup 43. Deliberately did not
    add filter tabs — the populated mockup (screen 41) doesn't have
    them, so adding them would create a new populated/empty mismatch.
  - `history.tsx` (#13): no empty state existed at all; added one
    matching mockup 44, gated on the raw (unfiltered) activity count.
    Went with the screens-43-46 filter-tab set (Check-ins/Zones/
    Alerts) over the screens-23-24 version (Mood/Sleep) because the
    former matches both `useActivityFeed`'s actual data model and the
    populated screen 40 — the latter didn't fit either.
- **`add-zone.tsx` vs mockup #38 (was #10).** User decision: full
  replacement. Retitled "Risk Zone Management"; removed the Zone Name
  field entirely (RiskZone's actual type never had one, just `label`);
  replaced the type dropdown with the 6-button colored grid. Added two
  new theme tokens (`zoneDrugMarket`, `zoneFriendsHouse`) since the
  existing palette couldn't give 6 zone types distinct colors without
  reusing riskMedium for two different meanings. Downstream fix in
  `zones.tsx`: dropped the now-nonexistent custom `name` field, zone
  type is now the row's title, removed the redundant type badge chip.
  `zones.tsx` still uses a local mock array, not `useRiskZones()` —
  that stays part of the #4 hook-retrofit batch.
- **Hook retrofit, remaining screens (was #4).** `alerts.tsx`
  retrofitted to `useAlerts()`, with a new `PATIENT_NAMES` lookup
  (mockData.ts) and an `ALERT_TYPE_META` mapping for badge/message/dot
  color per alert type; filter tabs (Unread/High Risk) are now
  functional, not just visual. `zones.tsx` retrofitted to
  `useRiskZones()` — this partially reversed the local-only version of
  the #10 fix: the real RiskZone data has both a specific `label`
  ("Downtown Bar") and a `zoneType` category, so the row title is back
  to showing the real label, with icon/color/background now sourced
  from a new shared `lib/zoneTypes.ts` (`ZONE_TYPE_META`, also used by
  `add-zone.tsx`'s button grid, deduplicating what used to be a local
  array there). `patient/[id].tsx` partially retrofitted: name/age/
  patientId now pulled from `PATIENTS[0]` instead of a duplicate local
  object; riskScore/trendDelta/trendData stay local mock, clearly
  commented, since no per-patient historical data source exists yet —
  full per-ID lookup isn't possible until dashboard.tsx passes the real
  tapped patient's ID instead of a hardcoded `'1'` (pre-existing gap,
  not introduced by this pass). `edit-profile.tsx` needed no changes —
  already correctly wired from earlier work. (Note: an earlier version
  of this entry also claimed doctor `profile.tsx` was retrofitted —
  that wasn't true, it hadn't been touched; see below, now genuinely
  done as part of #1's fix.)
- **`first-login.tsx` / forced-gate flow, `profile.tsx` "Settings" vs
  `edit-profile.tsx` "Recovery Preferences" (was #1, #14) — verified
  by direct file inspection, not just trusting the build report.**
  `first-login.tsx` deleted (confirmed gone). `change-password.tsx`
  built for both patient and doctor (tab bar included — normal in-app
  navigation, not a pre-access gate). All three "Change Password" rows
  (patient `profile.tsx`, patient `edit-profile.tsx`, doctor
  `profile.tsx`) now have real `route`/`onPress` wiring — confirmed
  each file directly, not just the summary. New shared
  `PATIENT_PREFERENCES` constant (mockData.ts) replaces the two
  conflicting reminder-time values (8:30 AM vs 8:00 PM → one source,
  8:00 PM per mockup 46) and the missing Notifications value on
  profile.tsx. Kept as two screens (Settings = quick actions, Recovery
  Preferences = fuller panel) per the earlier decision — not merged.
  Doctor `profile.tsx` also retrofitted for real this time: now uses
  `useDoctorProfile()` + `usePatients()` instead of a hardcoded `MOCK`
  object.
