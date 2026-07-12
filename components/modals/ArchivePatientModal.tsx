import { View, Text, Pressable, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';

interface ArchivePatientModalProps {
  visible: boolean;
  patientName: string;
  onConfirm: () => void;
  onClose: () => void;
}

/** Archive confirmation sheet — same modal pattern as CrisisResourcesModal. */
export function ArchivePatientModal({ visible, patientName, onConfirm, onClose }: ArchivePatientModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 items-center justify-center bg-black/50 px-6" onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()} className="w-full items-center rounded-3xl bg-card p-6">
          <View className="h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: colors.riskHighBg }}>
            <Ionicons name="archive" size={28} color={colors.riskHigh} />
          </View>

          <Text className="mt-4 text-lg font-bold text-text-dark">Archive {patientName}?</Text>
          <Text className="mt-2 text-center text-sm text-text-muted">
            This patient will be moved to your archived list. You can restore them anytime.
          </Text>

          <Pressable onPress={onConfirm} className="mt-5 w-full items-center rounded-2xl py-4" style={{ backgroundColor: colors.riskHigh }}>
            <Text className="text-base font-semibold text-white">Archive</Text>
          </Pressable>

          <Pressable onPress={onClose} className="mt-3 w-full items-center rounded-2xl border-2 py-4" style={{ borderColor: colors.divider }}>
            <Text className="text-base font-semibold text-text-dark">Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
