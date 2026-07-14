import { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

/** Doctor self-registration. Nothing routes patients here — their accounts are created by their doctor. */
export default function Register() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);

  const handleRegister = async () => {
    setErrorMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim() } },
    });

    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    if (data.session) {
      router.replace({ pathname: '/(auth)/permissions', params: { role: 'doctor' } });
    } else {
      setNeedsEmailConfirmation(true);
    }
  };

  if (needsEmailConfirmation) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
        <View className="flex-1 items-center justify-center px-5">
          <Text className="text-center text-base text-text-dark">
            Check your email to confirm your account, then log in.
          </Text>
          <Pressable
            onPress={() => router.replace('/(auth)/login')}
            className="mt-6 items-center rounded-2xl px-6 py-4"
            style={{ backgroundColor: colors.primary }}
          >
            <Text className="text-base font-semibold text-white">Back to Log In</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <View className="flex-1 px-5 pt-4">
        <Pressable onPress={() => router.back()} className="mb-4 h-9 w-9 items-center justify-center">
          <Ionicons name="chevron-back" size={24} color={colors.textDark} />
        </Pressable>

        <Text className="text-2xl font-bold text-text-dark">Create your account</Text>

        <Text className="mb-1 mt-6 text-sm font-medium text-text-dark">Full Name</Text>
        <TextInput
          value={fullName}
          onChangeText={setFullName}
          placeholder="Enter full name"
          placeholderTextColor={colors.textMuted}
          className="rounded-xl bg-card px-4 py-3 text-text-dark"
        />

        <Text className="mb-1 mt-5 text-sm font-medium text-text-dark">Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Enter your email"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
          className="rounded-xl bg-card px-4 py-3 text-text-dark"
        />

        <Text className="mb-1 mt-5 text-sm font-medium text-text-dark">Password</Text>
        <View className="flex-row items-center rounded-xl bg-card px-4">
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Enter password"
            placeholderTextColor={colors.textMuted}
            secureTextEntry={!showPassword}
            className="flex-1 py-3 text-text-dark"
          />
          <Pressable onPress={() => setShowPassword((v) => !v)}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
          </Pressable>
        </View>

        <Text className="mb-1 mt-5 text-sm font-medium text-text-dark">Confirm Password</Text>
        <View className="flex-row items-center rounded-xl bg-card px-4">
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm password"
            placeholderTextColor={colors.textMuted}
            secureTextEntry={!showConfirmPassword}
            className="flex-1 py-3 text-text-dark"
          />
          <Pressable onPress={() => setShowConfirmPassword((v) => !v)}>
            <Ionicons
              name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.textMuted}
            />
          </Pressable>
        </View>

        <Pressable
          onPress={handleRegister}
          disabled={isSubmitting}
          className="mt-6 items-center rounded-2xl py-4"
          style={{ backgroundColor: colors.primary, opacity: isSubmitting ? 0.7 : 1 }}
        >
          <Text className="text-base font-semibold text-white">
            {isSubmitting ? 'Creating account...' : 'Sign Up'}
          </Text>
        </Pressable>

        {errorMessage && (
          <Text className="mt-3 text-center text-sm" style={{ color: colors.riskHigh }}>
            {errorMessage}
          </Text>
        )}

        <Text className="mt-4 text-center text-sm text-text-muted">
          Already have an account?{' '}
          <Text
            className="font-semibold"
            style={{ color: colors.primary }}
            onPress={() => router.push('/(auth)/login')}
          >
            Log in
          </Text>
        </Text>
      </View>
    </SafeAreaView>
  );
}
