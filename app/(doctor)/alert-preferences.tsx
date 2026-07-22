import { useEffect, useState } from 'react';
import { View, Text, Pressable, Switch, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { SOSButton } from '../../components/sos/SOSButton';
import { DoctorTabBar } from '../../components/navigation/DoctorTabBar';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/hooks/useSession';

// `column` is the profiles column each toggle writes — the same columns
// _shared/doctorAlert.ts reads before sending a push.
const TOGGLES = [
  {
    column: 'notify_high_risk',
    title: 'High risk alerts',
    description: 'Get notified when a patient reaches high risk.',
  },
  {
    column: 'notify_missed_checkin',
    title: 'Missed check-in alerts',
    description: 'Get notified when a patient misses check-in for 1+ day.',
  },
  {
    column: 'notify_zone_breach',
    title: 'Zone breach alerts',
    description: 'Get notified when a patient enters a risk zone.',
  },
  {
    column: 'notify_predicted_high_risk',
    title: 'Predicted high risk alerts',
    description: 'Get notified about predicted high risk in next 24h.',
  },
] as const;

type PrefColumn = (typeof TOGGLES)[number]['column'];

/** Screen 15b — Alert Preferences. Instant-apply toggles (no Save button):
 *  each switch writes its own profiles column immediately. Enforced at push
 *  time in _shared/doctorAlert.ts — muting stops the push, never the alert
 *  row itself. */
export default function AlertPreferences() {
  const router = useRouter();
  const { session } = useSession();
  const doctorId = session?.user.id;

  const [enabled, setEnabled] = useState<Record<PrefColumn, boolean> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!doctorId) return;
    let isMounted = true;

    supabase
      .from('profiles')
      .select('notify_high_risk, notify_missed_checkin, notify_zone_breach, notify_predicted_high_risk')
      .eq('id', doctorId)
      .single()
      .then(({ data, error: loadError }) => {
        if (!isMounted) return;
        if (loadError || !data) {
          setError("Couldn't load your preferences");
          return;
        }
        setEnabled({
          notify_high_risk: data.notify_high_risk,
          notify_missed_checkin: data.notify_missed_checkin,
          notify_zone_breach: data.notify_zone_breach,
          notify_predicted_high_risk: data.notify_predicted_high_risk,
        });
      });

    return () => {
      isMounted = false;
    };
  }, [doctorId]);

  const handleToggle = async (column: PrefColumn, value: boolean) => {
    if (!doctorId || !enabled) return;
    setError(null);
    // Optimistic — the switch should feel instant; reverted below if the
    // write fails, so the UI never claims a preference that isn't stored.
    setEnabled({ ...enabled, [column]: value });

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ [column]: value })
      .eq('id', doctorId);

    if (updateError) {
      setEnabled((prev) => (prev ? { ...prev, [column]: !value } : prev));
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
            <Text className="text-xl font-bold text-text-dark">Alert Preferences</Text>
          </View>

          <Text className="mt-2 text-sm text-text-muted">Choose what alerts you want to receive</Text>

          {error ? (
            <Text className="mt-3 text-xs" style={{ color: colors.riskHighText }}>
              {error}
            </Text>
          ) : null}

          {enabled === null ? (
            <Text className="mt-4 text-sm text-text-muted">Loading your preferences…</Text>
          ) : (
            <View className="mt-4">
              {TOGGLES.map((toggle) => (
                <View key={toggle.column} className="mb-3 flex-row items-center rounded-2xl bg-card p-4">
                  <View className="flex-1 pr-3">
                    <Text className="text-sm font-semibold text-text-dark">{toggle.title}</Text>
                    <Text className="mt-0.5 text-xs text-text-muted">{toggle.description}</Text>
                  </View>
                  <Switch
                    value={enabled[toggle.column]}
                    onValueChange={(value) => handleToggle(toggle.column, value)}
                    trackColor={{ false: colors.divider, true: colors.secondary }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        <SOSButton />

        <DoctorTabBar active="profile" />
      </View>
    </SafeAreaView>
  );
}
