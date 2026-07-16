import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, riskBandColors } from '../../constants/theme';
import { RiskRingBadge } from '../gauges/RiskRingBadge';

export interface PatientRowData {
  /** Real UUID (profiles.id) — for navigation, not display. */
  id: string;
  name: string;
  patientId: string;
  // No birthdate/age field exists in the `profiles` schema — would need a
  // new column to bring this back honestly.
  avatarColor: string;
  score: number | null; // null for "Pending" / "Inactive" patients
  statusLabel: string; // "High Risk", "Medium Risk", "Low Risk", "Inactive (7+ days)", "Pending"
  lastCheckInDaysAgo?: number;
  notLoggedIn?: boolean;
  onPress?: () => void;
}

/** One row of the doctor dashboard's patient list: avatar, risk ring / last check-in, status dot. */
export function PatientListRow({
  name,
  patientId,
  avatarColor,
  score,
  statusLabel,
  lastCheckInDaysAgo,
  notLoggedIn,
  onPress,
}: PatientRowData) {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const dotColor = score !== null ? riskBandColors(score).dot : lastCheckInDaysAgo !== undefined ? colors.textMuted : colors.riskMedium;

  return (
    <Pressable onPress={onPress} className="mb-3 flex-row items-center rounded-2xl bg-card p-3">
      <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: avatarColor }}>
        <Text className="text-xs font-bold text-white">{initials}</Text>
      </View>

      <View className="ml-3 flex-1">
        <Text className="text-sm font-semibold text-text-dark">{name}</Text>
        <Text className="mt-0.5 text-xs text-text-muted">ID: {patientId}</Text>
      </View>

      <View className="items-end">
        {score !== null ? (
          <RiskRingBadge score={score} />
        ) : lastCheckInDaysAgo !== undefined ? (
          <View className="items-end">
            <Text className="text-[10px] text-text-muted">Last Check-in</Text>
            <Text className="text-sm font-semibold text-text-dark">{lastCheckInDaysAgo} days ago</Text>
          </View>
        ) : notLoggedIn ? (
          <View className="flex-row items-center">
            <Ionicons name="time-outline" size={13} color={colors.textMuted} style={{ marginRight: 4 }} />
            <Text className="text-xs text-text-muted">Not Logged In</Text>
          </View>
        ) : null}

        <View className="mt-1 flex-row items-center">
          <View className="mr-1 h-2 w-2 rounded-full" style={{ backgroundColor: dotColor }} />
          <Text className="text-[10px] text-text-muted">{statusLabel}</Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} style={{ marginLeft: 10 }} />
    </Pressable>
  );
}
