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

---

## EAS CLI: `secret:create` is deprecated, and `env:create`/`build:list` may fail with a generic config error

`eas secret:create` is deprecated in favour of `eas env:create` — different
flags, an `--environment` flag is now required:
```powershell
eas env:create --name KEY_NAME --value the-value --type string --visibility sensitive --environment development --environment preview --environment production --scope project
```

Separately, several `eas` commands (`env:create`, `build:list`, others)
can fail with a generic, unhelpful error:
```
node_modules\expo\bin\cli config --json exited with non-zero code: 1
Error: <command> command failed.
```
This is a known, widely-reported eas-cli bug (expo/eas-cli #3139, #3026,
#3246, #3102 on GitHub) — an internal preflight check re-invokes `expo
config --json` in a subprocess context that behaves differently from
running it directly, particularly on Windows. **Confirm it's this bug, not
a real config problem**, by running `npx expo config --json` directly — if
that succeeds cleanly, the config itself is fine and this is the CLI bug.
Workaround: use the **expo.dev web dashboard** instead of the CLI for that
operation (Project settings → Environment variables → Add variable, for
`env:create`) — the dashboard doesn't go through the same broken local
preflight.

---

## Android 15 edge-to-edge breaks `KeyboardAvoidingView` / `adjustResize` entirely

If a screen's `KeyboardAvoidingView` appears to do nothing at all when the
keyboard opens (not just imperfectly — genuinely zero effect), and the app
targets SDK 35 (`app.config.js`'s `targetSdkVersion`), this is almost
certainly the cause, not a bug in the screen's own layout code.

**Why**: Android 15 enforces edge-to-edge display for apps targeting SDK
35+. This silently breaks `android:windowSoftInputMode="adjustResize"` at
the OS level — the window no longer resizes for the keyboard at all — and
`KeyboardAvoidingView`'s automatic `behavior` prop depends on the same
broken mechanism, so it does nothing either. This is a known, current
React Native/Expo issue (see the react-native-community discussions-and-
proposals repo, discussion #827), not specific to this app.

**What does NOT reliably fix it, ruled out on-device, don't retry these
first:**
- `react-native-safe-area-context`'s `useSafeAreaInsets().bottom` — stays
  constant at the system nav-bar inset regardless of keyboard state on
  this device; does not track the keyboard at all.

**What actually works, confirmed on-device (see `app/(patient)/chat.tsx`
for the real implementation)**: the RN `Keyboard` module's
`keyboardDidShow`/`keyboardDidHide` events fire reliably with a correct
height even though the automatic resize doesn't apply itself. Track the
height in state from those events and apply it manually as `marginBottom`
on the input row, gated to Android only (`Platform.OS === 'android'`) —
keep `KeyboardAvoidingView`'s normal `behavior='padding'` for iOS, which
has no equivalent problem. Two further corrections needed once you do
this:
1. The raw keyboard height over-lifts by whatever's normally below the
   input at rest (e.g. a bottom tab bar) — measure that element's real
   height via `onLayout` and subtract it; don't hardcode a guessed pixel
   value, it'll be wrong on other devices/font scales.
2. There's still a small residual gap/overlap after that — add back the
   system nav-bar inset (`useSafeAreaInsets().bottom`, its STATIC at-rest
   value, not as a keyboard-tracking signal) to the lift calculation.

Final working formula: `Math.max(0, keyboardHeight - tabBarHeight +
insets.bottom)`.

---

## Horizontal `ScrollView` chips/pills rendering as grossly oversized capsules

If a row of small pill-shaped buttons inside a horizontal `ScrollView`
renders stretched to a huge, wrong height (far taller than the text
inside them) instead of compact chips, this is a flexbox cross-axis
default, not a styling mistake in the chip components themselves.

**Why**: a horizontal `ScrollView` with no explicit height, sitting
inside a flex-column parent chain, lets flexbox's default
`alignItems: 'stretch'` behaviour stretch each child to fill whatever
height the ScrollView ends up allocated — which can be very large if
nothing else in the layout constrains it.

**Fix**: wrap the `ScrollView` in a `View` with an explicit fixed height,
and set `alignItems: 'center'` on the `ScrollView`'s `contentContainerStyle`:
```jsx
<View style={{ height: 44 }}>
  <ScrollView horizontal contentContainerStyle={{ alignItems: 'center' }}>
    {/* chips */}
  </ScrollView>
</View>
```
Applies to any fixed-height horizontal-scroll row of chips/pills, not
just this specific screen.

---

## Google Cloud Translation API supports `mfe` (Mauritian Creole) despite not being in its own documentation

As of 2026-07-20, `docs.cloud.google.com/translate/docs/languages` does
NOT list Mauritian Creole (`mfe`) in either of its supported-language
tables, despite listing Haitian Creole (`ht`) and Seychellois Creole
(`crs`). A direct API call with `target: 'mfe'` succeeds anyway and
returns real Mauritian Creole text — confirmed via a live `translateText`
call. Google's *consumer* product (translate.google.com / the app) added
Mauritian Creole in a June 2024 announcement; the developer API evidently
supports it too, just undocumented. Don't trust the documented language
list alone if a language you need is missing from it — test the actual
API call before ruling it out.

---

## Background location crash: `IllegalArgumentException: The module wasn't created! You can't access the hosting runtime` (2026-07-21)

**Signature** (Android only): the app crashes with no user interaction at
all — confirmed happening while the app was fully backgrounded, doing
nothing. Full stack trace bottoms out in expo-location's continuous
location-callback delivery path (`LocationModule.sendLocationResponse` →
`KModuleEventEmitterWrapper.emitNative` → `Module.getRuntime`), trying to
emit a location event into a JS module instance whose native "hosting
runtime" no longer exists. Reopening the app afterward may not recover
cleanly — on the dev-client specifically, it can bounce back to the Expo
dev menu requiring the bundle server to be manually reselected; **this
recovery-step detail is a dev-client artifact, not evidence the underlying
crash itself is dev-client-specific** — don't conflate the two.

**Root cause: a known, long-standing (multi-year, cross-SDK-version)
upstream issue in Expo's native module bridge, not a defect in this app's
code.** Confirmed via `expo/expo` GitHub issue #28728 ("App crashes when
force stopped while background location task created using
expo-task-manager and expo-location is active"), reporting the identical
error class and an intermittent reproduction ("if it works fine on first
try, repeat the steps and it should crash on second or third try") —
related reports on this exact category (background location task +
Android killing/reclaiming the app process → a race in the native bridge
on relaunch) go back to at least 2019 across many Expo SDK versions, with
no clear evidence of a definitive fix landing by SDK 56 (this project's
version: `expo-location@~56.0.21`, `expo-task-manager@~56.0.22`, both
current for the SDK). This crash happens inside Expo's own native module
bootstrapping, before any of this app's JS ever runs — no amount of
try/catch inside `lib/backgroundLocationTask.ts`'s task callback can catch
it, since the callback never gets the chance to execute.

**What was fixed, and what wasn't.** A real, separate bug was found and
fixed in `lib/hooks/useZoneMonitor.ts` the same session: the *foreground*
zone watcher claimed to be "foreground-only" in its own comments but had
no code actually enforcing that against backgrounding specifically (only
against a genuine unmount, which React Native doesn't do just because the
app backgrounds) — fixed by gating the watcher's subscribe/cleanup cycle
to `AppState`, so it's genuinely torn down the moment the app backgrounds.
That fix is correct and worth keeping regardless, but it does NOT address
this crash — the stack trace here is from the *background* task's own
location delivery, a fundamentally different code path that's supposed to
keep running while backgrounded (that's its entire purpose), and Expo's
upstream bridge-reinitialisation bug applies to it independent of anything
in this app's own JS.

**Status, as of this session**: not reproduced again after 10 minutes
fully closed (consistent with the upstream reports describing this as
intermittent/probabilistic, not deterministic — not evidence it's fixed).
**Action before the demo/Phase 7**: verify behaviour on a genuine
standalone/production-profile build specifically (not just the dev-client) —
see Known-Issues.md's Open entry. Do not assume a clean run during
development testing means this won't recur.
