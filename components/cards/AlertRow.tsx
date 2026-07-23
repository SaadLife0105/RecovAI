import type { ReactNode } from 'react';
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
  /**
   * Accordion mode. Pass `expanded` to swap the trailing chevron from
   * "forward" (navigates) to "down/up" (toggles), and render `children`
   * beneath the row while open. Omit both and the row behaves exactly as it
   * always has — Overview's Recent Alerts preview still uses that plain form.
   */
  expanded?: boolean;
  children?: ReactNode;
}

/** One alert row — reused on the Alerts list and Patient Detail's Recent Alerts. */
export function AlertRow({ dotColor, avatar, title, message, badge, meta, onPress, expanded, children }: AlertRowProps) {
  const isAccordion = expanded !== undefined;

  return (
    <View className="mb-3 rounded-2xl bg-card p-3">
      <Pressable onPress={onPress} className="flex-row items-start">
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

        <Ionicons
          name={isAccordion ? (expanded ? 'chevron-up' : 'chevron-down') : 'chevron-forward'}
          size={16}
          color={colors.textMuted}
          style={{ marginLeft: 8, marginTop: 4 }}
        />
      </Pressable>

      {isAccordion && expanded ? (
        <View className="mt-3 border-t pt-3" style={{ borderTopColor: colors.divider }}>
          {children}
        </View>
      ) : null}
    </View>
  );
}
