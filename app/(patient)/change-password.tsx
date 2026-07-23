import { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { SOSButton } from '../../components/sos/SOSButton';
import { BottomTabBar } from '../../components/navigation/BottomTabBar';
import { useToast } from '../../components/toast/ToastProvider';
import { supabase } from '../../lib/supabase';

/** Patient Change Password — reached from profile.tsx/edit-profile.tsx's Change Password row. */
export default function ChangePassword() {
  const router = useRouter();
  const { showToast } = useToast();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSave = async () => {
    if (newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords don't match");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setErrorMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    showToast('Password updated.', 'success');
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1">
        <ScrollView contentContainerClassName="px-5 pb-10" showsVerticalScrollIndicator={false}>
          <View className="mt-2 flex-row items-center">
            <Pressable onPress={() => router.back()} accessibilityLabel="Go back" hitSlop={8} className="mr-2 h-9 w-9 items-center justify-center">
              <Ionicons name="chevron-back" size={24} color={colors.textDark} />
            </Pressable>
            <Text className="text-xl font-bold text-text-dark">Change Password</Text>
          </View>

          <Text className="mb-1 mt-6 text-sm font-medium text-text-dark">New Password</Text>
          <View className="flex-row items-center rounded-xl bg-card px-4">
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

          <Text className="mb-1 mt-5 text-sm font-medium text-text-dark">Confirm Password</Text>
          <View className="flex-row items-center rounded-xl bg-card px-4">
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

          {errorMessage && (
            <Text className="mt-4 text-center text-sm" style={{ color: colors.riskHigh }}>
              {errorMessage}
            </Text>
          )}

          <Pressable
            onPress={handleSave}
            disabled={isSubmitting}
            className="mt-6 items-center rounded-2xl py-4"
            style={{ backgroundColor: colors.primary, opacity: isSubmitting ? 0.6 : 1 }}
          >
            <Text className="text-base font-semibold text-white">
              {isSubmitting ? 'Saving...' : 'Save Password'}
            </Text>
          </Pressable>
        </ScrollView>

        <SOSButton />

        <BottomTabBar active="profile" />
      </View>
    </SafeAreaView>
  );
}
