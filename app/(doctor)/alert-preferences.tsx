import { useState } from 'react';
import { View, Text, Pressable, Switch, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { SOSButton } from '../../components/sos/SOSButton';
import { DoctorTabBar } from '../../components/navigation/DoctorTabBar';

const TOGGLES = [
  { key: 'highRisk', title: 'High risk alerts', description: 'Get notified when a patient reaches high risk.' },
  { key: 'missedCheckin', title: 'Missed check-in alerts', description: 'Get notified when a patient misses check-in for 1+ day.' },
  { key: 'zoneBreach', title: 'Zone breach alerts', description: 'Get notified when a patient enters a risk zone.' },
  { key: 'predictedHighRisk', title: 'Predicted high risk alerts', description: 'Get notified about predicted high risk in next 24h.' },
] as const;

type ToggleKey = (typeof TOGGLES)[number]['key'];

/** Screen 15b — Alert Preferences. Static UI; enforcing these at alert-send time is a Phase 6 backend concern. */
export default function AlertPreferences() {
  const router = useRouter();
  const [enabled, setEnabled] = useState<Record<ToggleKey, boolean>>({
    highRisk: true,
    missedCheckin: true,
    zoneBreach: true,
    predictedHighRisk: true,
  });

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1">
        <ScrollView contentContainerClassName="px-5 pb-10" showsVerticalScrollIndicator={false}>
          <View className="mt-2 flex-row items-center">
            <Pressable onPress={() => router.back()} className="mr-2 h-9 w-9 items-center justify-center">
              <Ionicons name="chevron-back" size={24} color={colors.textDark} />
            </Pressable>
            <Text className="text-xl font-bold text-text-dark">Alert Preferences</Text>
          </View>

          <Text className="mt-2 text-sm text-text-muted">Choose what alerts you want to receive</Text>

          <View className="mt-4">
            {TOGGLES.map((toggle) => (
              <View key={toggle.key} className="mb-3 flex-row items-center rounded-2xl bg-card p-4">
                <View className="flex-1 pr-3">
                  <Text className="text-sm font-semibold text-text-dark">{toggle.title}</Text>
                  <Text className="mt-0.5 text-xs text-text-muted">{toggle.description}</Text>
                </View>
                <Switch
                  value={enabled[toggle.key]}
                  onValueChange={(value) => setEnabled((prev) => ({ ...prev, [toggle.key]: value }))}
                  trackColor={{ false: colors.divider, true: colors.secondary }}
                  thumbColor="#FFFFFF"
                />
              </View>
            ))}
          </View>
        </ScrollView>

        <SOSButton />

        <DoctorTabBar active="profile" />
      </View>
    </SafeAreaView>
  );
}
