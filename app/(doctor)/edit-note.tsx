import { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { useDoctorNote, updateDoctorNote } from '../../lib/hooks/useDoctorNote';
import { formatTimestamp } from '../../lib/formatDate';
import { SOSButton } from '../../components/sos/SOSButton';
import { DoctorTabBar } from '../../components/navigation/DoctorTabBar';

/** Screen 33 — Edit Doctor Note. Saves back into the mock note store so patient/[id].tsx reflects the edit on return. */
export default function EditNote() {
  const router = useRouter();
  const { data: note } = useDoctorNote();
  const [draft, setDraft] = useState(note?.content ?? '');

  const handleSave = () => {
    if (note) {
      updateDoctorNote(note.patientId, draft, new Date().toISOString());
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
              multiline
              textAlignVertical="top"
              className="flex-1 text-sm text-text-dark"
            />
          </View>

          {note ? (
            <Text className="mt-2 text-xs text-text-muted">Last updated: {formatTimestamp(note.updatedAt)}</Text>
          ) : null}

          <View className="mb-6 mt-4 flex-row gap-3">
            <Pressable
              onPress={() => router.back()}
              className="flex-1 items-center rounded-2xl border-2 py-4"
              style={{ borderColor: colors.divider }}
            >
              <Text className="text-base font-semibold text-text-dark">Cancel</Text>
            </Pressable>
            <Pressable onPress={handleSave} className="flex-1 items-center rounded-2xl py-4" style={{ backgroundColor: colors.primary }}>
              <Text className="text-base font-semibold text-white">Save Note</Text>
            </Pressable>
          </View>
        </View>

        <SOSButton />

        <DoctorTabBar active="dashboard" />
      </View>
    </SafeAreaView>
  );
}
