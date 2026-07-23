import { useState } from 'react';
import { View, Text, TextInput, Pressable, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';

interface ResetPatientPasswordModalProps {
  visible: boolean;
  patientName: string;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onConfirm: (newPassword: string) => void;
  onClose: () => void;
}

/** Doctor-side password reset for an assigned patient — same modal pattern as ArchivePatientModal. */
export function ResetPatientPasswordModal({
  visible,
  patientName,
  isSubmitting,
  errorMessage,
  onConfirm,
  onClose,
}: ResetPatientPasswordModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // The modal stays mounted across opens, so its fields would otherwise still
  // hold the previous patient's typed password the next time it opens.
  const handleClose = () => {
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setValidationError(null);
    onClose();
  };

  const handleConfirm = () => {
    if (newPassword.length < 8) {
      setValidationError('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setValidationError("Passwords don't match");
      return;
    }
    setValidationError(null);
    onConfirm(newPassword);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable className="flex-1 items-center justify-center bg-black/50 px-6" onPress={handleClose}>
        <Pressable onPress={(e) => e.stopPropagation()} className="w-full rounded-3xl bg-card p-6">
          <View className="items-center">
            <View className="h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: colors.secondaryBg }}>
              <Ionicons name="key" size={28} color={colors.secondary} />
            </View>

            <Text className="mt-4 text-lg font-bold text-text-dark">Reset {patientName}&apos;s password</Text>
            <Text className="mt-2 text-center text-sm text-text-muted">
              Set a new password and relay it to them directly — they sign in with their username, so no reset
              email can reach them.
            </Text>
          </View>

          <Text className="mb-1 mt-5 text-sm font-medium text-text-dark">New Password</Text>
          <View className="flex-row items-center rounded-xl px-4" style={{ backgroundColor: colors.surface }}>
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Enter new password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showNewPassword}
              autoCapitalize="none"
              autoCorrect={false}
              className="flex-1 py-3 text-text-dark"
            />
            <Pressable
              onPress={() => setShowNewPassword((v) => !v)}
              accessibilityLabel={showNewPassword ? 'Hide new password' : 'Show new password'}
              hitSlop={12}
            >
              <Ionicons name={showNewPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          <Text className="mb-1 mt-4 text-sm font-medium text-text-dark">Confirm Password</Text>
          <View className="flex-row items-center rounded-xl px-4" style={{ backgroundColor: colors.surface }}>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm new password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
              className="flex-1 py-3 text-text-dark"
            />
            <Pressable
              onPress={() => setShowConfirmPassword((v) => !v)}
              accessibilityLabel={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}
              hitSlop={12}
            >
              <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          {validationError ?? errorMessage ? (
            <Text className="mt-3 text-center text-sm" style={{ color: colors.riskHigh }}>
              {validationError ?? errorMessage}
            </Text>
          ) : null}

          <Pressable
            onPress={handleConfirm}
            disabled={isSubmitting}
            className="mt-5 w-full items-center rounded-2xl py-4"
            style={{ backgroundColor: colors.secondary, opacity: isSubmitting ? 0.6 : 1 }}
          >
            <Text className="text-base font-semibold text-white">
              {isSubmitting ? 'Resetting...' : 'Reset Password'}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleClose}
            disabled={isSubmitting}
            className="mt-3 w-full items-center rounded-2xl border-2 py-4"
            style={{ borderColor: colors.divider }}
          >
            <Text className="text-base font-semibold text-text-dark">Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
