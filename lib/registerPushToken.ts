import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';

const ANDROID_CHANNEL_ID = 'default';

// Without this, Android does not reliably show a banner for a notification
// that arrives while the app is already open (foreground) — only while
// backgrounded/closed. Found missing entirely on 2026-07-21 while testing:
// switching between the patient and doctor accounts within the app (staying
// in the foreground the whole time) meant nothing ever visibly appeared,
// even though the token/delivery pipeline itself was working correctly.
// Module-level so it's set as soon as this file is imported (by the doctor
// layout), before any notification could possibly arrive.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Requests notification permission and registers this device's Expo push token
 * for the signed-in user (doctor). Graceful, non-fatal throughout (NFR8): if
 * permission is denied or anything fails, it logs a warning and returns —
 * never throws, never crashes the layout it's mounted in.
 *
 * Requires a native build — Expo push tokens are not available in Expo Go on
 * SDK 53+.
 */
export async function registerPushTokenAsync(userId: string): Promise<void> {
  try {
    // Android 8+ requires an explicit channel before notifications can be
    // posted. Default importance, default sound/vibration.
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
        name: 'Default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (status !== 'granted') {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== 'granted') {
      console.warn('Notification permission denied — high-risk alerts will not be pushed to this device.');
      return;
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      console.warn('No EAS projectId in expo config — cannot fetch push token.');
      return;
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

    const { error } = await supabase.from('push_tokens').upsert(
      {
        user_id: userId,
        expo_push_token: token,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,expo_push_token' }
    );
    if (error) console.warn('Failed to save push token:', error.message);
  } catch (e) {
    console.warn('Push token registration failed:', e instanceof Error ? e.message : String(e));
  }
}
