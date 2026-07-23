import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * The patient's daily check-in reminder.
 *
 * A LOCAL notification, not a push: expo-notifications schedules it on the
 * device with a repeating daily trigger and the OS fires it at the chosen time
 * whether or not the app is running and with no server involved. This is a
 * deliberately different mechanism from the missed-check-in push, which is a
 * server-side cron that only fires reactively, after a day has already gone by
 * with no check-in. This one is proactive and never knows whether they have
 * checked in — hence the gentle, non-accusatory copy.
 */

const REMINDER_ID_KEY = 'checkinReminderNotificationId';

/** "HH:mm" → { hour, minute }. Returns null for anything unparseable. */
function parseTime(time: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  return { hour, minute };
}

/**
 * Schedule (or reschedule) the daily reminder at `time` ("HH:mm", 24-hour).
 *
 * Always cancels the previous one first — rescheduling on every change and on
 * every app launch would otherwise stack duplicate notifications firing at
 * different times.
 *
 * Returns whether a reminder is actually scheduled now. Callers must not
 * persist "reminders on" off the back of a `false` — declining the OS
 * permission prompt is the common case, and a toggle left showing "on" with
 * nothing scheduled behind it is a silent lie to the patient.
 */
export async function scheduleCheckInReminder(time: string): Promise<boolean> {
  const parsed = parseTime(time);
  if (!parsed) {
    console.warn(`Check-in reminder not scheduled: "${time}" is not a valid HH:mm time.`);
    return false;
  }

  await cancelCheckInReminder();

  // Local notifications still need notification permission on both platforms.
  // Ask rather than assume: the patient may have declined at push-registration
  // time, or never been asked on this install.
  const { granted } = await Notifications.getPermissionsAsync();
  if (!granted) {
    const request = await Notifications.requestPermissionsAsync();
    if (!request.granted) {
      console.warn('Check-in reminder not scheduled: notification permission was not granted.');
      return false;
    }
  }

  try {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'RecovAI',
        // No risk score, no streak, no "you missed yesterday" — this fires on
        // a possibly-locked screen and has no idea what kind of day they're
        // having (Critical Caution #10 and #23, same discipline as every
        // other notification body in this app).
        body: "Time for today's check-in whenever you're ready.",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: parsed.hour,
        minute: parsed.minute,
      },
    });

    await AsyncStorage.setItem(REMINDER_ID_KEY, identifier);
    return true;
  } catch (e) {
    console.warn(`Could not schedule the check-in reminder: ${e instanceof Error ? e.message : String(e)}`);
    return false;
  }
}

/**
 * Cancel the daily reminder, if one is scheduled.
 *
 * Targets the stored identifier specifically rather than calling
 * cancelAllScheduledNotificationsAsync() — nothing else in this app schedules
 * a local notification today, but a blanket cancel would silently start
 * destroying anything that ever does.
 */
export async function cancelCheckInReminder(): Promise<void> {
  try {
    const identifier = await AsyncStorage.getItem(REMINDER_ID_KEY);
    if (!identifier) return;

    await Notifications.cancelScheduledNotificationAsync(identifier);
    await AsyncStorage.removeItem(REMINDER_ID_KEY);
  } catch (e) {
    console.warn(`Could not cancel the check-in reminder: ${e instanceof Error ? e.message : String(e)}`);
  }
}
