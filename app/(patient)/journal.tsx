import { useState } from 'react';
import { View, Text, Image, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { getMoodLevel } from '../../lib/moodLevels';
import { useJournalEntries } from '../../lib/hooks/useJournalEntries';
import { formatDateLabel, formatTime, toDeviceLocalIsoString } from '../../lib/formatDate';
import { SOSButton } from '../../components/sos/SOSButton';
import { BottomTabBar } from '../../components/navigation/BottomTabBar';

const FILTERS = ['All Entries', 'Mood', 'Triggers', 'Notes'];

const WRITE_TIPS = [
  'How your day went',
  'What triggered you',
  "What you're grateful for",
  'Anything on your mind',
];

/** Screen 19/35/45 — Recovery Journal. Filter tabs are visual only (see dashboard.tsx's chips for the same pattern). */
export default function Journal() {
  const router = useRouter();
  const { data: entries } = useJournalEntries();
  const [activeFilter, setActiveFilter] = useState(FILTERS[0]);
  const hasEntries = entries.length > 0;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1">
        <ScrollView contentContainerClassName="px-5 pb-10" showsVerticalScrollIndicator={false}>
          <View className="mt-2 flex-row items-center justify-between">
            <Text className="text-2xl font-bold text-text-dark">My Journal</Text>
            <Pressable onPress={() => router.push('/(patient)/journal-new')} className="h-9 w-9 items-center justify-center">
              <Ionicons name="create-outline" size={22} color={colors.textDark} />
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4 -mx-5 px-5">
            <View className="flex-row gap-2">
              {FILTERS.map((filter) => {
                const isActive = filter === activeFilter;
                return (
                  <Pressable
                    key={filter}
                    onPress={() => setActiveFilter(filter)}
                    className="rounded-full px-4 py-2"
                    style={{ backgroundColor: isActive ? colors.primary : colors.card }}
                  >
                    <Text className="text-xs font-semibold" style={{ color: isActive ? '#FFFFFF' : colors.textDark }}>
                      {filter}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          {hasEntries ? (
            <View className="mt-4">
              {entries.map((entry) => {
                const level = getMoodLevel(entry.moodLevel);
                return (
                  <Pressable key={entry.id} className="mb-3 flex-row items-center rounded-2xl bg-card p-3">
                    <View className="h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: level.bg }}>
                      <MaterialCommunityIcons name={level.icon} size={22} color={level.color} />
                    </View>
                    <View className="ml-3 flex-1">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-sm font-semibold text-text-dark">{formatDateLabel(entry.date)}</Text>
                        <Text className="text-xs text-text-muted">{formatTime(toDeviceLocalIsoString(entry.createdAt))}</Text>
                      </View>
                      <Text className="mt-0.5 text-xs text-text-muted" numberOfLines={1}>
                        {entry.text}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ marginLeft: 8 }} />
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View className="mt-8 items-center px-4">
              <Image
                source={require('../../assets/illustrations/01-open-journal-with-pen.png')}
                style={{ width: 140, height: 140 }}
                resizeMode="contain"
              />
              <Text className="mt-4 text-xl font-bold text-text-dark">Your journal is empty</Text>
              <Text className="mt-1 text-center text-sm text-text-muted">
                Writing about your feelings helps you reflect, understand, and heal.
              </Text>

              <View className="mt-5 w-full rounded-2xl p-4" style={{ backgroundColor: colors.surface }}>
                <Text className="text-sm font-semibold" style={{ color: colors.primary }}>
                  You can write about:
                </Text>
                {WRITE_TIPS.map((tip) => (
                  <View key={tip} className="mt-2 flex-row items-center">
                    <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                    <Text className="ml-2 text-sm text-text-dark">{tip}</Text>
                  </View>
                ))}
              </View>

              <Pressable
                onPress={() => router.push('/(patient)/journal-new')}
                className="mt-6 w-full items-center rounded-2xl py-4"
                style={{ backgroundColor: colors.primary }}
              >
                <Text className="text-base font-semibold text-white">Write Your First Entry</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>

        <Pressable
          onPress={() => router.push('/(patient)/journal-new')}
          className="absolute bottom-8 right-5 h-14 w-14 items-center justify-center rounded-full shadow-lg"
          style={{ backgroundColor: colors.primary }}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </Pressable>

        <SOSButton />

        <BottomTabBar active="journal" />
      </View>
    </SafeAreaView>
  );
}
