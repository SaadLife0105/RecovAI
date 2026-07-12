import { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { MOOD_LEVELS, MoodKey } from '../../lib/moodLevels';

const MAX_LENGTH = 2000;

/** Screen 20 — New Journal Entry. Static UI; no real journal persistence yet. */
export default function JournalNew() {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<MoodKey>('great');

  const canSave = content.trim().length > 0;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <View className="flex-1 px-5 pt-4">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} className="h-9 w-9 items-center justify-center">
            <Ionicons name="close" size={24} color={colors.textDark} />
          </Pressable>
          <Text className="text-lg font-bold text-text-dark">New Entry</Text>
          <Pressable onPress={() => canSave && router.back()} className="h-9 items-center justify-center">
            <Text className="text-base font-semibold" style={{ color: canSave ? colors.primary : colors.textMuted }}>
              Save
            </Text>
          </Pressable>
        </View>

        <View className="mt-5 flex-row items-center justify-between rounded-xl bg-card px-4 py-3">
          <Text className="text-sm text-text-dark">May 24, 2025</Text>
          <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
        </View>

        <View className="mt-4 flex-1 rounded-xl bg-card p-4">
          <TextInput
            value={content}
            onChangeText={(text) => setContent(text.slice(0, MAX_LENGTH))}
            placeholder={'How are you feeling today? Write freely...'}
            placeholderTextColor={colors.textMuted}
            multiline
            textAlignVertical="top"
            className="flex-1 text-sm text-text-dark"
          />
          <Text className="self-end text-xs text-text-muted">
            {content.length} / {MAX_LENGTH}
          </Text>
        </View>

        <Text className="mb-3 mt-5 text-sm font-medium text-text-dark">How&apos;s your mood?</Text>
        <View className="flex-row justify-between">
          {MOOD_LEVELS.map((level) => {
            const isSelected = level.key === mood;
            return (
              <Pressable
                key={level.key}
                onPress={() => setMood(level.key)}
                className="h-12 w-12 items-center justify-center rounded-full border-2"
                style={{ borderColor: isSelected ? colors.primary : 'transparent', backgroundColor: colors.surface }}
              >
                <MaterialCommunityIcons name={level.icon} size={22} color={isSelected ? colors.primary : colors.textMuted} />
              </Pressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}
