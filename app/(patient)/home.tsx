import { View, Text, Image, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, riskBandColors } from '../../constants/theme';
import { RiskGauge } from '../../components/gauges/RiskGauge';
import { RiskRingBadge } from '../../components/gauges/RiskRingBadge';
import { RatingSlider } from '../../components/sliders/RatingSlider';
import { Card } from '../../components/cards/Card';
import { StatRow } from '../../components/cards/StatRow';
import { RecentCheckInCard } from '../../components/cards/RecentCheckInCard';
import { SOSButton } from '../../components/sos/SOSButton';
import { BottomTabBar } from '../../components/navigation/BottomTabBar';
import { StreakCard } from '../../components/cards/StreakCard';
import { useCheckIns } from '../../lib/hooks/useCheckIns';
import { useStreak } from '../../lib/hooks/useStreak';
import { usePatientProfile } from '../../lib/hooks/usePatientProfile';
import { usePassiveData } from '../../lib/context/PassiveDataContext';
import { formatTimestamp, toDeviceLocalIsoString } from '../../lib/formatDate';
import { daysBetween, getMauritiusDateString } from '../../lib/mauritiusTime';

// DEV-ONLY: force the "haven't checked in yet" layout regardless of what
// useCheckIns().hasCheckedInToday actually returns — useful for visually
// checking this branch still renders correctly without needing a patient
// account with zero check-ins today. Remove once no longer needed.
const DEV_FORCE_EMPTY = false;

function activityLabel(steps: number): string {
  if (steps < 2000) return 'Staying In';
  if (steps < 5000) return 'Light Movement';
  if (steps < 10000) return 'Active Day';
  return 'Very Active';
}

const QUICK_ACTIONS: { label: string; icon: keyof typeof Ionicons.glyphMap; route: '/(patient)/journal' | '/(patient)/chat' | '/(patient)/history' | '/(patient)/profile' }[] = [
  { label: 'Journal', icon: 'book-outline', route: '/(patient)/journal' },
  { label: 'Chat', icon: 'chatbubble-ellipses-outline', route: '/(patient)/chat' },
  { label: 'History', icon: 'time-outline', route: '/(patient)/history' },
  { label: 'My Progress', icon: 'trending-up-outline', route: '/(patient)/profile' },
];

/** Screen 5/30 — Patient Home. Splits on hasCheckedInToday: full recap vs. "haven't checked in yet" prompt. */
export default function PatientHome() {
  const router = useRouter();
  const { data: checkIns, hasCheckedInToday } = useCheckIns();
  const { data: streak } = useStreak();
  const { data: profile } = usePatientProfile();
  const { currentZoneStatus } = usePassiveData();
  const latestCheckIn = checkIns[checkIns.length - 1];
  const name = profile?.fullName.split(' ')[0] ?? '';

  // Zone chip: green (safe) / red (risk) / neutral when we genuinely don't
  // know (not near any zone, or location unavailable) — never imply either.
  const zone =
    currentZoneStatus === 'safe'
      ? { bg: colors.safeZoneBg, icon: 'shield-checkmark' as const, iconColor: colors.riskLow, titleColor: colors.riskLowText, title: 'Safe Zone', subtitle: 'You are in a safe area' }
      : currentZoneStatus === 'risk'
      ? { bg: colors.nearRiskBg, icon: 'warning' as const, iconColor: colors.riskHigh, titleColor: colors.riskHigh, title: 'Near Risk Zone', subtitle: 'You are near a flagged area' }
      : { bg: colors.card, icon: 'help-circle-outline' as const, iconColor: colors.textMuted, titleColor: colors.textDark, title: 'No Zone Data', subtitle: 'Location not available' };

  if (hasCheckedInToday && latestCheckIn && !DEV_FORCE_EMPTY) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <View className="flex-1">
          <ScrollView contentContainerClassName="px-5 pb-10" showsVerticalScrollIndicator={false}>
            <View className="mt-2 flex-row items-center justify-between">
              <View>
                <Text className="text-sm text-text-muted">Good morning,</Text>
                <Text className="text-xl font-bold text-text-dark">{name}</Text>
              </View>
              <Ionicons name="notifications-outline" size={24} color={colors.textDark} />
            </View>

            <View className="mt-4 items-center">
              <RiskGauge score={latestCheckIn.riskScore} />
            </View>

            <View className="mt-4">
              <StreakCard days={streak.currentStreak} variant="inline" />
            </View>

            <View
              className="mt-4 flex-row items-center rounded-2xl p-4"
              style={{ backgroundColor: zone.bg }}
            >
              <Ionicons name={zone.icon} size={20} color={zone.iconColor} />
              <View className="ml-3">
                <Text className="text-sm font-semibold" style={{ color: zone.titleColor }}>
                  {zone.title}
                </Text>
                <Text className="text-xs text-text-muted">{zone.subtitle}</Text>
              </View>
            </View>

            <Card title="Today's Progress" className="mt-4">
              <View className="mt-2 flex-row">
                <StatRow icon="footsteps-outline" label="Steps" value={latestCheckIn.steps.toLocaleString()} />
                <StatRow icon="pulse-outline" label="Activity" value={activityLabel(latestCheckIn.steps)} />
              </View>
              {profile?.sobrietyStartDate && (
                <View className="mt-2 flex-row">
                  <StatRow
                    icon="flame-outline"
                    label="Days Sober"
                    value={String(daysBetween(profile.sobrietyStartDate, getMauritiusDateString()))}
                  />
                </View>
              )}
            </Card>

            <View className="mt-4">
              <RatingSlider type="mood" value={latestCheckIn.mood} readOnly />
              <RatingSlider type="sleep" value={latestCheckIn.sleep} readOnly />
              <RatingSlider type="craving" value={latestCheckIn.craving} readOnly />
            </View>

            <RecentCheckInCard
              dateLabel={formatTimestamp(toDeviceLocalIsoString(latestCheckIn.createdAt))}
              score={latestCheckIn.riskScore}
              mood={latestCheckIn.mood}
              sleep={latestCheckIn.sleep}
              craving={latestCheckIn.craving}
            />

            <Pressable
              onPress={() => router.push('/check-in')}
              className="mt-4 items-center rounded-2xl py-4"
              style={{ backgroundColor: colors.primary }}
            >
              <Text className="text-base font-semibold text-white">Check In Now</Text>
            </Pressable>
          </ScrollView>

          <SOSButton />

          <BottomTabBar active="home" />
        </View>
      </SafeAreaView>
    );
  }

  const lastKnownScore = latestCheckIn?.riskScore ?? 0;
  const bandText = riskBandColors(lastKnownScore).text;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1">
        <ScrollView contentContainerClassName="px-5 pb-10" showsVerticalScrollIndicator={false}>
          <View className="mt-2 flex-row items-center justify-between">
            <View>
              <Text className="text-sm text-text-muted">Good morning,</Text>
              <Text className="text-xl font-bold text-text-dark">{name}</Text>
            </View>
            <Ionicons name="notifications-outline" size={24} color={colors.textDark} />
          </View>

          <View className="mt-4 flex-row gap-3">
            <StreakCard days={streak.currentStreak} variant="card-compact" status="On Fire!" />
            <View className="flex-1 rounded-2xl bg-card p-4">
              <Text className="text-xs text-text-muted">Risk Score</Text>
              <View className="mt-1 flex-row items-center">
                <RiskRingBadge score={lastKnownScore} size={56} />
                <Text className="ml-2 text-sm font-semibold" style={{ color: bandText }}>
                  {lastKnownScore >= 70 ? 'High' : lastKnownScore >= 40 ? 'Medium' : 'Low'}
                </Text>
              </View>
            </View>
          </View>

          {profile?.sobrietyStartDate && (
            <View className="mt-3 rounded-2xl bg-card p-4">
              <StatRow
                icon="flame-outline"
                label="Days Sober"
                value={String(daysBetween(profile.sobrietyStartDate, getMauritiusDateString()))}
              />
            </View>
          )}

          <View className="mt-4 rounded-2xl p-4" style={{ backgroundColor: colors.riskLowBg }}>
            <Text className="text-sm font-medium" style={{ color: colors.riskLowText }}>
              Every check-in is a step forward. Keep going!
            </Text>
          </View>

          <View className="mt-4 flex-row items-center justify-between rounded-2xl bg-card p-4">
            <View className="flex-1 pr-3">
              <Text className="text-sm font-semibold text-text-dark">Today&apos;s Check-in</Text>
              <Text className="mt-1 text-xs text-text-muted">Haven&apos;t checked in today</Text>
              <Text className="text-xs text-text-muted">How are you feeling?</Text>
              <Pressable
                onPress={() => router.push('/check-in')}
                className="mt-3 items-center rounded-xl px-4 py-2.5"
                style={{ backgroundColor: colors.primary }}
              >
                <Text className="text-sm font-semibold text-white">Check In Now</Text>
              </Pressable>
            </View>
            <Image
              source={require('../../assets/illustrations/07-calendar-with-checkmark.png')}
              style={{ width: 72, height: 72 }}
              resizeMode="contain"
            />
          </View>

          <Text className="mb-2 mt-6 text-sm font-semibold text-text-dark">Quick Actions</Text>
          <View className="flex-row flex-wrap gap-3">
            {QUICK_ACTIONS.map((action) => (
              <Pressable
                key={action.label}
                onPress={() => router.push(action.route)}
                className="items-center justify-center rounded-2xl bg-card py-4"
                style={{ width: '47%' }}
              >
                <Ionicons name={action.icon} size={22} color={colors.primary} />
                <Text className="mt-2 text-xs font-medium text-text-dark">{action.label}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <SOSButton />

        <BottomTabBar active="home" />
      </View>
    </SafeAreaView>
  );
}
