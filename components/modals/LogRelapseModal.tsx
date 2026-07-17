import { useState } from 'react';
import { View, Text, Pressable, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';

interface LogRelapseModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (notes: string | null) => void;
  isSubmitting: boolean;
  errorMessage: string | null;
}

/** Log-a-relapse confirmation sheet — same modal pattern as ArchivePatientModal. */
export function LogRelapseModal({ visible, onClose, onConfirm, isSubmitting, errorMessage }: LogRelapseModalProps) {
  const [notes, setNotes] = useState('');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 items-center justify-center bg-black/50 px-6" onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()} className="w-full items-center rounded-3xl bg-card p-6">
          <View className="h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: colors.safeZoneBg }}>
            <Ionicons name="heart-outline" size={28} color={colors.riskHigh} />
          </View>

          <Text className="mt-4 text-lg font-bold text-text-dark">Log a relapse</Text>
          <Text className="mt-2 text-center text-sm text-text-muted">
            This stays between you and your care team. Logging it honestly is a sign of strength, not failure — your
            check-in streak won&apos;t be affected.
          </Text>

          <View className="mt-4 w-full rounded-xl bg-surface p-3">
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Anything you want your doctor to know? (optional)"
              placeholderTextColor={colors.textMuted}
              multiline
              textAlignVertical="top"
              className="min-h-[80px] text-sm text-text-dark"
            />
          </View>

          {errorMessage && (
            <Text className="mt-3 text-center text-sm" style={{ color: colors.riskHigh }}>
              {errorMessage}
            </Text>
          )}

          <Pressable
            onPress={() => onConfirm(notes.trim().length > 0 ? notes.trim() : null)}
            disabled={isSubmitting}
            className="mt-5 w-full items-center rounded-2xl py-4"
            style={{ backgroundColor: colors.riskHigh, opacity: isSubmitting ? 0.6 : 1 }}
          >
            <Text className="text-base font-semibold text-white">
              {isSubmitting ? 'Logging...' : 'Log Relapse'}
            </Text>
          </Pressable>

          <Pressable onPress={onClose} className="mt-3 w-full items-center rounded-2xl border-2 py-4" style={{ borderColor: colors.divider }}>
            <Text className="text-base font-semibold text-text-dark">Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
