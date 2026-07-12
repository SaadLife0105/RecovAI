import { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import type { UserRole } from '../../lib/types';

/** Screen 3 — Login. Static UI only; no real auth wiring yet. */
export default function Login() {
  const router = useRouter();
  const { role: roleParam } = useLocalSearchParams<{ role?: string }>();
  const role: UserRole = roleParam === 'doctor' ? 'doctor' : 'patient';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <View className="flex-1 px-5 pt-4">
        <Pressable onPress={() => router.back()} className="mb-4 h-9 w-9 items-center justify-center">
          <Ionicons name="chevron-back" size={24} color={colors.textDark} />
        </Pressable>

        <Text className="text-2xl font-bold text-text-dark">Welcome back</Text>
        <Text className="mt-1 text-sm text-text-muted">Log in to your account</Text>

        <Text className="mb-1 mt-6 text-sm font-medium text-text-dark">Role</Text>
        <View className="flex-row items-center rounded-xl bg-card px-4 py-3">
          <Ionicons
            name={role === 'doctor' ? 'medkit-outline' : 'person-outline'}
            size={18}
            color={role === 'doctor' ? colors.secondary : colors.primary}
          />
          <Text className="ml-2 flex-1 text-sm font-medium text-text-dark">
            {role === 'doctor' ? 'Doctor' : 'Patient'}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>

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
            placeholder="Enter your password"
            placeholderTextColor={colors.textMuted}
            secureTextEntry={!showPassword}
            className="flex-1 py-3 text-text-dark"
          />
          <Pressable onPress={() => setShowPassword((v) => !v)}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
          </Pressable>
        </View>

        <Pressable className="mt-3 self-end">
          <Text className="text-sm font-medium" style={{ color: colors.primary }}>
            Forgot password?
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.push({ pathname: '/permissions', params: { role } })}
          className="mt-6 items-center rounded-2xl py-4"
          style={{ backgroundColor: colors.primary }}
        >
          <Text className="text-base font-semibold text-white">Log In</Text>
        </Pressable>

        <Text className="mt-4 text-center text-sm text-text-muted">
          Don&apos;t have an account?{' '}
          <Text className="font-semibold" style={{ color: colors.primary }}>
            Sign up
          </Text>
        </Text>
      </View>
    </SafeAreaView>
  );
}
