import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/hooks/useSession';
import { PassiveDataProvider } from '../../lib/context/PassiveDataContext';
import { registerBackgroundLocationTaskAsync } from '../../lib/backgroundLocationTask';
import { registerPushTokenAsync } from '../../lib/registerPushToken';
import { scheduleCheckInReminder, cancelCheckInReminder } from '../../lib/checkinReminder';

export default function PatientLayout() {
  const { session } = useSession();
  const patientId = session?.user.id;
  const router = useRouter();

  // --- First-login walkthrough gate ---
  // The ONLY place that decides whether onboarding shows. onboarding.tsx just
  // writes the flag and navigates; it never re-checks, so the two screens
  // can't bounce off each other.
  //
  // `null` = not resolved yet. The Stack is held back until it resolves AND,
  // if onboarding is needed, until the redirect has actually been issued —
  // switching to <Stack /> the instant needsOnboarding flips to true (before
  // the redirect effect below has run) would show one frame of whatever
  // route was originally requested (e.g. Home) before replace() fires. Found
  // 2026-07-22 as a real, visible flash on login. `hasRedirected` is state,
  // not a ref, specifically so setting it re-renders and this gate re-checks
  // before Stack ever mounts on the wrong route.
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    if (!patientId) return;

    let isMounted = true;
    supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', patientId)
      .single()
      .then(({ data }) => {
        // On a failed read, treat them as onboarded — a transient network
        // error shouldn't push an existing patient into the walkthrough.
        if (isMounted) setNeedsOnboarding(data?.onboarding_completed === false);
      });

    return () => {
      isMounted = false;
    };
  }, [patientId]);

  useEffect(() => {
    if (needsOnboarding && !hasRedirected) {
      setHasRedirected(true);
      router.replace('/(patient)/onboarding');
    }
  }, [needsOnboarding, hasRedirected, router]);

  useEffect(() => {
    if (patientId) {
      registerBackgroundLocationTaskAsync().then((result) => {
        // Two genuinely different reasons this can fail — found 2026-07-22
        // when a device log showed "permission denied" right after a run
        // where permission was almost certainly granted; the real cause was
        // a transient Android foreground-service-start rejection, which the
        // old boolean return couldn't distinguish from a real permission
        // denial. Each reason now gets its own accurate message.
        if (result.started) return;
        if (result.reason === 'permission_denied') {
          console.warn('Background location permission denied — zone_breaches will only log while the app is open.');
        } else {
          console.warn(
            'Background location monitoring did not start this session (the OS refused to start the foreground service — a known, intermittent Android restriction, see BUILD_TROUBLESHOOTING.md). Not a permission issue; zone_breaches will still log while the app is open.'
          );
        }
      });
    }
  }, [patientId]);

  // --- Re-apply the daily check-in reminder on launch ---
  // Scheduled local notifications do NOT survive a reinstall (and can be lost
  // when the OS clears app data), so the stored preference is the source of
  // truth and the schedule is re-derived from it every launch. Cheap and
  // idempotent: scheduleCheckInReminder cancels the previous one first, so
  // this can never stack duplicates.
  //
  // The `false` branch is not redundant — it repairs the case where the
  // toggle was turned off on another device (or the write succeeded while the
  // local cancel didn't), which would otherwise leave this device firing a
  // reminder the patient has already switched off.
  useEffect(() => {
    if (!patientId) return;

    let isMounted = true;
    supabase
      .from('profiles')
      .select('checkin_reminder_enabled, checkin_reminder_time')
      .eq('id', patientId)
      .single()
      .then(({ data, error }) => {
        if (!isMounted || error || !data) return;
        if (data.checkin_reminder_enabled) {
          scheduleCheckInReminder(data.checkin_reminder_time);
        } else {
          cancelCheckInReminder();
        }
      });

    return () => {
      isMounted = false;
    };
  }, [patientId]);

  // Same pattern as the doctor layout — patients need a token too, so the
  // agent's send_patient_message can push a "you have a new message" nudge
  // rather than relying on them happening to open the app.
  useEffect(() => {
    if (patientId) registerPushTokenAsync(patientId);
  }, [patientId]);

  // --- Notification taps → open the conversation the agent messaged into ---
  // The payload comes from risk-agent's send_patient_message push step
  // (data: { conversationId }). Navigating with that param reuses chat.tsx's
  // existing "load this specific conversation" behaviour — the same route
  // chat-history.tsx already uses. Nothing in chat.tsx changes.
  //
  // Deduped by the notification's own request identifier: on a cold start the
  // launching tap is reachable BOTH through getLastNotificationResponseAsync()
  // and, depending on how early the listener attaches, through the listener
  // itself. Whichever arrives first wins; the second is ignored, so a single
  // tap can never push the chat screen twice.
  const handledResponseIds = useRef(new Set<string>());

  const openConversationFrom = useCallback(
    (response: Notifications.NotificationResponse | null) => {
      if (!response) return;

      const responseId = response.notification.request.identifier;
      if (handledResponseIds.current.has(responseId)) return;

      // Anything that isn't a payload we recognise — a future notification
      // type, or a malformed one — is a silent no-op, never a crash.
      const conversationId = response.notification.request.content.data?.conversationId;
      if (typeof conversationId !== 'string' || !conversationId) return;

      handledResponseIds.current.add(responseId);
      router.push({ pathname: '/(patient)/chat', params: { conversationId } });
    },
    [router]
  );

  useEffect(() => {
    if (!patientId) return;

    // Cold start: the tap that launched the app.
    let isMounted = true;
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (isMounted) openConversationFrom(response);
      })
      .catch((e) => console.warn('Could not read the launching notification response:', e));

    // Warm tap: app already running when the notification was tapped.
    const subscription = Notifications.addNotificationResponseReceivedListener(openConversationFrom);

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, [patientId, openConversationFrom]);

  return (
    <PassiveDataProvider patientId={patientId}>
      {needsOnboarding === null || (needsOnboarding === true && !hasRedirected) ? (
        <View className="flex-1 bg-background" />
      ) : (
        <Stack screenOptions={{ headerShown: false }} />
      )}
    </PassiveDataProvider>
  );
}
