import { useState } from 'react';
import { View, Text, Image, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '../../constants/theme';
import { useActivityFeed, ActivityFeedItemType } from '../../lib/hooks/useActivityFeed';
import { formatDateLabel, formatTime, formatTimestamp, toDeviceLocalIsoString } from '../../lib/formatDate';
import { getMauritiusDateString } from '../../lib/mauritiusTime';
import { SOSButton } from '../../components/sos/SOSButton';
import { BottomTabBar } from '../../components/navigation/BottomTabBar';
import { ActivityListSkeleton } from '../../components/skeletons/ActivityListSkeleton';

// DEV-ONLY: useActivityFeed().isLoading is always false right now (no
// real async fetch exists yet). Flip this to true locally to preview
// ActivityListSkeleton — remove once real loading states exist.
const DEV_FORCE_LOADING = false;

const FILTERS: { label: string; type: ActivityFeedItemType | 'all' }[] = [
  { label: 'All', type: 'all' },
  { label: 'Check-ins', type: 'checkin' },
  { label: 'Zones', type: 'zone' },
  { label: 'Alerts', type: 'alert' },
  { label: 'Journal', type: 'journal' },
];

/** Device-local YYYY-MM-DD — matches how localized item timestamps are keyed below. */
function toLocalDay(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function yesterdayOf(dateStr: string): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function dayLabel(dateStr: string): string {
  const today = getMauritiusDateString();
  if (dateStr === today) return `Today — ${formatDateLabel(dateStr)}`;
  if (dateStr === yesterdayOf(today)) return `Yesterday — ${formatDateLabel(dateStr)}`;
  return formatDateLabel(dateStr);
}

const NO_HISTORY_TIPS: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [
  { icon: 'calendar-outline', text: 'Check in daily to build your history' },
  { icon: 'location-outline', text: 'Safe zones and alerts will appear here' },
  { icon: 'stats-chart-outline', text: 'Stay consistent to see meaningful trends' },
];

/** Screen 40 — History. Unified activity feed via useActivityFeed(). */
export default function History() {
  const { data: items, isLoading } = useActivityFeed();
  const loading = isLoading || DEV_FORCE_LOADING;
  const [activeFilter, setActiveFilter] = useState<ActivityFeedItemType | 'all'>('all');
  // Accordion: one row expanded at a time. Pure expand/collapse, no side effects.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const typeFiltered = activeFilter === 'all' ? items : items.filter((item) => item.type === activeFilter);

  // Convert to device-local once, here, before it's used for anything —
  // both the day grouping below and the displayed time need the same
  // corrected value, or entries written between midnight and 4 AM
  // Mauritius time silently land in the wrong day's group.
  const localized = typeFiltered.map((item) => ({ ...item, timestamp: toDeviceLocalIsoString(item.timestamp) }));

  // Date filter composes with the type filter above, it doesn't replace it.
  const selectedDay = selectedDate ? toLocalDay(selectedDate) : null;
  const filtered = selectedDay ? localized.filter((item) => item.timestamp.slice(0, 10) === selectedDay) : localized;

  const groups: { date: string; items: typeof localized }[] = [];
  for (const item of filtered) {
    const date = item.timestamp.slice(0, 10);
    const group = groups[groups.length - 1];
    if (group && group.date === date) {
      group.items.push(item);
    } else {
      groups.push({ date, items: [item] });
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1">
        <ScrollView contentContainerClassName="px-5 pb-10" showsVerticalScrollIndicator={false}>
          <View className="mt-2 flex-row items-center justify-between">
            <Text className="text-2xl font-bold text-text-dark">History</Text>
            <Pressable
              onPress={() => setShowDatePicker(true)}
              accessibilityLabel="Jump to a date"
              hitSlop={8}
              className="h-9 w-9 items-center justify-center"
            >
              <Ionicons name="calendar-outline" size={22} color={selectedDate ? colors.primary : colors.textDark} />
            </Pressable>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={selectedDate ?? new Date()}
              mode="date"
              maximumDate={new Date()}
              onChange={(event, selected) => {
                setShowDatePicker(false);
                if (event.type === 'set' && selected) setSelectedDate(selected);
              }}
            />
          )}

          {selectedDate && (
            <Pressable
              onPress={() => setSelectedDate(null)}
              className="mt-3 flex-row items-center self-start rounded-full px-3 py-1.5"
              style={{ backgroundColor: colors.primary }}
            >
              <Text className="text-xs font-semibold text-white">{formatDateLabel(toLocalDay(selectedDate))}</Text>
              <Ionicons name="close" size={14} color="#FFFFFF" style={{ marginLeft: 6 }} />
            </Pressable>
          )}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4 -mx-5 px-5">
            <View className="flex-row gap-2">
              {FILTERS.map((filter) => {
                const isActive = filter.type === activeFilter;
                return (
                  <Pressable
                    key={filter.type}
                    onPress={() => setActiveFilter(filter.type)}
                    className="rounded-full px-4 py-2"
                    style={{ backgroundColor: isActive ? colors.primary : colors.card }}
                  >
                    <Text className="text-xs font-semibold" style={{ color: isActive ? '#FFFFFF' : colors.textDark }}>
                      {filter.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          {loading ? (
            <View className="mt-5">
              <ActivityListSkeleton />
            </View>
          ) : items.length === 0 ? (
            <View className="mt-8 items-center px-4">
              <Image
                source={require('../../assets/illustrations/05-calendar-with-clock.png')}
                style={{ width: 140, height: 140 }}
                resizeMode="contain"
              />
              <Text className="mt-4 text-xl font-bold text-text-dark">No history yet</Text>
              <Text className="mt-1 text-center text-sm text-text-muted">
                Your activity history will show up here as you continue your recovery journey.
              </Text>

              <View className="mt-5 w-full">
                {NO_HISTORY_TIPS.map((tip) => (
                  <View key={tip.text} className="mb-3 flex-row items-center rounded-2xl bg-card p-3">
                    <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: colors.surface }}>
                      <Ionicons name={tip.icon} size={16} color={colors.primary} />
                    </View>
                    <Text className="ml-3 flex-1 text-sm text-text-dark">{tip.text}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : groups.length === 0 ? (
            <View className="mt-8 items-center px-4">
              <Ionicons name="calendar-clear-outline" size={40} color={colors.textMuted} />
              <Text className="mt-3 text-sm text-text-muted">
                {selectedDate ? 'Nothing on this day' : 'Nothing matches this filter'}
              </Text>
            </View>
          ) : (
            groups.map((group) => (
              <View key={group.date} className="mt-5">
                <Text className="mb-2 text-sm font-semibold text-text-dark">{dayLabel(group.date)}</Text>
                {group.items.map((item) => {
                  const isExpanded = expandedId === item.id;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => setExpandedId(isExpanded ? null : item.id)}
                      className="mb-3 rounded-2xl bg-card p-3"
                    >
                      <View className="flex-row items-center">
                        <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: item.iconBg }}>
                          <Ionicons name={item.icon} size={18} color={item.iconColor} />
                        </View>
                        <View className="ml-3 flex-1">
                          <Text className="text-sm font-semibold text-text-dark">{item.title}</Text>
                          <Text className="mt-0.5 text-xs text-text-muted" numberOfLines={isExpanded ? undefined : 1}>
                            {item.subtitle}
                          </Text>
                        </View>
                        <Text className="ml-2 text-xs text-text-muted">{formatTime(item.timestamp)}</Text>
                        <Ionicons
                          name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                          size={16}
                          color={colors.textMuted}
                          style={{ marginLeft: 8 }}
                        />
                      </View>

                      {isExpanded && (
                        <View className="mt-3 border-t border-divider pt-3">
                          <Text className="text-xs font-semibold text-text-dark">When</Text>
                          <Text className="mt-1 text-xs text-text-muted">{formatTimestamp(item.timestamp)}</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            ))
          )}
        </ScrollView>

        <SOSButton />

        <BottomTabBar active="history" />
      </View>
    </SafeAreaView>
  );
}
