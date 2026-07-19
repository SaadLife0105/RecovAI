# Build Troubleshooting — Quick Reference

Practical, scannable reference for when a build breaks. Not narrative — see
`Development Plan.md`'s Dissertation Alignment Check for the full story of
how each of these was found, if you want that for the dissertation.

---

## Before spending an EAS build — run these first, in order

Every one of these is free. Don't skip to `eas build` without them.

```powershell
npx expo-doctor
npx expo install --check
npx tsc --noEmit
npm test
```

**Then, the one that actually matters most**: verify your lockfile is
genuinely in sync using the *exact* command EAS runs in the cloud — not
`npm install`, which has repeatedly reported false success on this project
even when the lockfile was actually broken.

```powershell
npm ci --include=dev
```

If this fails with `EUSAGE` / "can only install when package.json and
package-lock.json are in sync," your lockfile is desynced. Fix with a full
clean reinstall (see below), **do not** just run `npm install` again and
trust its own success message — it has lied about this before.

---

## Full clean reinstall (when the lockfile is suspect)

Run in PowerShell, not `cmd`:

```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm install
```

**Let it finish completely on its own** — even if it looks stuck for
several minutes with no output, don't touch the terminal. Interrupting a
mid-install `npm` process (e.g. with Ctrl+C) can leave `node_modules` and
the lockfile in a half-written state that looks fine but isn't.

After it finishes, verify with `npm ci --include=dev` (above) before doing
anything else.

---

## Known fixes already in this project — don't accidentally revert these

### `package.json` → `overrides`
```json
"overrides": {
  "react-native-worklets": "^0.11.0"
}
```
Forces a single resolved version of `react-native-worklets` (pulled in
transitively via `expo-router` → `@expo/ui` → `react-native-reanimated` —
this app never uses worklets/reanimated directly). Without this, npm can
resolve two different worklets versions simultaneously to satisfy
conflicting peer ranges, which **builds successfully** but **crashes on
every launch** with a native JSI assertion (`"isObject()" failed` in
`libworklets.so`, thread `mqt_v_js`, no error screen, no logcat during
JS execution — just the app closing).

If you ever bump `react-native-reanimated`'s version, check its own
`node_modules/react-native-reanimated/compatibility.json` for the
supported worklets range for that version, and update this override to
match — don't just delete it.

### `metro.config.js` → `inlineRequires`
```js
config.transformer.getTransformOptions = async () => ({
  transform: {
    inlineRequires: true,
  },
});
```
Expo disables Metro's `inlineRequires` by default, which breaks
`react-native-worklets`' native initialization pipeline on Android — same
crash symptom as above (`WorkletsModule::startCpp()` → `installUnpackers`
→ JSI assertion failure), but this one persists **even with the correct
single worklets version resolved**. Confirmed via
`react-native-worklets`' own troubleshooting docs:
https://docs.swmansion.com/react-native-worklets/docs/guides/troubleshooting/
and https://github.com/software-mansion/react-native-reanimated/issues/9445

This is a pure Metro/JS-bundling fix — if it's ever missing, a plain
`npx expo start -c` (no EAS build) is enough to test whether it's the
cause.

---

## If the app crashes on launch with no error screen at all

This is the signature of a **native crash** (not a JS error) — the process
dies before or during startup, so nothing gets a chance to log to the
Metro/`npx expo start` terminal. You need the actual OS-level crash trace.

**If `adb` works:**
```powershell
adb logcat -c
adb logcat > crash_log.txt
```
Reproduce the crash, then Ctrl+C. Search the file for `Fatal signal` and
`Abort message` — that'll show the actual native library and assertion
that failed, not just "app closed."

**If `adb` is being uncooperative** (USB debugging authorization issues,
device shows "offline" or won't prompt) — don't burn time on it. Use
Android's own on-device bug report instead, no cable needed:
1. Settings → Developer Options → **Bug report** → Full report.
   (Samsung shortcut: dial `*#9900#` for the built-in debug tool.)
2. Share the resulting zip to yourself (email/Drive), get it onto your
   laptop.
3. It's a zip — the `dumpstate.txt` inside contains the same crash trace
   `adb logcat` would have given you (search the same way, for `Fatal
   signal` / `Abort message`).

This is exactly how the worklets `inlineRequires` bug above was actually
found, when `adb` wasn't cooperating.

---

## Supabase migration history gets out of sync ("already exists" errors)

If `npx supabase db push` fails with something like:
```
ERROR: policy "..." for table "..." already exists (SQLSTATE 42710)
```
this usually means a migration was applied to the remote database by hand
at some point (e.g. during live RLS testing) without Supabase's own
tracking table knowing about it. Check what's actually out of sync:
```powershell
npx supabase migration list
```
This shows a Local/Remote column comparison. If a migration shows up on
Remote's own database state but blank in the tracking column, repair the
*bookkeeping only* (this does **not** re-run any SQL):
```powershell
npx supabase migration repair --status applied <version>
```
Then `npx supabase db push` again — it should now only apply what's
genuinely new.

---

## GPS / zone-radius accuracy note

If you ever lower the minimum zone radius further, or the zone-monitoring
watchers (`lib/hooks/useZoneMonitor.ts`, `lib/backgroundLocationTask.ts`)
seem unreliable at detecting entry/exit, check the `Location.Accuracy`
setting in both files first. `Balanced` targets ~100m (Android's own
"city block" tier, often WiFi/cell-based rather than GPS) — a zone radius
smaller than that target will be smaller than the position noise itself.
Both watchers are currently set to `High` (~10m, actually uses GPS) with
an accuracy-aware safeguard (skips the in/out check entirely if the
device's own reported accuracy is looser than the zone's radius) — don't
remove either half of that pairing independently.
