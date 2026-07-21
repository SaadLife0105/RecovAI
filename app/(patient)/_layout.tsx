import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useSession } from '../../lib/hooks/useSession';
import { PassiveDataProvider } from '../../lib/context/PassiveDataContext';
import { registerBackgroundLocationTaskAsync } from '../../lib/backgroundLocationTask';
import { registerPushTokenAsync } from '../../lib/registerPushToken';

export default function PatientLayout() {
  const { session } = useSession();
  const patientId = session?.user.id;
  const router = useRouter();

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
      <Stack screenOptions={{ headerShown: false }} />
    </PassiveDataProvider>
  );
}
