# RecovAI — Phase 7 Fixes: Manual Test Workflow

**⚠️ Superseded as the primary testing process (kept for reference/history).**
This doc's 12-section manual walkthrough was replaced by a faster process:
Claude Code statically re-verifies everything it can from source (see
`Phase7-Verification-Report.md`), producing a short "needs a real device"
shortlist instead of asking for all 12 sections to be tapped through by
hand. That shortlist was worked through directly in conversation and its
4 checks confirmed (2 of which surfaced real bugs — see
`Final-Edits-and-Fixes.md`'s "Post-completion additions" section for both).

This document also predates and does NOT cover: the onboarding-flash/tab-
reload/toast-styling/autocapitalize fixes, the entire patient self-service
password reset system, or the doctor-provides-email-at-creation change —
all documented in `Final-Edits-and-Fixes.md` instead. Don't use this file to
judge whether that work is tested; it isn't reflected here at all.

Everything below was verified by re-reading the actual changed files
directly, not just trusted from Claude Code's summaries — but code review
isn't the same as tapping through it on a real device. This is that pass.
Organized by user flow, not by bundle, since that's how you'll actually
walk through it. Check items off as you confirm them; if anything doesn't
match "Expect," note it and we'll fix it before Phase 7 moves on.

Suggested order: do section 1 (fresh patient) and section 2 (doctor) first,
since several later sections depend on data/state they create.


---

## 1. Fresh patient — onboarding walkthrough

Use a NEW patient account (ask the doctor account to create one, or reuse
a test patient with `onboarding_completed` manually reset to false).

- [ ] Log in as the new patient → walkthrough should launch automatically.
- [ ] Step through the 3 informational slides normally.
- [ ] **Location Tracking slide**: shows a brief explanation + a "Set It Up"
      button. Tap it. **Expect**: opens the existing Location Tracking help
      screen (the same one check-in's location tips link to). Go back —
      **Expect**: returns to this same onboarding slide, doesn't restart or
      skip ahead.
- [ ] **Step Tracking slide**: same check, but for step tracking / Health
      Connect setup.
- [ ] **Avatar picker step**: 8 circular icon options appear, one
      pre-selected by default. Tap a different one — selection changes.
- [ ] **Email step**: type a real email, tap "Get Started."
      **Expect**: walkthrough completes, lands on Home.
- [ ] Go to Profile → the avatar circle at the top should show the icon you
      picked (not initials).
- [ ] Repeat onboarding with a second fresh account, this time tap "Skip"
      partway through the avatar step without picking anything, and again on
      the email step without typing anything.
      **Expect**: still completes normally; Profile shows the first/default
      avatar option; no crash, no stuck state.

---

## 2. Fresh doctor — nothing new here, but confirm no regressions

- [ ] Log in as a doctor. Dashboard loads normally.
- [ ] **Expect**: no hamburger menu icon, no notification bell in the
      dashboard header — just the "Mission Control" title.

---

## 3. Password & account security

- [ ] **Patient Change Password**: Profile → Change Password → set a new
      password (8+ chars) → Save. Log out, log back in with the NEW
      password. **Expect**: works. (Old password should no longer work.)
- [ ] **Doctor Change Password**: same steps, doctor side.
- [ ] **Doctor Forgot Password**: on the login screen, select Doctor role,
      type a real doctor email, tap "Forgot password?" without a password
      typed. **Expect**: a message/toast confirms an email was sent (check
      the inbox if you want to go all the way — the link opens Supabase's
      own hosted reset page, not back into the app, by design).
- [ ] **Patient Forgot Password**: select Patient role, tap "Forgot
      password?". **Expect**: a message directing the patient to contact
      their doctor — no email is sent (patients don't have a real login
      inbox).
- [ ] **Doctor resets a patient's password**: open a patient's Patient
      Detail screen → "Reset Password" button → set a new password → confirm.
      **Expect**: success toast. Log in as that patient with the new
      password — works.
- [ ] **Archived-patient check**: archive a test patient, open their Patient
      Detail. **Expect**: "Reset Password" button is gone (only shows for
      active patients).

---

## 4. Patient profile & edit-profile

- [ ] Profile → **Settings list is now ONE consolidated list**: Reminders &
      Notifications, Edit Profile, Privacy & Data, Change Password, Log Out
      — in that order. No gear icon in the header anymore (removed).
- [ ] Profile → tap "Edit Profile" → change Full Name, Phone, Email, and
      Date of Birth (real date picker) → Save → go back → re-open Edit
      Profile. **Expect**: all four values persisted correctly.
- [ ] Edit Profile → no camera/photo icon anywhere.
- [ ] Edit Profile → **Expect**: this screen is now PURELY the editable
      form (Name/Phone/Email/DOB + Save) — no separate list of rows at the
      bottom. Reminders/Privacy/Change Password all live back on the main
      Profile screen only, not duplicated here.
- [ ] Profile → "Privacy & Data" → **Expect**: a real static screen
      opens (not a dead end), readable, mentions data collection and the
      Mauritius Data Protection Act.
- [ ] If your assigned doctor has set a phone number (see section 5): check
      Profile's "Assigned Doctor" card. **Expect**: doctor's name AND phone
      number both show. If the doctor hasn't set a phone, only the name
      shows — no blank line, no crash.
      **This one's worth extra attention** — a real pre-existing bug was
      found and fixed here: patients previously could never see their
      assigned doctor's name at all (always blank), due to a missing
      database permission. Confirm the name actually appears now.

---

## 5. Doctor profile & edit-profile

- [ ] Doctor Profile → **Preferences list is now**: Alert Preferences, Edit
      Profile, Change Password, Log Out — in that order. No gear icon in
      the header anymore (removed); "Edit Profile" is a normal list row now.
- [ ] Tap "Edit Profile" → set Full Name and Phone → Save → go back →
      re-open. **Expect**: both values persisted.
- [ ] Doctor Profile list → **Expect**: no "Theme" row anywhere (removed,
      dark mode was cut).
- [ ] After setting a phone here, check section 4's "Assigned Doctor card"
      step from that doctor's own patient's account — the phone should now
      appear there.

---

## 6. Alerts — both screens

Trigger at least one real alert first if you don't already have one (a
missed check-in, a zone breach, or a manually-seeded test alert).

- [ ] Doctor → Alerts tab (bottom nav). **Expect**: no bell icon in this
      screen's own header either (already on Alerts, redundant before).
- [ ] Tap an alert row. **Expect**: expands in place showing full detail
      (XAI explanation if present, full timestamp, patient name/link) — and
      the "Unread" badge should flip to "Read" immediately.
- [ ] If the alert has an AI explanation: **Expect**: a small greyed-out
      line under it reading something like "AI-generated from recorded
      patterns — not a clinical diagnosis..."
- [ ] Switch to the "Unread" filter tab while an alert is expanded.
      **Expect**: the alert you just expanded/read stays visible (doesn't
      vanish out from under you) until you collapse it.
- [ ] Navigate away from Alerts and back to it a few times in a row (or
      background/foreground the app). **Expect**: no crash, no red error
      screen. (A real Realtime-subscription crash was found and fixed here
      earlier in the session — this is the regression check for it.)
- [ ] Open a patient's Patient Detail → Alerts tab. **Expect**: same
      tap-to-expand/mark-read behavior, but no patient name shown (since
      you're already looking at that one patient).

---

## 7. Patient Detail — Zones, Check-ins, Reports tabs

- [ ] Open any patient's Patient Detail screen.
- [ ] **Expect**: no lock icon next to the patient's name/ID anymore.
- [ ] Zones tab. **Expect**: a list of existing zones shown INLINE on this
      screen (not a navigation to a separate screen).
- [ ] Tap a zone's edit (pencil) icon. **Expect**: opens the Add/Edit Zone
      screen, pre-filled with that zone's existing data (label, radius,
      classification, map pin). Change something, save, go back.
      **Expect**: the change reflects in the inline list.
- [ ] Tap "Add New Zone" from this tab. **Expect**: still opens the full
      dedicated screen with the live map (unchanged from before).
- [ ] Check-ins tab. **Expect**: a real list of that patient's check-in
      history (date, risk score, mood/sleep/cravings) — not "Coming soon."
- [ ] Reports tab → open a completed week's report. **Expect**: if it has an
      AI summary, the small AI disclaimer line appears under it.
- [ ] Overview tab → if an "AI Analysis" card is showing, confirm the same
      disclaimer line appears there too.

---

## 8. Reminders & Notifications (patient)

- [ ] Patient → Profile → Reminders & Notifications.
- [ ] Toggle "Daily Reminder" ON. **Expect**: an OS permission prompt may
      appear (if not already granted) — **allow it**. A time picker should
      appear/become visible; set a time.
- [ ] **Deny test** (do this on a second attempt, or after manually revoking
      notification permission for the app in Android Settings first, then
      returning and toggling on again): toggle "Daily Reminder" ON and
      **decline** the permission prompt. **Expect**: the toggle should
      immediately snap back OFF and show an inline error message about
      checking phone notification settings — it should NOT stay "on" with
      nothing actually scheduled.
- [ ] Toggle the two "Notifications" switches (missed check-in reminder,
      care-team messages) on/off a few times. **Expect**: instant response,
      no Save button needed, persists across leaving and returning to the
      screen.
- [ ] (Optional, needs patience) Set the daily reminder for a couple of
      minutes from now, leave the app fully closed, and confirm a
      notification actually fires at that time.

---

## 9. Journal & History

- [ ] Journal → tap an existing entry. **Expect**: opens a real detail
      screen showing the full entry text (not truncated), mood, and date —
      not a dead tap.
- [ ] Journal screen → **Expect**: only ONE way to add a new entry (the pen
      icon, top-right). No floating green "+" button anymore.
- [ ] History → tap any row. **Expect**: expands in place showing the full
      un-truncated detail and exact timestamp.
- [ ] History → tap the calendar icon (top-right). **Expect**: a date picker
      opens; pick a date. The list filters down to just that date, and a
      small dismissible chip appears showing the selected date.
- [ ] Tap the chip's "✕". **Expect**: filter clears, full list returns.
- [ ] Pick a date with genuinely nothing on it. **Expect**: a "Nothing on
      this day" message, not a blank confused-looking screen.
- [ ] Combine the date filter with one of the type filters (e.g. "Journal"
      + a specific date). **Expect**: both apply together, not one
      overriding the other.

---

## 10. SOS button — presence/absence check

- [ ] Go through several doctor screens (Dashboard, Alerts, Profile, Patient
      Detail, Add Patient, Zones tab). **Expect**: SOS button is NOT present
      on any doctor screen.
- [ ] Go through several patient screens (Home, Chat, Journal, History).
      **Expect**: SOS button IS still present, unchanged, on patient screens.

---

## 11. Disclaimers

- [ ] Patient → Chat screen. **Expect**: a small greyed-out line above the
      message input, one of 5 possible "reach out to a professional"
      messages. Reload the screen a few times (leave and come back).
      **Expect**: the message may change between visits (randomized), but
      stays the same while you're on the screen.
- [ ] Log a test relapse (or navigate to the relapse-logged screen).
      **Expect**: same kind of message appears there too.
- [ ] Confirm neither of these disclaimer messages lists a phone number or
      hotline — they should be general, not specific.

---

## 12. Deleted/orphaned screens — should be genuinely unreachable

- [ ] Confirm there's no way to reach the old 3-slide auth onboarding
      (`onboarding-1/2/3`) from anywhere in the app — the walkthrough shown
      in section 1 should be the ONLY one a new patient ever sees.
- [ ] Confirm there's no lingering way to reach a standalone "Zones" screen
      from anywhere except via Patient Detail's inline tab (the old separate
      Zones screen was deleted).

---

## If something doesn't match "Expect"

Note exactly what you saw vs. what this doc says you should see, and which
numbered step. Bring it back here rather than trying to self-diagnose — given
how much ground this covers, a quick description is usually enough for me to
go straight to the likely file.
