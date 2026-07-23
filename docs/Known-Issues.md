# RecovAI — Known Issues Log

Tracked issues deferred during UI-first development (screens 1–30+),
to be resolved in a deliberate pass rather than fixed ad hoc mid-build.
Add to this file as issues surface; remove/check off once resolved.

---

## Open

- **No real UI-level enforcement of "one check-in per day" — a resubmission just silently overwrites, it doesn't block.** Development Plan.md's Phase 2.2 checklist says "One check-in per day enforced at DB level (unique constraint) and UI level," but only the DB half is real: `check-in.tsx`'s insert is an `upsert(..., { onConflict: 'patient_id,date' })`, so a second same-day submission doesn't error or get blocked — it just replaces the first one's data outright, with no warning to the patient that they're overwriting an earlier entry. `useCheckIns().hasCheckedInToday` already exists (used to split `home.tsx`'s empty/populated state) but nothing reads it to gate the Check-In screen or disable the Submit button on a second visit. Left as-is deliberately for now, since it was genuinely useful during Phase 5 on-device testing (submitting several check-ins back-to-back on the same test account, same day, without waiting). Worth a decision before Phase 7: either build the real guard (redirect to a "you already checked in today" state, or an explicit "you're about to overwrite today's check-in" confirmation) or, if the upsert-silently-wins behaviour is kept, correct Phase 2.2's checklist wording so it doesn't claim a UI-level block that doesn't exist.

- **Background location crash needs verification on a genuine standalone build, not just the dev-client, before the demo.** Full account in `BUILD_TROUBLESHOOTING.md`'s "Background location crash" entry (2026-07-21) — a real crash, confirmed to be a known, long-standing upstream Expo bug (background location task + Android killing/reclaiming the app process racing Expo's native module bridge on relaunch), not something introduced by this app's code and not something a JS-level fix can close, since it happens before this app's own JS runs at all. It's intermittent, not deterministic — a clean 10-minute backgrounded test the same session is not evidence it's resolved. **Action item**: before Phase 7/the viva demo, deliberately background the app with location active on a real standalone/production-profile build (not the dev-client) for an extended period and confirm whether it reproduces there too — the dev-client's own crash-recovery behaviour (bouncing to the Expo dev menu) is a separate, dev-client-only artifact that a standalone build won't have, but that doesn't tell us anything about whether the underlying crash itself still fires on a standalone build.

- **Offline check-in queue (Development Plan.md §6) deliberately not built yet — needs a new native dependency, so it's batched for the next EAS build rather than triggering one alone.** Discussed in detail 2026-07-22: a real connectivity-change detector (`@react-native-community/netinfo`) is genuinely more reliable than a no-dependency alternative (retrying on app-foreground/launch/a quiet in-app timer), specifically for the case of an app left open while the network quietly reconnects in the background — NetInfo would catch that instantly, the alternative only within its own retry interval. Worth noting for design honesty: NetInfo alone doesn't fully solve the problem either — reporting "connected" doesn't guarantee real internet reachability (hotel-WiFi-style false positives are common), so any implementation still has to attempt the real request and handle failure regardless of what NetInfo reports. Decided to accept the real native dependency rather than the no-dependency workaround, and wait to build it until it can be batched with whatever other native change next needs an EAS build (same reasoning as the deferred PDF export, Future Work section). Design notes to carry into that future session: capture the check-in's intended date at submission time, not sync time (Critical Caution #18); only attempt a silent resync if that date is still "today" (Mauritius time) by the time connectivity returns — a check-in that's gone stale by day-rollover should surface to the patient for an explicit decision, not silently backfill and trigger the streak/agent side-effects for a day that's already passed.

- **Check-in reminder can silently go stale if notification permission is revoked later, outside the app (Development Plan.md's Phase 7 reminder feature, 2026-07-22).** `lib/checkinReminder.ts`'s `scheduleCheckInReminder()` correctly returns `false` and reverts the toggle if a patient declines the OS permission prompt at the moment they first enable the reminder — that case is fixed and verified. The narrower, separate case is NOT handled: a patient who already has the reminder on, then later revokes notification permission from the phone's own Settings app (not from within RecovAI), will have `(patient)/_layout.tsx`'s launch-time reschedule call fail silently on every subsequent app open — the layout effect calls `scheduleCheckInReminder()` but doesn't inspect its returned boolean. The database still reads `checkin_reminder_enabled: true` and the in-app toggle still shows "on," but no reminder actually fires, with nothing telling the patient why. Deliberately left as a known limitation rather than fixed immediately: reconciling it would mean writing `checkin_reminder_enabled: false` back to the database from a background launch effect on a failed reschedule, which is its own small design decision (silently disabling a preference the patient didn't touch) rather than a trivial follow-on to the fix already made. Revisit if real usage ever surfaces this — deliberately deferred, not forgotten.

- **`"No task registered for key expo-task-manager"` warning on a fresh app launch (patient login), found 2026-07-22 during the Phase 7 audit follow-up — likely benign, not yet fully root-caused, needs a follow-up look rather than immediate action.** Appears once, right at cold start (immediately after the JS bundle finishes loading), and does NOT match this app's own task name (`BACKGROUND_ZONE_TASK` = `'recovai-background-zone-monitor'`, defined in `lib/backgroundLocationTask.ts`) — confirmed via a full-codebase search that the literal string `"expo-task-manager"` is never used anywhere as a task key in this app's own code. This is TaskManager's generic "no task registered for key X" warning template (the same message format seen in `expo/expo` issue #32662, closed by Expo as expected/non-bug behaviour), firing when the native side tries to hand a task-related event to the JS bridge before the JS side has finished registering it — most likely the module's own internal startup housekeeping resolving before `TaskManager.defineTask` for our real task has run, not a task this app defined incorrectly. Supporting evidence it's not a functional problem: it only appears once per fresh launch (not on every reload, unlike the `useAlerts.ts` Realtime bug fixed the same day), and immediately afterward this app's own real, already-documented warning (`startLocationUpdatesAsync failed — background zone monitoring will not be active this session`) fires correctly, meaning `defineTask` for `BACKGROUND_ZONE_TASK` did register as expected. **Not yet confirmed root cause, and not yet confirmed harmless in every case** — flagged as Open rather than Resolved specifically because it hasn't been tied to a definitive source (which Expo module/internal mechanism actually logs it) or fully ruled out as ever affecting real behaviour (e.g. a foreground zone-breach detection edge case immediately after a cold start). **Follow-up action**: revisit during Phase 7's standalone-build verification pass (same session as the background-location crash check) — confirm foreground zone detection works correctly immediately after a cold start with this warning present, and if time allows, trace the exact Expo module/internal call path that logs it before closing this out as confirmed-benign.

*(otherwise empty — check back before assuming everything's done)*

---

## Resolved
*(move items here once fixed, with a one-line note on the fix)*

- **`useAlerts.ts` — recurring `"cannot add postgres_changes callbacks... after subscribe()"` Realtime crash on the doctor Alerts screen (found via a real device log during Phase 7's audit follow-up, 2026-07-22).** Root cause: if the hook's effect re-runs before the *previous* run's cleanup (`removeChannel`) fully unregisters its channel, `supabase.channel()` with the same topic string can hand back that stale, already-subscribed channel object instead of a fresh one — and calling `.on()` on an already-subscribed channel throws. Reproduced repeatedly via Fast Refresh in dev (each reload re-ran the effect faster than the prior unsubscribe round-trip), but the same race is possible on a real device on any sufficiently fast remount, not just a dev artifact. Fixed by explicitly finding and removing any stale channel with the exact same topic (via `supabase.getChannels()`) before creating the new one, guaranteeing `supabase.channel()` always returns a genuinely fresh, not-yet-subscribed object. `usePatientAlertsForDoctor.ts` (the per-patient equivalent used on Patient Detail) was checked and confirmed unaffected — it uses a plain focus-refetch pattern with no Realtime channel at all.

- **`registerBackgroundLocationTaskAsync` had no error handling around `startLocationUpdatesAsync` — a real Android platform rejection surfaced as an uncaught promise rejection (found 2026-07-22 during onboarding-feature testing, not a bug in the onboarding work itself).** Device logs showed `Error: Call to function 'ExpoLocation.startLocationUpdatesAsync' has been rejected. → Caused by: Couldn't start the foreground service. Foreground service cannot be started when the application is in the background` immediately after a dev-client JS bundle reload. This is a genuine, confirmed Android OS restriction (Android 12+, stricter still on 14): an app cannot start a new foreground service unless it's actually in the foreground at that exact moment — a dev-client reload re-running `(patient)/_layout.tsx`'s mount effect is one way to hit this, but any cold/background launch path could too. The call itself had no try/catch, and the caller in `_layout.tsx` only chained `.then()` with no `.catch()`, so the rejection propagated uncaught instead of degrading gracefully like every other best-effort operation in this project (NFR8). Fixed by wrapping the `startLocationUpdatesAsync` call in `lib/backgroundLocationTask.ts` in its own try/catch, logging a warning and returning `false` (background zone monitoring simply doesn't start that session) rather than throwing. Distinct from the two other background-location issues already documented (the debounce race condition fixed the same day, and the separate, still-open upstream Expo native-bridge crash in `BUILD_TROUBLESHOOTING.md`) — this is a third, genuinely different failure mode in the same general feature area.

  **Same-day follow-up**: the fix above returned a plain `boolean`, and `_layout.tsx`'s caller logged one generic message ("permission denied") for ANY `false` result — but after this fix, `false` can also mean the foreground-service-start rejection above, which has nothing to do with permissions. A real device log confirmed this went wrong in practice: "permission denied" appeared right after a run where permission was almost certainly already granted. Fixed by changing the return type to a discriminated `{ started: true } | { started: false, reason: 'permission_denied' | 'foreground_service_start_failed' }`, so `_layout.tsx` now logs an accurate, distinct message for each real cause. Verified on-device: logged in as a patient, force-closed the app, reopened — logs now read correctly.

- **Background zone-breach debounce race condition — ~100+ duplicate `zone_breaches` rows logged in a single burst (found 2026-07-22 while verifying Phase 6's weekly reports, not by code review).** Test Patient's report showed 112 zone breaches for one week — implausibly high. Direct query against `zone_breaches` showed 111 rows for the same zone, same classification, all within a 44-second window (2026-07-20 04:53:55–04:54:38), roughly one insert every 0.3–0.6s — not 111 genuine visits, a debounce failure. Root cause, in `lib/backgroundLocationTask.ts`: the task's read-check-write debounce sequence (read AsyncStorage → check "already inside?" → insert if not → write AsyncStorage back) had no locking against overlapping invocations. A burst of location updates delivered in quick succession (a buffered backlog flushed at once, or GPS multipath near a building) let TaskManager invoke the callback again before a prior invocation's write-back had finished — every overlapping invocation read the same stale "not yet inside" state and each independently inserted its own row. Fixed by chaining every invocation onto a single module-level promise (`taskQueue`), so each invocation's full read-check-write sequence completes before the next one's logic runs at all — closes the race structurally rather than narrowing its window. Verified: the 110 duplicate rows were deleted (kept the single earliest, genuine entry), the report was regenerated, and a follow-up device test the next day produced exactly one new, sensibly-timed breach — no repeat clustering. This is a different bug from the ordering/poisoning fix already resolved earlier in Phase 2.4 (a failed insert permanently marking the debounce state as "inside") — that fix is unrelated and still correct; this is a genuinely separate concurrency gap in the same function.

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
