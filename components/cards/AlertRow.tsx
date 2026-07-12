import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';

interface AlertRowProps {
  dotColor: string;
  /** Patient avatar — omitted on screens already scoped to one patient (e.g. Patient Detail). */
  avatar?: { initials: string; color: string };
  title: string;
  message: string;
  badge?: { label: string; bg: string; text: string };
  meta: string; // e.g. "10 min ago • Unread"
  onPress?: () => void;
}

/** One alert row — reused on the Alerts list and Patient Detail's Recent Alerts. */
export function AlertRow({ dotColor, avatar, title, message, badge, meta, onPress }: AlertRowProps) {
  return (
    <Pressable onPress={onPress} className="mb-3 flex-row items-start rounded-2xl bg-card p-3">
      <View className="mt-1.5 mr-2 h-2 w-2 rounded-full" style={{ backgroundColor: dotColor }} />

      {avatar ? (
        <View className="mr-3 h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: avatar.color }}>
          <Text className="text-xs font-bold text-white">{avatar.initials}</Text>
        </View>
      ) : null}

      <View className="flex-1">
        <View className="flex-row items-center justify-between">
          <Text className="flex-1 text-sm font-semibold text-text-dark">{title}</Text>
          {badge ? (
            <View className="ml-2 rounded-full px-2 py-0.5" style={{ backgroundColor: badge.bg }}>
              <Text className="text-[10px] font-semibold" style={{ color: badge.text }}>
                {badge.label}
              </Text>
            </View>
          ) : null}
        </View>
        <Text className="mt-0.5 text-xs text-text-muted">{message}</Text>
        <Text className="mt-1 text-[11px] text-text-muted">{meta}</Text>
      </View>

      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ marginLeft: 8, marginTop: 4 }} />
    </Pressable>
  );
}
