import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, riskBandColors } from '../../constants/theme';

interface RecentCheckInCardProps {
  dateLabel: string;
  score: number;
  mood: number;
  sleep: number;
  craving: number;
}

/** "Recent Check-In" recap: timestamp, risk badge, and the three logged values. */
export function RecentCheckInCard({ dateLabel, score, mood, sleep, craving }: RecentCheckInCardProps) {
  const band = riskBandColors(score);
  const bandLabel = score >= 70 ? 'High' : score >= 40 ? 'Medium' : 'Low';

  return (
    <View className="rounded-2xl bg-card p-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-text-dark">Recent Check-In</Text>
        <View className="rounded-full px-3 py-1" style={{ backgroundColor: band.bg }}>
          <Text className="text-xs font-semibold" style={{ color: band.text }}>
            {bandLabel}
          </Text>
        </View>
      </View>
      <Text className="mb-2 mt-0.5 text-xs text-text-muted">{dateLabel}</Text>
      <View className="flex-row">
        <View className="mr-4 flex-row items-center">
          <Ionicons name="happy-outline" size={14} color={colors.textMuted} />
          <Text className="ml-1 text-xs text-text-muted">Mood {mood}</Text>
        </View>
        <View className="mr-4 flex-row items-center">
          <Ionicons name="moon-outline" size={14} color={colors.textMuted} />
          <Text className="ml-1 text-xs text-text-muted">Sleep {sleep}</Text>
        </View>
        <View className="flex-row items-center">
          <Ionicons name="flame-outline" size={14} color={colors.textMuted} />
          <Text className="ml-1 text-xs text-text-muted">Craving {craving}</Text>
        </View>
      </View>
    </View>
  );
}
