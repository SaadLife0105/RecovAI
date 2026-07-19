import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { useDoctorNote, saveDoctorNote } from '../../lib/hooks/useDoctorNote';
import { formatTimestamp, toDeviceLocalIsoString } from '../../lib/formatDate';
import { SOSButton } from '../../components/sos/SOSButton';
import { DoctorTabBar } from '../../components/navigation/DoctorTabBar';

/** Screen 33 — Edit Doctor Note. Persists to doctor_notes; patient/[id].tsx reflects the edit on return. */
export default function EditNote() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: note, isLoading: isNoteLoading } = useDoctorNote(id);
  const [draft, setDraft] = useState('');
  const [hasHydratedDraft, setHasHydratedDraft] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // useDoctorNote fetches async — its value is null while loading, so seeding
  // `draft` from `note?.content` in useState's initializer would only ever
  // capture that null first render, never the real content once it arrives.
  // Hydrate draft exactly once, after the fetch resolves, so Save can never
  // overwrite an existing note with a blank one.
  useEffect(() => {
    if (!isNoteLoading && !hasHydratedDraft) {
      setDraft(note?.content ?? '');
      setHasHydratedDraft(true);
    }
  }, [isNoteLoading, hasHydratedDraft, note]);

  const handleSave = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    const { error } = await saveDoctorNote(id, draft);
    if (error) {
      setErrorMessage(error);
      setIsSubmitting(false);
      return;
    }
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1">
        <View className="flex-1 px-5 pt-2">
          <View className="mt-2 flex-row items-center">
            <Pressable onPress={() => router.back()} className="mr-2 h-9 w-9 items-center justify-center">
              <Ionicons name="chevron-back" size={24} color={colors.textDark} />
            </Pressable>
            <Text className="text-xl font-bold text-text-dark">Edit Note</Text>
          </View>

          <View className="mt-4 flex-1 rounded-2xl bg-card p-4">
            <TextInput
              value={draft}
              onChangeText={setDraft}
              editable={hasHydratedDraft}
              placeholder={hasHydratedDraft ? undefined : 'Loading note...'}
              placeholderTextColor={colors.textMuted}
              multiline
              textAlignVertical="top"
              className="flex-1 text-sm text-text-dark"
            />
          </View>

          {note ? (
            <Text className="mt-2 text-xs text-text-muted">Last updated: {formatTimestamp(toDeviceLocalIsoString(note.updatedAt))}</Text>
          ) : null}

          {errorMessage ? (
            <Text className="mt-2 text-center text-sm" style={{ color: colors.riskHigh }}>
              {errorMessage}
            </Text>
          ) : null}

          <View className="mb-6 mt-4 flex-row gap-3">
            <Pressable
              onPress={() => router.back()}
              className="flex-1 items-center rounded-2xl border-2 py-4"
              style={{ borderColor: colors.divider }}
            >
              <Text className="text-base font-semibold text-text-dark">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={isSubmitting || !hasHydratedDraft}
              className="flex-1 items-center rounded-2xl py-4"
              style={{ backgroundColor: colors.primary, opacity: isSubmitting || !hasHydratedDraft ? 0.6 : 1 }}
            >
              <Text className="text-base font-semibold text-white">{isSubmitting ? 'Saving...' : 'Save Note'}</Text>
            </Pressable>
          </View>
        </View>

        <SOSButton />

        <DoctorTabBar active="dashboard" />
      </View>
    </SafeAreaView>
  );
}
