import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/hooks/useSession';
import { PassiveDataProvider } from '../../lib/context/PassiveDataContext';
import { registerBackgroundLocationTaskAsync } from '../../lib/backgroundLocationTask';
import { registerPushTokenAsync } from '../../lib/registerPushToken';

export default function PatientLayout() {
  const { session } = useSession();
  const patientId = session?.user.id;
  const router = useRouter();

  // --- First-login walkthrough gate ---
  // The ONLY place that decides whether onboarding shows. onboarding.tsx just
  // writes the flag and navigates; it never re-checks, so the two screens
  // can't bounce off each other. The redirect also fires at most once per
  // mount (the ref), so returning here from home mid-session is a no-op.
  //
  // `null` = not resolved yet. The Stack is held back until it resolves, so a
  // new patient never sees a frame of the home screen before the walkthrough.
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);
  const hasRedirectedToOnboarding = useRef(false);

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
    if (needsOnboarding && !hasRedirectedToOnboarding.current) {
      hasRedirectedToOnboarding.current = true;
      router.replace('/(patient)/onboarding');
    }
  }, [needsOnboarding, router]);

  useEffect(() => {
    if (patientId) {
      registerBackgroundLocationTaskAsync().then((granted) => {
        if (!granted)
          console.warn('Background location permission denied — zone_breaches will only log while the app is open.');
      });
    }
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
      {needsOnboarding === null ? (
        <View className="flex-1 bg-background" />
      ) : (
        <Stack screenOptions={{ headerShown: false }} />
      )}
    </PassiveDataProvider>
  );
}
