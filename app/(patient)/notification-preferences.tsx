import { useEffect, useState } from 'react';
import { View, Text, Pressable, Switch, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '../../constants/theme';
import { SOSButton } from '../../components/sos/SOSButton';
import { BottomTabBar } from '../../components/navigation/BottomTabBar';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/hooks/useSession';
import { scheduleCheckInReminder, cancelCheckInReminder } from '../../lib/checkinReminder';

// `column` is the profiles column each toggle writes — the same columns the
// two Edge Functions read before sending their push.
const TOGGLES = [
  {
    column: 'notify_patient_missed_checkin',
    title: 'Missed check-in nudge',
    description: "A gentle reminder in the evening if the day's check-in is still missing.",
  },
  {
    column: 'notify_patient_agent_message',
    title: 'Messages from RecovAI',
    description: 'Get notified when RecovAI sends you a supportive message.',
  },
] as const;

type ToggleColumn = (typeof TOGGLES)[number]['column'];

interface Prefs {
  checkin_reminder_enabled: boolean;
  checkin_reminder_time: string; // "HH:mm", 24-hour
  notify_patient_missed_checkin: boolean;
  notify_patient_agent_message: boolean;
}

/** "HH:mm" → a Date carrying only that time, for DateTimePicker's value prop. */
function timeStringToDate(time: string): Date {
  const [hour, minute] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(Number.isFinite(hour) ? hour : 20, Number.isFinite(minute) ? minute : 0, 0, 0);
  return date;
}

function dateToTimeString(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** "20:00" → "8:00 PM", for display only — the stored value stays 24-hour. */
function formatTimeLabel(time: string): string {
  const [hour, minute] = time.split(':').map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return time;
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${String(minute).padStart(2, '0')} ${period}`;
}

/**
 * Patient Notification Preferences. Instant-apply (no Save button), same
 * interaction pattern as the doctor's alert-preferences.tsx: each control
 * writes its own profiles column immediately, optimistically, and reverts on
 * failure.
 *
 * Two deliberately separate sections, because they are two different
 * mechanisms: the Daily Reminder is scheduled LOCALLY on this device and
 * fires proactively at a chosen time; the Notifications toggles gate
 * SERVER-SENT pushes that only fire reactively when something has already
 * happened. Muting either only silences the notification — the missed-check-in
 * alert row still reaches the doctor, and the agent's message still lands in
 * the patient's chat.
 */
export default function NotificationPreferences() {
  const router = useRouter();
  const { session } = useSession();
  const patientId = session?.user.id;

  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!patientId) return;
    let isMounted = true;

    supabase
      .from('profiles')
      .select(
        'checkin_reminder_enabled, checkin_reminder_time, notify_patient_missed_checkin, notify_patient_agent_message'
      )
      .eq('id', patientId)
      .single()
      .then(({ data, error: loadError }) => {
        if (!isMounted) return;
        if (loadError || !data) {
          setError("Couldn't load your preferences");
          return;
        }
        setPrefs({
          checkin_reminder_enabled: data.checkin_reminder_enabled,
          checkin_reminder_time: data.checkin_reminder_time,
          notify_patient_missed_checkin: data.notify_patient_missed_checkin,
          notify_patient_agent_message: data.notify_patient_agent_message,
        });
      });

    return () => {
      isMounted = false;
    };
  }, [patientId]);

  const handleToggle = async (column: ToggleColumn, value: boolean) => {
    if (!patientId || !prefs) return;
    setError(null);
    setPrefs({ ...prefs, [column]: value });

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ [column]: value })
      .eq('id', patientId);

    if (updateError) {
      setPrefs((prev) => (prev ? { ...prev, [column]: !value } : prev));
      setError("Couldn't save that change — check your connection and try again");
    }
  };

  // The reminder toggle does two things that must agree: persist the column,
  // and actually schedule/cancel the local notification. Neither is allowed to
  // succeed alone — if the write fails the schedule is undone, and if the
  // schedule fails the write never happens.
  const handleReminderToggle = async (value: boolean) => {
    if (!patientId || !prefs) return;
    setError(null);
    setPrefs({ ...prefs, checkin_reminder_enabled: value });

    if (value) {
      // Scheduling is the part that can be refused by the OS. Persisting
      // "enabled" when nothing was actually scheduled would leave the switch
      // showing on, the preference reading on, and no reminder ever arriving —
      // so this bails out before the write rather than after it.
      const scheduled = await scheduleCheckInReminder(prefs.checkin_reminder_time);
      if (!scheduled) {
        setPrefs((prev) => (prev ? { ...prev, checkin_reminder_enabled: false } : prev));
        setError(
          "Couldn't turn on reminders — check that notifications are allowed for RecovAI in your phone's settings, then try again"
        );
        return;
      }
    } else {
      await cancelCheckInReminder();
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ checkin_reminder_enabled: value })
      .eq('id', patientId);

    if (updateError) {
      setPrefs((prev) => (prev ? { ...prev, checkin_reminder_enabled: !value } : prev));
      if (value) {
        await cancelCheckInReminder();
      } else {
        await scheduleCheckInReminder(prefs.checkin_reminder_time);
      }
      setError("Couldn't save that change — check your connection and try again");
    }
  };

  const handleTimeChange = async (time: string) => {
    if (!patientId || !prefs) return;
    const previousTime = prefs.checkin_reminder_time;
    setError(null);
    setPrefs({ ...prefs, checkin_reminder_time: time });

    if (prefs.checkin_reminder_enabled) {
      await scheduleCheckInReminder(time);
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ checkin_reminder_time: time })
      .eq('id', patientId);

    if (updateError) {
      setPrefs((prev) => (prev ? { ...prev, checkin_reminder_time: previousTime } : prev));
      if (prefs.checkin_reminder_enabled) await scheduleCheckInReminder(previousTime);
      setError("Couldn't save that change — check your connection and try again");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1">
        <ScrollView contentContainerClassName="px-5 pb-10" showsVerticalScrollIndicator={false}>
          <View className="mt-2 flex-row items-center">
            <Pressable onPress={() => router.back()} accessibilityLabel="Go back" hitSlop={8} className="mr-2 h-9 w-9 items-center justify-center">
              <Ionicons name="chevron-back" size={24} color={colors.textDark} />
            </Pressable>
            <Text className="text-xl font-bold text-text-dark">Reminders & Notifications</Text>
          </View>

          {error ? (
            <Text className="mt-3 text-xs" style={{ color: colors.riskHighText }}>
              {error}
            </Text>
          ) : null}

          {prefs === null ? (
            <Text className="mt-4 text-sm text-text-muted">Loading your preferences…</Text>
          ) : (
            <>
              <Text className="mb-1 mt-6 text-sm font-semibold text-text-dark">Daily Reminder</Text>
              <Text className="mb-3 text-xs text-text-muted">
                A reminder from your own device at a time you choose, whether or not you&apos;ve checked in.
              </Text>

              <View className="flex-row items-center rounded-2xl bg-card p-4">
                <View className="flex-1 pr-3">
                  <Text className="text-sm font-semibold text-text-dark">Remind me to check in</Text>
                  <Text className="mt-0.5 text-xs text-text-muted">Every day, at the time set below.</Text>
                </View>
                <Switch
                  value={prefs.checkin_reminder_enabled}
                  onValueChange={handleReminderToggle}
                  trackColor={{ false: colors.divider, true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {prefs.checkin_reminder_enabled ? (
                <>
                  <Pressable
                    onPress={() => setShowTimePicker(true)}
                    className="mt-3 flex-row items-center justify-between rounded-2xl bg-card p-4"
                  >
                    <View>
                      <Text className="text-sm font-semibold text-text-dark">Reminder time</Text>
                      <Text className="mt-0.5 text-xs text-text-muted">Tap to change</Text>
                    </View>
                    <View className="flex-row items-center">
                      <Text className="mr-2 text-sm font-semibold" style={{ color: colors.primary }}>
                        {formatTimeLabel(prefs.checkin_reminder_time)}
                      </Text>
                      <Ionicons name="time-outline" size={18} color={colors.textMuted} />
                    </View>
                  </Pressable>

                  {showTimePicker && (
                    <DateTimePicker
                      value={timeStringToDate(prefs.checkin_reminder_time)}
                      mode="time"
                      // Android shows a modal clock dialog that dismisses
                      // itself; iOS renders inline and stays up, so it is
                      // closed explicitly there once a value is picked.
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={(event, selected) => {
                        setShowTimePicker(false);
                        // Android reports a cancelled dialog as event.type
                        // 'dismissed' and still passes the unchanged date —
                        // writing on that would persist a "change" the patient
                        // explicitly backed out of.
                        if (event.type === 'dismissed' || !selected) return;
                        handleTimeChange(dateToTimeString(selected));
                      }}
                    />
                  )}
                </>
              ) : null}

              <Text className="mb-1 mt-8 text-sm font-semibold text-text-dark">Notifications</Text>
              <Text className="mb-3 text-xs text-text-muted">
                Notifications RecovAI sends you when something has already happened. Turning one off silences the
                notification only — your check-in history and your messages are unaffected.
              </Text>

              {TOGGLES.map((toggle) => (
                <View key={toggle.column} className="mb-3 flex-row items-center rounded-2xl bg-card p-4">
                  <View className="flex-1 pr-3">
                    <Text className="text-sm font-semibold text-text-dark">{toggle.title}</Text>
                    <Text className="mt-0.5 text-xs text-text-muted">{toggle.description}</Text>
                  </View>
                  <Switch
                    value={prefs[toggle.column]}
                    onValueChange={(value) => handleToggle(toggle.column, value)}
                    trackColor={{ false: colors.divider, true: colors.primary }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              ))}
            </>
          )}
        </ScrollView>

        <SOSButton />

        <BottomTabBar active="profile" />
      </View>
    </SafeAreaView>
  );
}
