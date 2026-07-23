# RecovAI — Phase 7 Static Verification Report

**⚠️ Stale snapshot (generated 2026-07-22, one-time, never re-run).** This
report reflects the app's state BEFORE all of the following, none of which
it has any awareness of: the 4 device-testing bug fixes (onboarding flash,
tab-tap reload, toast success/error styling, password autocapitalize), the
entire patient self-service password reset system, and the doctor-provides-
email-at-creation change. All of that is documented instead in
`Final-Edits-and-Fixes.md`'s "Post-completion additions" section, verified
there the same file-by-file way this report was originally produced, just
directly in conversation rather than as a separate generated report. Treat
everything below as historical record of what was true at the time, not as
the current state of the app.

A code-reading pass over every checkbox item in
[Phase7-Fixes-Test-Workflow.md](Phase7-Fixes-Test-Workflow.md). Each item is
classified **CONFIRMED** (source genuinely implements it), **CONCERN** (missing,
wrong, or doesn't match the doc — needs a human decision), or **NEEDS DEVICE
CHECK** (inherently un-verifiable from source: OS dialogs, notifications
actually firing, email delivery, visual layout, randomness actually varying).

**Typecheck:** `npx tsc --noEmit` → **clean, exit 0.**

**Migration state:** `npx supabase migration list` → **0001–0019 all present in
both Local and Remote columns.** The historical "written but never pushed" bug
is not present; 0017/0018/0019 are applied remotely.

---

## 1. Fresh patient — onboarding walkthrough
Files: [onboarding.tsx](../app/(patient)/onboarding.tsx), [avatarOptions.ts](../lib/avatarOptions.ts), [profile.tsx](../app/(patient)/profile.tsx)

- **Walkthrough launches for new patient** — CONFIRMED. Gated by `onboarding_completed` (comment onboarding.tsx:41); flag flips in `complete()` (:69-76).
- **Step through 3 informational slides** — ⚠️ **CONCERN (doc drift).** There are now **5** pre-avatar slides, not 3: the 3 static slides plus 2 new "Location Tracking" / "Step Tracking" action slides added this session (onboarding.tsx `ACTION_SLIDES`). Not a bug — the doc predates the change and should be updated to say "5 slides (3 info + 2 setup)".
- **Avatar picker: 8 options, one pre-selected, tap changes selection** — CONFIRMED. `AVATAR_OPTIONS` has exactly 8 (avatarOptions.ts:21-33); default preselected (onboarding.tsx:49); `setAvatarKey` on press (:134).
- **Email step → Get Started → completes, lands Home** — CONFIRMED. `complete()` → `router.replace('/(patient)/home')` (onboarding.tsx:85).
- **Profile shows picked avatar icon (not initials)** — CONFIRMED. Renders icon when `avatar` resolves, initials only as fallback (profile.tsx:82-86).
- **Skip mid-way still completes; Profile shows default avatar; no crash** — CONFIRMED. Skip calls same `complete()` (onboarding.tsx:108); avatar defaults to `AVATAR_OPTIONS[0]`, email persisted as null when blank (:74).

## 2. Fresh doctor — no regressions
File: [dashboard.tsx](../app/(doctor)/dashboard.tsx)

- **Dashboard loads normally** — CONFIRMED (renders `usePatients()` data).
- **No hamburger, no bell — just "Mission Control" title** — CONFIRMED. Only the title node exists in the header; no `menu`/`notifications`/`bell` icon anywhere in the file.

## 3. Password & account security
Files: [change-password.tsx (patient)](../app/(patient)/change-password.tsx), [change-password.tsx (doctor)](../app/(doctor)/change-password.tsx), [login.tsx](../app/(auth)/login.tsx), [reset-patient-password/index.ts](../supabase/functions/reset-patient-password/index.ts), [patient/[id].tsx](../app/(doctor)/patient/[id].tsx)

- **Patient Change Password calls updateUser** — CONFIRMED. `supabase.auth.updateUser({ password })` (patient change-password.tsx:36), 8-char + match validation (:24-31).
- **Old password no longer works** — NEEDS DEVICE CHECK (log out / back in with old vs new).
- **Doctor Change Password** — CONFIRMED. Identical `updateUser` path (doctor change-password.tsx:35).
- **Doctor Forgot Password sends email** — CONFIRMED (source). Calls `resetPasswordForEmail(trimmedEmail)` for doctor role, requires email typed first (login.tsx:42-51). Actual email delivery → NEEDS DEVICE CHECK.
- **Patient Forgot Password → "contact your doctor", no email** — CONFIRMED. Patient role returns a message and never calls Supabase (login.tsx:35-40).
- **Doctor resets patient password — ownership check** — CONFIRMED. Edge Function does two checks: caller is active doctor (index.ts:67-75) **and** target's `assigned_doctor_id === doctorId` via service-role read (:102-121), then `updateUserById` (:124). Success toast wired in `handleResetPassword` (patient/[id].tsx:181-198).
- **Archived patient → Reset Password button gone** — CONFIRMED. Button rendered only under `!patient.archived` (patient/[id].tsx:442).

## 4. Patient profile & edit-profile
Files: [profile.tsx](../app/(patient)/profile.tsx), [edit-profile.tsx](../app/(patient)/edit-profile.tsx), [privacy-info.tsx](../app/(patient)/privacy-info.tsx), [0018 migration](../supabase/migrations/0018_profile_phone_and_dob.sql)

- **Reminders & Notifications is ONE row** — CONFIRMED. Single settings row → `notification-preferences` (profile.tsx:55).
- **Edit Profile persists Name/Phone/Email/DOB (real date picker)** — CONFIRMED. All four in `handleSave` update (edit-profile.tsx:70-78); native `DateTimePicker mode="date"` (:132); hydrate-once guard prevents blanking (:46-56).
- **No camera/photo icon** — CONFIRMED. No camera icon present in edit-profile.tsx.
- **Edit Profile → Reminders & Notifications collapsed to one row here** — ⚠️ **CONCERN.** Patient edit-profile.tsx has **no Reminders/Notifications row at all** — it's a pure form (Name/DOB/Phone/Email). The single "Reminders & Notifications" row lives on Profile, not Edit Profile. Either the doc item is stale or a row was intended here and is missing. Flagging for a human call; not a crash.
- **Privacy & Data → real static screen, mentions Mauritius DPA** — CONFIRMED. privacy-info.tsx is a full static screen citing "Mauritius' Data Protection Act 2017" (:79) and per-category collection rationale.
- **Assigned Doctor card shows name (+ phone if set, no blank line otherwise)** — CONFIRMED (source). Renders `assignedDoctorName` always, phone only when truthy (profile.tsx:99-102). The pre-existing blank-name bug is fixed by migration 0018's `SECURITY DEFINER` `my_assigned_doctor_id()` + "patient reads own assigned doctor" SELECT policy (0018:49-61) — sound, avoids the self-referential-policy recursion trap. Name actually appearing end-to-end → worth one NEEDS DEVICE CHECK glance since it's the marquee fix.

## 5. Doctor profile & edit-profile
Files: [profile.tsx (doctor)](../app/(doctor)/profile.tsx), [edit-profile.tsx (doctor)](../app/(doctor)/edit-profile.tsx)

- **Gear icon next to avatar opens Edit Profile** — ⚠️ **CONCERN (UI-location mismatch).** Edit Profile **is** reachable and real, but as a Preferences **list row** (`create-outline` icon, profile.tsx:15), not a gear icon beside the avatar. The avatar block (:41-50) has no adjacent button. Function works; the doc's described entry point doesn't exist as written.
- **Edit Profile persists Name + Phone** — CONFIRMED. `handleSave` updates `full_name` + `phone` (doctor edit-profile.tsx:55-58); hydrate-once guard present (:36-41).
- **No "Theme" row** — CONFIRMED. `PREFERENCES_ROWS` = Alert Preferences, Edit Profile, Change Password, Log Out only (profile.tsx:13-18).
- **Doctor phone appears on patient's Assigned Doctor card** — CONFIRMED (source, same 0018 policy path). Cross-account render → NEEDS DEVICE CHECK.

## 6. Alerts — both screens
Files: [useAlerts.ts](../lib/hooks/useAlerts.ts), [alerts.tsx](../app/(doctor)/alerts.tsx), [patient/[id].tsx](../app/(doctor)/patient/[id].tsx), [AlertRow.tsx](../components/cards/AlertRow.tsx)

- **No bell icon in Alerts header** — CONFIRMED. Header is just the "Alerts" title (alerts.tsx:51-53).
- **Tap row expands (XAI, full timestamp, patient name/link); Unread→Read immediately** — CONFIRMED. `toggleAlert` expands + `markRead` (alerts.tsx:27-34); expanded body shows XAI, `formatTimestamp`, and "View {name}" link (:99-118). `markRead` is optimistic (useAlerts.ts:152-161). *Note:* on this screen the pill badge shows the alert **type**; Read/Unread is text in the meta line (alerts.tsx:86) — it flips immediately regardless. On Patient Detail the pill badge itself is Read/Unread (patient/[id].tsx:652).
- **AI disclaimer line under XAI** — CONFIRMED. `AI_DISCLAIMER` rendered when `xaiExplanation` present (alerts.tsx:103-105; patient/[id].tsx:666-668).
- **Expanded alert survives Unread filter** — CONFIRMED. Filter keeps `alert.id === expandedAlertId` (alerts.tsx:42).
- **Navigate away/back — no Realtime crash** — CONFIRMED (source). Stale-channel guard removes any channel with the same topic before creating a new one (useAlerts.ts:104-106), plus duplicate-delivery guard (:122) and `isMounted` guards. Regression is genuinely fixed. Actual no-crash on device → NEEDS DEVICE CHECK.
- **Patient Detail Alerts: same expand/mark-read, no patient name** — CONFIRMED. Same pattern, comment confirms no name shown (patient/[id].tsx:660-661).

## 7. Patient Detail — Zones / Check-ins / Reports
File: [patient/[id].tsx](../app/(doctor)/patient/[id].tsx), [add-zone.tsx](../app/(doctor)/add-zone.tsx)

- **No lock icon next to name/ID** — CONFIRMED. Header shows Active/Archived + optional Flagged badges only; no lock icon (patient/[id].tsx:236-258).
- **Zones listed INLINE (no navigation)** — CONFIRMED. Zones map rendered inline in the Zones tab (:735-782).
- **Edit (pencil) opens Add/Edit Zone pre-filled** — CONFIRMED. Pushes `add-zone` with `zoneId` (:758-764); add-zone treats `zoneId` as edit mode and fetches the existing zone (add-zone.tsx:43, :68).
- **Add New Zone opens full dedicated screen** — CONFIRMED. Pushes `add-zone` without `zoneId` (patient/[id].tsx:784-797).
- **Check-ins tab: real history list (not "Coming soon")** — CONFIRMED. Renders date, risk score, mood/sleep/craving, steps (:677-725).
- **Reports: AI disclaimer under AI summary** — CONFIRMED. `AI_DISCLAIMER` when `aiSummary` present (:579-581).
- **Overview AI Analysis card: disclaimer present** — CONFIRMED (:365-367).

## 8. Reminders & Notifications (patient)
Files: [notification-preferences.tsx](../app/(patient)/notification-preferences.tsx), [checkinReminder.ts](../lib/checkinReminder.ts)

- **Toggle Daily Reminder ON → permission prompt → time picker** — CONFIRMED (source). `scheduleCheckInReminder` requests permission (checkinReminder.ts:54-61); time picker shown when enabled (notification-preferences.tsx:231-267). Actual OS prompt + picker appearance → NEEDS DEVICE CHECK.
- **Deny test → toggle snaps back OFF + inline error, nothing scheduled** — CONFIRMED (source). `scheduleCheckInReminder` returns `false` on denial (checkinReminder.ts:57-60); caller reverts `checkin_reminder_enabled` to false and sets error **before** writing the column (notification-preferences.tsx:142-149). Actual snap-back behaviour with a real denied prompt → NEEDS DEVICE CHECK.
- **Two Notification switches: instant, no Save, persist** — CONFIRMED. `handleToggle` optimistic write + revert-on-error (notification-preferences.tsx:112-126); reloaded from DB on mount (:86-105).
- **Reminder actually fires when app closed** — NEEDS DEVICE CHECK (local `DAILY` trigger; only a real device can confirm firing).

## 9. Journal & History
Files: [journal.tsx](../app/(patient)/journal.tsx), [journal/[id].tsx](../app/(patient)/journal/[id].tsx), [history.tsx](../app/(patient)/history.tsx)

- **Tap entry → real detail screen, full text + mood + date** — CONFIRMED. `journal/[id].tsx` renders un-truncated `entry.text` (:64), mood label (:54), date/time (:56); navigation wired (journal.tsx:72).
- **Only ONE add path (pen icon), no floating "+"** — CONFIRMED. Single `create-outline` pen top-right (journal.tsx:41). The other `journal-new` press (:117) is the empty-state "Write Your First Entry" button, shown only when there are no entries — not a persistent FAB. No absolutely-positioned button exists.
- **History row tap → expands, full detail + exact timestamp** — CONFIRMED. `numberOfLines` drops to `undefined` when expanded (history.tsx:198); `formatTimestamp` shown (:214).
- **Calendar icon → date picker → list filters + dismissible chip** — CONFIRMED. Picker (:103-113), date filter (:74), chip with date label (:115-124).
- **Chip ✕ clears filter** — CONFIRMED. `setSelectedDate(null)` (:117).
- **Empty day → "Nothing on this day"** — CONFIRMED. Distinct empty message keyed on `selectedDate` (:177).
- **Date filter composes with type filter** — CONFIRMED. Type filter first (`typeFiltered`), then date filter over the result (:64, :73-74) — neither overrides.

## 10. SOS button presence/absence
Files: doctor screens, patient screens

- **No SOS on any doctor screen** — CONFIRMED. Grep for `SOSButton` across `app/(doctor)/` returns nothing.
- **SOS present on patient screens** — CONFIRMED. `SOSButton` imported/rendered in home, chat, journal, history (and profile/edit-profile/notification-preferences).

## 11. Disclaimers
Files: [supportDisclaimers.ts](../lib/supportDisclaimers.ts), [chat.tsx](../app/(patient)/chat.tsx), [relapse-logged.tsx](../app/(patient)/relapse-logged.tsx)

- **Chat: greyed disclaimer above input, 1 of 5, stable per visit** — CONFIRMED. `useState(getRandomSupportDisclaimer)` picks once per mount (chat.tsx:30), rendered just above the `TextInput` row (:343 vs :350). Actually varying between visits → NEEDS DEVICE CHECK (it's uniform-random, so it *may* repeat).
- **Relapse-logged: same kind of message** — CONFIRMED. Same `useState(getRandomSupportDisclaimer)` + render (relapse-logged.tsx:15, :39).
- **Neither lists a phone number/hotline** — CONFIRMED. All 5 `SUPPORT_DISCLAIMERS` are general and number-free (supportDisclaimers.ts:9-15); specific hotlines live only in rag-chat's crisis pre-filter, not these.

## 12. Deleted/orphaned screens
- **Old auth onboarding-1/2/3 unreachable** — CONFIRMED. Files deleted from disk; zero references anywhere in `app/`, `components/`, `lib/` (excluding the unrelated `OnboardingDots` component).
- **Standalone Zones screen unreachable** — CONFIRMED. `app/(doctor)/zones.tsx` deleted; no route push/href to `(doctor)/zones` anywhere. Only reachable zone UI is the inline Patient Detail tab.

---

# Summary

**CONFIRMED:** 52 items — the large majority. Every password path, the
ownership-checked reset function, the assigned-doctor RLS fix (applied remotely),
the Realtime stale-channel guard, inline zones, check-in history, journal detail,
history date-filter composition, disclaimer content, and all deletions verify
cleanly from source.

### ⚠️ CONCERN (3) — need a human decision, not necessarily bugs
1. **§4 — "Edit Profile → Reminders & Notifications collapsed to one row here":**
   patient [edit-profile.tsx](../app/(patient)/edit-profile.tsx) has **no**
   Reminders/Notifications row at all (it's a pure Name/DOB/Phone/Email form).
   That row lives only on Profile. Doc item appears stale, or a row is missing.
2. **§5 — "gear icon next to the avatar":** doctor
   [profile.tsx](../app/(doctor)/profile.tsx) reaches Edit Profile via a
   Preferences **list row** (`create-outline`), not a gear beside the avatar.
   Functionally works; the described UI element doesn't exist.
3. **§1 — onboarding slide count:** the walkthrough now has **5** pre-avatar
   slides (3 info + 2 new Location/Step Tracking setup slides added this
   session), not 3. Doc predates the change and should be updated so the tester
   isn't surprised.

*Minor note (not counted): §6 — on the main Doctor Alerts screen, Read/Unread is
shown as meta text, not the pill badge (the pill shows the alert type). On
Patient Detail it is the pill badge. Both flip immediately; wording in the doc
implies a badge on both.*

### NEEDS DEVICE CHECK — Sa'ad's on-device focus list
Everything below is un-verifiable from source; these are exactly what to spend
device time on (skip the CONFIRMED items):
- §1 — permission-free onboarding flow renders/steps correctly on a device.
- §3 — old password actually rejected after change; doctor reset email actually
  arrives in the inbox.
- §4 / §5 — assigned-doctor **name and phone actually render** on the patient's
  card (the marquee RLS fix — confirm the query returns a row end-to-end).
- §6 — navigate away/back and background/foreground Alerts several times: no red
  error screen (Realtime regression check).
- §8 — OS permission prompt actually appears; **deny** actually snaps the toggle
  back OFF with the inline error; the daily reminder **actually fires** at the
  set time with the app closed.
- §11 — chat/relapse disclaimer **visibly changes** across visits (random, so
  observe several reloads).
