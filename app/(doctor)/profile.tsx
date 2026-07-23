import { View, Text, Image, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { DoctorTabBar } from '../../components/navigation/DoctorTabBar';
import { useToast } from '../../components/toast/ToastProvider';
import { useDoctorProfile } from '../../lib/hooks/useDoctorProfile';
import { usePatients } from '../../lib/hooks/usePatients';
import { formatDateLabel } from '../../lib/formatDate';
import { supabase } from '../../lib/supabase';

const PREFERENCES_ROWS: { icon: keyof typeof Ionicons.glyphMap; label: string; value?: string; route?: '/(doctor)/alert-preferences' | '/(doctor)/change-password' | '/(doctor)/edit-profile'; danger?: boolean }[] = [
  { icon: 'notifications-outline', label: 'Alert Preferences', route: '/(doctor)/alert-preferences' },
  { icon: 'create-outline', label: 'Edit Profile', route: '/(doctor)/edit-profile' },
  { icon: 'lock-closed-outline', label: 'Change Password', route: '/(doctor)/change-password' },
  { icon: 'log-out-outline', label: 'Log Out', danger: true },
];

/** Screen 15a — Doctor Profile. Wired to useDoctorProfile()/usePatients(). */
export default function DoctorProfile() {
  const router = useRouter();
  const { data: profile } = useDoctorProfile();
  const { data: patients } = usePatients();
  const { showToast } = useToast();

  // Same silent gap as the patient profile: a failed signOut() left the row
  // looking inert with nothing shown.
  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) showToast("Couldn't sign out. Please try again.");
  };

  if (!profile) return null;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1">
        <ScrollView contentContainerClassName="px-5 pb-10" showsVerticalScrollIndicator={false}>
          <View className="mt-2 flex-row items-center">
            <Image
              source={require('../../assets/illustrations/20-doctor-avatar.png')}
              style={{ width: 56, height: 56, borderRadius: 28 }}
            />
            <View className="ml-3">
              <Text className="text-lg font-bold text-text-dark">{profile.fullName}</Text>
              <Text className="text-sm text-text-muted">{profile.specialty}</Text>
              <Text className="text-xs text-text-muted">Joined {formatDateLabel(profile.joinedDate)}</Text>
            </View>
          </View>

          <View className="mt-4 flex-row gap-3">
            <View className="flex-1 items-center rounded-2xl bg-card p-4">
              <Text className="text-xs text-text-muted">Patients</Text>
              <Text className="mt-1 text-2xl font-bold text-text-dark">{patients.totalPatients}</Text>
            </View>
            <View className="flex-1 items-center rounded-2xl bg-card p-4">
              <Text className="text-xs text-text-muted">High Risk</Text>
              <Text className="mt-1 text-2xl font-bold" style={{ color: colors.riskHighText }}>
                {patients.highRisk}
              </Text>
            </View>
          </View>

          <Text className="mb-2 mt-6 text-sm font-semibold text-text-dark">Preferences</Text>
          <View className="overflow-hidden rounded-2xl bg-card">
            {PREFERENCES_ROWS.map((row, i) => (
              <Pressable
                key={row.label}
                onPress={row.route ? () => router.push(row.route!) : row.danger ? handleSignOut : undefined}
                className="flex-row items-center px-4 py-4"
                style={i < PREFERENCES_ROWS.length - 1 ? { borderBottomWidth: 1, borderBottomColor: colors.divider } : undefined}
              >
                <Ionicons name={row.icon} size={18} color={row.danger ? colors.riskHigh : colors.textMuted} />
                <Text
                  className="ml-3 flex-1 text-sm font-medium"
                  style={{ color: row.danger ? colors.riskHigh : colors.textDark }}
                >
                  {row.label}
                </Text>
                {row.value ? <Text className="mr-2 text-sm text-text-muted">{row.value}</Text> : null}
                {!row.danger ? <Ionicons name="chevron-forward" size={16} color={colors.textMuted} /> : null}
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <DoctorTabBar active="profile" />
      </View>
    </SafeAreaView>
  );
}
