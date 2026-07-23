import { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { MOOD_LEVELS, MoodKey } from '../../lib/moodLevels';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/hooks/useSession';
import { getMauritiusDateString } from '../../lib/mauritiusTime';
import { formatDateLabel } from '../../lib/formatDate';

const MAX_LENGTH = 2000;

/** Screen 20 — New Journal Entry. Saves to journal_entries. */
export default function JournalNew() {
  const router = useRouter();
  const { session } = useSession();
  const patientId = session?.user.id;
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<MoodKey>('great');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canSave = content.trim().length > 0 && !isSubmitting;

  const handleSave = async () => {
    if (!canSave || !patientId) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const { error } = await supabase.from('journal_entries').insert({
      patient_id: patientId,
      date: getMauritiusDateString(),
      mood_level: mood,
      content: content.trim(),
    });

    if (error) {
      setErrorMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <View className="flex-1 px-5 pt-4">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} accessibilityLabel="Close without saving" hitSlop={8} className="h-9 w-9 items-center justify-center">
            <Ionicons name="close" size={24} color={colors.textDark} />
          </Pressable>
          <Text className="text-lg font-bold text-text-dark">New Entry</Text>
          <Pressable onPress={handleSave} disabled={!canSave} className="h-9 items-center justify-center">
            <Text className="text-base font-semibold" style={{ color: canSave ? colors.primary : colors.textMuted }}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Text>
          </Pressable>
        </View>

        <View className="mt-5 flex-row items-center justify-between rounded-xl bg-card px-4 py-3">
          <Text className="text-sm text-text-dark">{formatDateLabel(getMauritiusDateString())}</Text>
          <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
        </View>

        {errorMessage && (
          <Text className="mt-3 text-center text-sm" style={{ color: colors.riskHigh }}>
            {errorMessage}
          </Text>
        )}

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
