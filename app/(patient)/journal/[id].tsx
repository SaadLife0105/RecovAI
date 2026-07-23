import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../../constants/theme';
import { getMoodLevel } from '../../../lib/moodLevels';
import { useJournalEntries } from '../../../lib/hooks/useJournalEntries';
import { formatDateLabel, formatTime, toDeviceLocalIsoString } from '../../../lib/formatDate';

const MOOD_LABELS: Record<string, string> = {
  rough: 'Rough',
  low: 'Low',
  okay: 'Okay',
  good: 'Good',
  great: 'Great',
};

/** Read-only full view of one journal entry. Reuses useJournalEntries() (the
 * patient's own list) and finds by id — no new query, list is already cached. */
export default function JournalDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: entries, isLoading } = useJournalEntries();
  const entry = entries.find((e) => e.id === id);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="mt-2 flex-row items-center px-5">
        <Pressable onPress={() => router.back()} hitSlop={8} className="h-9 w-9 items-center justify-center" accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={24} color={colors.textDark} />
        </Pressable>
        <Text className="ml-1 text-2xl font-bold text-text-dark">Journal Entry</Text>
      </View>

      {isLoading ? (
        <View className="mt-10 items-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !entry ? (
        <View className="mt-10 items-center px-5">
          <Text className="text-base font-semibold text-text-dark">Entry not found</Text>
          <Text className="mt-1 text-center text-sm text-text-muted">This journal entry may have been deleted.</Text>
        </View>
      ) : (
        <ScrollView contentContainerClassName="px-5 pb-10" showsVerticalScrollIndicator={false}>
          {(() => {
            const level = getMoodLevel(entry.moodLevel);
            return (
              <View className="mt-5 flex-row items-center">
                <View className="h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: level.bg }}>
                  <MaterialCommunityIcons name={level.icon} size={28} color={level.color} />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-lg font-bold text-text-dark">{MOOD_LABELS[entry.moodLevel] ?? entry.moodLevel}</Text>
                  <Text className="mt-0.5 text-sm text-text-muted">
                    {formatDateLabel(entry.date)} · {formatTime(toDeviceLocalIsoString(entry.createdAt))}
                  </Text>
                </View>
              </View>
            );
          })()}

          <View className="mt-5 rounded-2xl bg-card p-4">
            <Text className="text-base leading-6 text-text-dark">{entry.text}</Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
