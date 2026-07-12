import { useState } from 'react';
import { View, Text, Image, TextInput, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { usePatientProfile } from '../../lib/hooks/usePatientProfile';
import { SOSButton } from '../../components/sos/SOSButton';
import { BottomTabBar } from '../../components/navigation/BottomTabBar';
import { PATIENT_PREFERENCES } from '../../lib/mockData';

// Not modeled on Profile yet (see docs/Known-Issues.md #4 scope note on
// what belongs in a hook vs. local state) — contact/DOB fields aren't
// part of the documented `profiles` schema, so they stay local mock
// values here rather than speculatively extending the shared Profile type.
const MOCK_DOB = 'May 12, 1997';
const MOCK_PHONE = '+230 5 123 4567';
const MOCK_EMAIL = 'alex.brown@example.com';

const PREFERENCES_ROWS: { icon: keyof typeof Ionicons.glyphMap; label: string; value?: string; route?: '/(patient)/change-password' }[] = [
  { icon: 'alarm-outline', label: 'Daily Check-in Reminder', value: PATIENT_PREFERENCES.checkInReminderTime },
  { icon: 'notifications-outline', label: 'Notifications', value: PATIENT_PREFERENCES.notificationsEnabled ? 'Enabled' : 'Disabled' },
  { icon: 'shield-outline', label: 'Privacy & Data' },
  { icon: 'lock-closed-outline', label: 'Change Password', route: '/(patient)/change-password' },
];

/** Patient Edit Profile — reached from profile.tsx's gear icon. Static UI; no real persistence yet. */
export default function EditProfile() {
  const router = useRouter();
  const { data: profile } = usePatientProfile();
  const [fullName, setFullName] = useState(profile?.fullName ?? '');
  const [phone, setPhone] = useState(MOCK_PHONE);
  const [email, setEmail] = useState(MOCK_EMAIL);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1">
        <ScrollView contentContainerClassName="px-5 pb-10" showsVerticalScrollIndicator={false}>
          <View className="mt-2 flex-row items-center justify-between">
            <Pressable onPress={() => router.back()} className="h-9 w-9 items-center justify-center">
              <Ionicons name="chevron-back" size={24} color={colors.textDark} />
            </Pressable>
            <Text className="text-lg font-bold text-text-dark">Edit Profile</Text>
            <Pressable onPress={() => router.back()} className="h-9 items-center justify-center">
              <Text className="text-base font-semibold" style={{ color: colors.primary }}>
                Save
              </Text>
            </Pressable>
          </View>

          <Text className="mb-2 mt-6 text-sm font-medium text-text-dark">Profile Photo</Text>
          <View className="items-center">
            <View style={{ width: 100, height: 100 }}>
              <Image
                source={require('../../assets/illustrations/21-patient-avatar.png')}
                style={{ width: 100, height: 100, borderRadius: 50 }}
              />
              <Pressable
                className="absolute bottom-0 right-0 h-8 w-8 items-center justify-center rounded-full border-2 border-background"
                style={{ backgroundColor: colors.primary }}
              >
                <Ionicons name="camera" size={16} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>

          <Text className="mb-1 mt-6 text-sm font-medium text-text-dark">Full Name</Text>
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            placeholderTextColor={colors.textMuted}
            className="rounded-xl bg-card px-4 py-3 text-text-dark"
          />

          <Text className="mb-1 mt-5 text-sm font-medium text-text-dark">Date of Birth</Text>
          <View className="flex-row items-center justify-between rounded-xl bg-card px-4 py-3">
            <Text className="text-sm text-text-dark">{MOCK_DOB}</Text>
            <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
          </View>

          <Text className="mb-1 mt-5 text-sm font-medium text-text-dark">Phone Number</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholderTextColor={colors.textMuted}
            className="rounded-xl bg-card px-4 py-3 text-text-dark"
          />

          <Text className="mb-1 mt-5 text-sm font-medium text-text-dark">Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholderTextColor={colors.textMuted}
            className="rounded-xl bg-card px-4 py-3 text-text-dark"
          />

          <Text className="mb-2 mt-6 text-sm font-semibold text-text-dark">Recovery Preferences</Text>
          <View className="overflow-hidden rounded-2xl bg-card">
            {PREFERENCES_ROWS.map((row, i) => (
              <Pressable
                key={row.label}
                onPress={row.route ? () => router.push(row.route!) : undefined}
                className="flex-row items-center px-4 py-4"
                style={i < PREFERENCES_ROWS.length - 1 ? { borderBottomWidth: 1, borderBottomColor: colors.divider } : undefined}
              >
                <Ionicons name={row.icon} size={18} color={colors.textMuted} />
                <Text className="ml-3 flex-1 text-sm font-medium text-text-dark">{row.label}</Text>
                {row.value ? <Text className="mr-2 text-sm text-text-muted">{row.value}</Text> : null}
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <SOSButton />

        <BottomTabBar active="profile" />
      </View>
    </SafeAreaView>
  );
}
