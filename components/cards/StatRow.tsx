import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';

interface StatRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  valueColor?: string;
}

/** Icon + label + value pair, e.g. "Steps · 6,342" — used in the passive-data cards. */
export function StatRow({ icon, label, value, valueColor }: StatRowProps) {
  return (
    <View className="flex-1 flex-row items-center">
      <Ionicons name={icon} size={16} color={colors.textMuted} />
      <View className="ml-2">
        <Text className="text-xs text-text-muted">{label}</Text>
        <Text className="text-sm font-semibold" style={{ color: valueColor ?? colors.textDark }}>
          {value}
        </Text>
      </View>
    </View>
  );
}
