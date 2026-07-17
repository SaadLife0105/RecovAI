import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, riskBand } from '../../constants/theme';
import { StreakCard } from '../../components/cards/StreakCard';
import { SOSButton } from '../../components/sos/SOSButton';
import { BottomTabBar } from '../../components/navigation/BottomTabBar';
import { usePatientProfile } from '../../lib/hooks/usePatientProfile';
import { useStreak } from '../../lib/hooks/useStreak';
import { useCheckIns } from '../../lib/hooks/useCheckIns';
import { PATIENT_PREFERENCES } from '../../lib/mockData';
import { supabase } from '../../lib/supabase';
import { daysBetween, getMauritiusDateString } from '../../lib/mauritiusTime';

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Screen 9 — Patient Profile. Wired to the mock-data hooks (usePatientProfile/useStreak/useCheckIns) as the pattern's proof screen. */
export default function PatientProfile() {
  const router = useRouter();
  const { data: profile } = usePatientProfile();
  const { data: streak } = useStreak();
  const { data: checkIns } = useCheckIns();

  if (!profile) return null;

  const latestCheckIn = checkIns[checkIns.length - 1];
  const avgRiskScoreLabel = latestCheckIn
    ? `${latestCheckIn.riskScore} (${capitalize(riskBand(latestCheckIn.riskScore))})`
    : '—';

  const progressStats: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }[] = [
    { icon: 'speedometer-outline', label: 'Longest Streak', value: `${streak.longestStreak} days` },
    {
      icon: 'flame-outline',
      label: 'Days Sober',
      value: profile.sobrietyStartDate ? `${daysBetween(profile.sobrietyStartDate, getMauritiusDateString())}` : '—',
    },
    { icon: 'calendar-outline', label: 'Check-ins', value: String(checkIns.length) },
    { icon: 'stats-chart-outline', label: 'Avg Risk Score', value: avgRiskScoreLabel },
  ];

  const settingsRows: { icon: keyof typeof Ionicons.glyphMap; label: string; value?: string; route?: '/(patient)/change-password'; danger?: boolean }[] = [
    { icon: 'alarm-outline', label: 'Check-in Reminder', value: PATIENT_PREFERENCES.checkInReminderTime },
    { icon: 'lock-closed-outline', label: 'Change Password', route: '/(patient)/change-password' },
    { icon: 'notifications-outline', label: 'Notification Preferences', value: PATIENT_PREFERENCES.notificationsEnabled ? 'Enabled' : 'Disabled' },
    { icon: 'log-out-outline', label: 'Log Out', danger: true },
  ];

  const initials = profile.fullName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1">
        <ScrollView contentContainerClassName="px-5 pb-10" showsVerticalScrollIndicator={false}>
          <View className="mt-2 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: colors.primary }}>
                <Text className="text-base font-bold text-white">{initials}</Text>
              </View>
              <View className="ml-3">
                <Text className="text-lg font-bold text-text-dark">{profile.fullName}</Text>
                <Text className="text-sm text-text-muted">{capitalize(profile.role)}</Text>
              </View>
            </View>
            <Pressable onPress={() => router.push('/(patient)/edit-profile')}>
              <Ionicons name="settings-outline" size={22} color={colors.textDark} />
            </Pressable>
          </View>

          <View className="mt-4 flex-row gap-3">
            <StreakCard days={streak.currentStreak} variant="card-compact" status="On Fire!" />
            <View className="flex-1 rounded-2xl bg-card p-4">
              <Ionicons name="person-outline" size={22} color={colors.textMuted} />
              <Text className="mt-1 text-xs text-text-muted">Assigned Doctor</Text>
              <Text className="mt-1 text-sm font-bold text-text-dark">{profile.assignedDoctorName}</Text>
            </View>
          </View>

          <Text className="mb-2 mt-6 text-sm font-semibold text-text-dark">Your Progress</Text>
          <View className="flex-row gap-3">
            {progressStats.map((stat) => (
              <View key={stat.label} className="flex-1 items-center rounded-2xl bg-card p-3">
                <Ionicons name={stat.icon} size={20} color={colors.primary} />
                <Text className="mt-2 text-center text-[11px] text-text-muted">{stat.label}</Text>
                <Text className="mt-1 text-sm font-bold text-text-dark">{stat.value}</Text>
              </View>
            ))}
          </View>

          <Text className="mb-2 mt-6 text-sm font-semibold text-text-dark">Settings</Text>
          <View className="overflow-hidden rounded-2xl bg-card">
            {settingsRows.map((row, i) => (
              <Pressable
                key={row.label}
                onPress={row.route ? () => router.push(row.route!) : row.danger ? () => supabase.auth.signOut() : undefined}
                className="flex-row items-center px-4 py-4"
                style={i < settingsRows.length - 1 ? { borderBottomWidth: 1, borderBottomColor: colors.divider } : undefined}
              >
                <Ionicons name={row.icon} size={18} color={row.danger ? colors.riskHigh : colors.textMuted} />
                <Text
                  className="ml-3 flex-1 text-sm font-medium"
                  style={{ color: row.danger ? colors.riskHigh : colors.textDark }}
                >
                  {row.label}
                </Text>
                {row.value ? <Text className="mr-2 text-sm text-text-muted">{row.value}</Text> : null}
                {!row.danger ? <Ionicons name="chevron-forward" size={16} color={colors.textMuted} /> : null}
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <SOSButton />

        <BottomTabBar active="profile" />
      </View>
    </SafeAreaView>
  );
}
