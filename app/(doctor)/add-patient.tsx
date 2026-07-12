import { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { SOSButton } from '../../components/sos/SOSButton';
import { DoctorTabBar } from '../../components/navigation/DoctorTabBar';

/** Screen 11 — Doctor Add Patient. Static UI; account creation is wired in a later phase. */
export default function AddPatient() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showTempPassword, setShowTempPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1">
        <ScrollView contentContainerClassName="px-5 pb-10" showsVerticalScrollIndicator={false}>
          <Pressable onPress={() => router.back()} className="mb-2 mt-2 h-9 w-9 items-center justify-center">
            <Ionicons name="chevron-back" size={24} color={colors.textDark} />
          </Pressable>

          <Text className="text-2xl font-bold text-text-dark">Add New Patient</Text>

          <Text className="mb-1 mt-6 text-sm font-medium text-text-dark">Full Name</Text>
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            placeholder="Enter full name"
            placeholderTextColor={colors.textMuted}
            className="rounded-xl bg-card px-4 py-3 text-text-dark"
          />

          <Text className="mb-1 mt-5 text-sm font-medium text-text-dark">Username</Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder="Enter username"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            className="rounded-xl bg-card px-4 py-3 text-text-dark"
          />

          <Text className="mb-1 mt-5 text-sm font-medium text-text-dark">Temporary Password</Text>
          <View className="flex-row items-center rounded-xl bg-card px-4">
            <TextInput
              value={tempPassword}
              onChangeText={setTempPassword}
              placeholder="Enter temporary password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showTempPassword}
              className="flex-1 py-3 text-text-dark"
            />
            <Pressable onPress={() => setShowTempPassword((v) => !v)}>
              <Ionicons name={showTempPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          <Text className="mb-1 mt-5 text-sm font-medium text-text-dark">Confirm Password</Text>
          <View className="flex-row items-center rounded-xl bg-card px-4">
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm temporary password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showConfirmPassword}
              className="flex-1 py-3 text-text-dark"
            />
            <Pressable onPress={() => setShowConfirmPassword((v) => !v)}>
              <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          <Text className="mb-1 mt-5 text-sm font-medium text-text-dark">Start Date</Text>
          <View className="flex-row items-center justify-between rounded-xl bg-card px-4 py-3">
            <Text className="text-sm" style={{ color: colors.textMuted }}>Select start date</Text>
            <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
          </View>

          <Pressable
            onPress={() => router.push('/(doctor)/dashboard')}
            className="mt-8 items-center rounded-2xl py-4"
            style={{ backgroundColor: colors.primary }}
          >
            <Text className="text-base font-semibold text-white">Create Patient</Text>
          </Pressable>
        </ScrollView>

        <SOSButton />

        <DoctorTabBar active="dashboard" />
      </View>
    </SafeAreaView>
  );
}
