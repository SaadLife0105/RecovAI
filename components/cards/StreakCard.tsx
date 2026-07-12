import { View, Text, Image } from 'react-native';
import { colors } from '../../constants/theme';
import { getStreakIllustration } from '../../lib/streakIllustration';

interface StreakCardProps {
  days: number;
  /**
   * inline: bare icon + number + label row (Home).
   * card: full-width card, icon+days on the left, status on the right (Check-in Success).
   * card-compact: narrow card, everything stacked in one column (Profile two-up row).
   */
  variant?: 'inline' | 'card' | 'card-compact';
  /** e.g. "On Fire!" — shown as a bold accent status. */
  status?: string;
  /** Small line above the status, e.g. "Keep it up!" (Check-in Success only). */
  tagline?: string;
}

/** Days-sober streak display, reused across Home, Check-in Success, and Profile. Badge art is the day-range streak illustration (see docs/Illustrations.md). */
export function StreakCard({ days, variant = 'inline', status, tagline }: StreakCardProps) {
  const badge = getStreakIllustration(days);

  if (variant === 'inline') {
    return (
      <View className="flex-row items-center">
        <Image source={badge} style={{ width: 22, height: 22 }} resizeMode="contain" />
        <Text className="ml-2 text-lg font-bold text-text-dark">{days}</Text>
        <Text className="ml-1 text-sm text-text-muted">Days Sober</Text>
      </View>
    );
  }

  if (variant === 'card-compact') {
    return (
      <View className="flex-1 rounded-2xl bg-card p-4">
        <View className="flex-row items-center">
          <Image source={badge} style={{ width: 22, height: 22 }} resizeMode="contain" />
          <Text className="ml-2 text-lg font-bold text-text-dark">{days}</Text>
        </View>
        <Text className="mt-1 text-xs text-text-muted">Days Sober</Text>
        {status ? (
          <Text className="mt-1 text-sm font-bold" style={{ color: colors.riskHighText }}>
            {status}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View className="flex-row items-center justify-between rounded-2xl bg-card p-4">
      <View className="flex-row items-center">
        <Image source={badge} style={{ width: 28, height: 28 }} resizeMode="contain" />
        <View className="ml-2">
          <Text className="text-lg font-bold text-text-dark">{days}</Text>
          <Text className="text-xs text-text-muted">Days Sober</Text>
        </View>
      </View>
      {status ? (
        <View className="items-end">
          {tagline ? <Text className="text-xs text-text-muted">{tagline}</Text> : null}
          <Text className="text-sm font-bold" style={{ color: colors.riskHighText }}>
            {status}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
