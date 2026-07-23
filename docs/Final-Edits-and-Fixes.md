# RecovAI — Final Edits & Fixes (Phase 7 Audit Follow-up)

Generated from a full app-wide real-vs-decorative audit (all ~26 screens,
patient + doctor + auth) conducted at the start of Phase 7, plus a follow-up
triage session deciding what gets fixed, cut, or built new. Implemented
across five bundled Claude Code sessions (2026-07-22) plus direct edits for
trivial items; every changed file was independently re-read and verified
against this list, not just against Claude Code's own summaries.

**Status: fully complete (2026-07-22) for everything originally scoped here.**
Every item below is checked off and resolved. Six bundled Claude Code
sessions total (a sixth was needed to close three items — journal/History
detail views, the patient tab bar's Check-In tab, and History's date filter
— that were agreed during triage but fell out of the original five-bundle
plan; found and fixed via this doc's own reconciliation pass, not a user
report). Every changed file across all six bundles was independently
re-read and verified directly, not just trusted from Claude Code's own
summaries. **A substantial amount of additional work happened after this
doc was marked complete — see "Post-completion additions" below, added
2026-07-22 in a later session, so this file stays the accurate record
rather than going stale.**

---

## Post-completion additions (after this doc was first marked complete)

None of this was ever a checklist item here — it's work that happened in
follow-up sessions, prompted by on-device testing and a design
reconsideration, not by anything in the original audit. Documented here so
it isn't lost, since this project's convention is that every significant
change gets tracked somewhere.

### Bug fixes from device-testing the completed bundles
- [x] **Onboarding flash** — a fresh patient briefly saw one frame of Home
      before the walkthrough redirect fired. Root cause: the onboarding gate
      in `app/(patient)/_layout.tsx` switched to rendering `<Stack />` the
      instant it decided onboarding was needed, one render before the
      redirect effect had actually run. Fixed by holding the blank screen
      until the redirect is actually issued (converted a ref to state so the
      gate re-renders at the right moment). Confirmed narrow to this one
      gate, not a systemic loading issue.
- [x] **Tapping the tab you're already on caused a full reload** — both
      `BottomTabBar.tsx` and `DoctorTabBar.tsx` called `router.push()`
      unconditionally, even when already on that tab, pushing a duplicate
      screen instance and remounting/refetching everything. Fixed in both —
      tapping the active tab is now a no-op.
- [x] **Success toasts looked like errors** — the success/error toast system
      already existed (`showToast(message, type)`), but every genuine
      success call site was omitting the type, silently defaulting to red.
      Fixed all 5 real success cases (both Change Password screens, both
      Edit Profile saves, the doctor's patient-password-reset confirmation).
- [x] **Password fields auto-capitalizing the first character** — fixed
      across all 11 password `TextInput`s in the app (both Change Password
      screens, the Reset Patient Password modal, login, register, and Add
      Patient's temporary-password fields) — all now
      `autoCapitalize="none" autoCorrect={false}`.

### Patient self-service password reset (replaces doctor-only reset for patients with an email)
Doctors resetting any patient's password unconditionally was a real privacy
concern raised directly — a doctor could reset and then log into a
patient's account, including their private journal. Rebuilt so a patient
with a real email manages their own password exactly like a doctor does,
and the doctor's override is a fallback that only exists for patients who
genuinely have no other way back in.
- [x] **Identity-email swap, not a parallel system**: setting a real
      `contact_email` (onboarding or Edit Profile) now also swaps the
      patient's actual Supabase Auth identity email to match, via a new
      `sync-patient-login-email` Edge Function (service role,
      `email_confirm: true`, no confirmation-email round-trip). Scoped so it
      can only ever change the *caller's own* identity — no patientId
      parameter exists.
- [x] **New login lookup**: migration `0020` adds
      `get_patient_login_email(p_username)` (SECURITY DEFINER, hardened
      `search_path`, `anon`-executable since login runs pre-auth) — resolves
      a username to its current real login email, or NULL. `login.tsx` uses
      it for both sign-in and "Forgot password?", falling back to the
      synthetic address on any miss/error, with a lookup failure kept
      indistinguishable from a wrong password (no probing surface).
- [x] **Real self-service reset**: a patient with a real email now gets
      `supabase.auth.resetPasswordForEmail()` — identical flow to the
      doctor's. Only patients still on the synthetic address see "ask your
      doctor."
- [x] **Doctor's reset gated server-side AND in the UI** —
      `reset-patient-password`'s Edge Function now refuses (403) if the
      target's real Auth identity email is no longer synthetic, checked via
      `admin.getUserById` (the actual boundary, not just a client-side flag).
      `patient/[id].tsx` hides the "Reset Password" button and shows an
      explanatory line instead, once that patient has a real email —
      correctly excluding archived patients from either state.
- [x] **Non-dismissible Profile banner** (patient side) prompting anyone
      without an email yet to add one, since their doctor still holds
      reset power until they do.
- [x] **One-off backfill script** (`supabase/scripts/backfill-patient-login-emails.mjs`)
      for patients who already had a `contact_email` before this change —
      run 2026-07-22, `synced=1 skipped=0 failed=0`.
- [x] **Known, accepted tradeoff, not a bug**: because login is client-side
      and needs the real email to sign in, anyone who already knows a
      patient's username can resolve their real email address through the
      lookup (not enumerate unknown usernames — NULL-on-miss prevents that
      — but a known username's email is retrievable). Inherent to this
      design, worth a mention in the dissertation's security analysis
      rather than something to fix.

### Doctor now provides the patient's email at account creation
Simplifies the above further for new patients — instead of relying on the
patient to add their own email at onboarding, the doctor enters it (twice,
confirmed) when creating the account, so the real self-service reset flow
is available from day one.
- [x] `create-patient` Edge Function: `patientEmail`/`patientEmailConfirm`
      now mandatory, server-side shape + match re-validated, used as the
      real Auth identity immediately (`email_confirm: true`, synthetic
      construction removed for new patients), mirrored onto `contact_email`
      on the same insert.
- [x] `add-patient.tsx`: two new fields, doctor must enter the same email
      twice, mirroring the existing temp-password/confirm-password
      validation pattern.
- [x] `onboarding.tsx`'s email step becomes "Confirm your email" (pre-filled,
      still editable) for patients created this way; legacy patients with no
      email keep the original blank/optional step unchanged.
- [x] **Known, accepted minor regression**: a duplicate-username collision no
      longer gets the friendly "That username is already taken" message at
      the Auth-creation step (that check now keys on email) — it still gets
      caught and rejected, just via a rawer Postgres unique-violation string
      at the `profiles` insert. Functionally correct, cosmetically worse for
      that one case; left as-is, easy one-line fix later if wanted.



## Account security — password change & recovery

- [x] **Patient Change Password**: real `supabase.auth.updateUser({ password })`,
      with length + match validation, success toast, inline error handling.
- [x] **Doctor Change Password**: same fix, mirrored exactly.
- [x] **Patient email capture, added to the first-login walkthrough**: a new
      step captures a real email into `profiles.contact_email` — confirmed
      the only "additional detail" needed was email + avatar, nothing more.
- [x] **"Forgot password?" on login.tsx**: doctors use
      `supabase.auth.resetPasswordForEmail()` off their own login-form email
      field; patients are directed to their doctor (see Edge Function below)
      since their synthetic login address has no real inbox.
- [x] New schema: `profiles.contact_email` (patient-only in practice) — a
      deliberately separate column from the synthetic Auth identity email,
      not a replacement for it.
- [x] **New, beyond original scope**: a doctor-mediated password reset path
      for patients (`reset-patient-password` Edge Function + a Patient Detail
      "Reset Password" action, gated to non-archived patients only), since
      patients can't receive a real reset email at all.

---

## Alerts

- [x] **Mark-as-read, doctor Alerts screen**: `markAlertRead()` +
      `useAlerts()`'s new `markRead` helper — fires the moment an alert is
      expanded, optimistic with no rollback (a failed write just resets to
      unread on next fetch, documented as an accepted tradeoff).
- [x] **Alert rows become tappable/expandable**: accordion pattern (same
      shape as the Reports screen's weekly cards) on both the global Alerts
      screen and Patient Detail's Alerts tab, the latter correctly omitting
      the patient name/link since it's already patient-scoped. The global
      screen's "Unread" filter tab was found to have a real edge case (an
      alert vanishing mid-tap the instant it's expanded) and fixed with a
      guard keeping the currently-expanded alert visible until collapsed.
- [x] **Doctor dashboard bell**: removed, along with the also-dead hamburger
      menu icon.
- [x] **Doctor Alerts screen's own header bell**: removed.
- [x] **Patient home screen bell**: removed from both header branches.

---

## Patient edit-profile (full rebuild)

- [x] Full Name, Phone, Email (reusing `contact_email`) all persist for real.
- [x] Date of Birth: real `DateTimePicker` (`mode="date"`), persisted to a
      new `profiles.date_of_birth` column.
- [x] Save button persists everything, with a proper async-hydration guard
      (mirroring `edit-note.tsx`'s existing pattern) so it can never overwrite
      real data with a blank first-render value.
- [x] **Photo upload — cut**, exactly as decided. Camera icon removed.
- [x] "Privacy & Data" now routes to a genuine static info screen
      (`app/(patient)/privacy-info.tsx`) — data-minimisation framing, citing
      the Mauritius Data Protection Act 2017, matching the app's established
      RLS boundaries accurately (journal patient-only, chat not shown to
      doctor as a transcript, etc.).

---

## Doctor profile (rebuild + new features)

- [x] New doctor edit-profile screen — Name + Phone, gear icon now wired.
- [x] **Doctor phone number** — new shared `profiles.phone` column (same
      column used by both roles), surfaced on the patient's own profile
      screen under the Assigned Doctor card, only when set.
- [x] Dead "Theme: Light" row removed from the doctor profile screen (the
      patient side never had one — confirmed, no action needed there).

---

## Dark theme — cut (2026-07-22), not deferred

Decided against building this at all, not postponed. Discussed the actual
scope during Bundle 3 planning: because this app uses both Tailwind/NativeWind
classNames (`bg-background`, `bg-card`, etc.) AND raw JS color values
(`style={{ backgroundColor: colors.X }}`) sourced from the same tokens, a
real theme swap needs a reactive "current theme" mechanism touching most of
the ~26 screens' className strings, not just the shared color constants —
a genuinely large, open-ended refactor for what was meant to be "just a
basic color swap." Also surfaced during planning: several pale *Bg tint
tokens (riskHighBg, riskMediumBg, etc.) would need their own dark-appropriate
equivalents too, or they'd render as washed-out, visibly broken rectangles
on a dark background — meaning "keep everything else exactly the same"
wasn't actually achievable as cheaply as it first sounded. Given Phase 7's
timeline, cut entirely rather than half-built. Worth a one-line mention in
the dissertation's Future Work section if useful, in the same spirit as the
other documented scope boundaries in Development Plan.md.

---

## Cut entirely (remove, don't build)

- [x] Chat's paperclip/attach icon — removed.
- [x] Doctor-side SOS button — removed from all 11 doctor screens, verified
      by a full codebase sweep (confirmed zero remaining `SOSButton`
      references anywhere under `app/(doctor)`; one genuinely pre-existing,
      unrelated bug was found and fixed along the way — `edit-note.tsx` had
      a render call with no import, a latent crash predating this cleanup).
- [x] `permissions.tsx` copy fix — "Allow All" → "Continue" plus adjusted
      description text.

---

## Delete orphaned code

- [x] Deleted `app/(auth)/onboarding-1.tsx`, `onboarding-2.tsx`,
      `onboarding-3.tsx` — confirmed unreachable, grep-verified after
      deletion.
- [x] **Also deleted, found orphaned later**: `app/(doctor)/zones.tsx`,
      once Bundle 4 moved the Zones tab inline into Patient Detail and left
      it with no remaining entry point. A stale code comment in
      `lib/mockData.ts` naming the deleted file was also corrected.

---

## Trivial fixes

- [x] `journal-new.tsx`'s hardcoded "May 24, 2025" replaced with the real
      current date, matching `check-in.tsx`'s existing formatting convention.

---

## ✅ Closed in Bundle 6 (2026-07-22) — the three items missed above

- [x] **Minimal detail views**: journal entries get a real read-only detail
      screen (`app/(patient)/journal/[id].tsx`, full un-truncated text);
      History rows get inline accordion expansion (reusing Bundle 4's alert
      pattern) rather than four separate screens, since `useActivityFeed()`'s
      per-item data was already fully surfaced in the summary row — expansion
      un-truncates the subtitle and adds the exact full timestamp.
- [x] **Patient tab bar — Check-In tab removed.** One wrong assumption
      corrected in the process: the tab bar was never rendered on
      check-in.tsx itself (it has none) — the now-invalid `active="checkin"`
      prop actually lived on three post-check-in screens
      (checkin-success.tsx, missed-checkin.tsx, relapse-logged.tsx), all
      fixed. `active` is now optional so these terminal flow screens render
      the bar with nothing highlighted, rather than misleadingly lighting up
      Home.
- [x] **History's calendar icon → real jump-to-a-date filter.** Composes
      with the existing type filter rather than overriding it; a dismissible
      chip clears the date filter; distinct "Nothing on this day" vs.
      "Nothing matches this filter" messaging depending on which filter(s)
      are active.

---

## Disclaimers — added and closed 2026-07-22, not part of the original audit

Two distinct kinds, kept deliberately separate since they serve different
purposes and read differently:

- [x] **Professional-help nudge (patient-facing, randomized across 5
      messages)**: `lib/supportDisclaimers.ts`. Live on chat.tsx (above the
      message input) and relapse-logged.tsx (below the streak card). One
      pick per screen mount via `useState(getRandomSupportDisclaimer)`, not
      re-randomized per render. checkin-success.tsx placement was correctly
      SKIPPED — that screen is purely celebratory and patients are never
      shown their own risk level anywhere in this app (only doctors see risk
      scores), so there was no elevated-risk state to attach it to. No
      hotline numbers in any of the 5 messages — deliberately left to
      rag-chat's existing active crisis pre-filter, verified for no overlap
      or contradiction.
- [x] **Epistemic-honesty disclaimer (doctor-facing, fixed single line, not
      randomized)**: `AI_DISCLAIMER` constant, same file. Four sites, all
      correctly gated on the underlying AI text actually being present
      (verified directly) so it never appears next to a "no explanation was
      generated" fallback: `app/(doctor)/alerts.tsx`'s XAI text, and three
      spots on Patient Detail — the Overview "AI Analysis" card, the
      Reports-tab AI Summary, and the Alerts-tab XAI accordion.

---

## Documentation drift (docs only, no app code)

- [x] Development Plan.md's Phase 3.3 scope note corrected — only
      Check-ins/Alerts remained a real gap at the time, and both are now
      built (Bundle 4), so this note is now fully resolved rather than
      partially.
- [x] Development Plan.md's Phase 6 Reports description corrected to match
      the 2026-07-22 rework (live snapshot cards, no picker step).

---

## Carried over from Known-Issues.md (still open, tracked there — not part of this file's scope)

- [ ] One-check-in-per-day UI enforcement decision — still undecided.
- [ ] Background-location crash — still needs standalone-build verification
      before the demo.
- [ ] Offline check-in queue — still waiting on the bundled EAS build.
- [ ] **New, added 2026-07-22**: check-in reminder can go silently stale if
      notification permission is revoked later via OS Settings (not at
      first-enable, which is already handled) — see Known-Issues.md's Open
      section for the full account.
