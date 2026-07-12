import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import type { UserRole } from '../../lib/types';

const ROLES: { role: UserRole; title: string; description: string; icon: keyof typeof Ionicons.glyphMap; accent: string; accentBg: string }[] = [
  {
    role: 'patient',
    title: 'Patient',
    description: 'Track your recovery and get support every step of the way.',
    icon: 'person',
    accent: colors.primary,
    accentBg: colors.background,
  },
  {
    role: 'doctor',
    title: 'Doctor',
    description: 'Monitor your patients and help them stay on track.',
    icon: 'medkit',
    accent: colors.secondary,
    accentBg: colors.background,
  },
];

/** Screen 2 — Role Select. Patient starts selected, matching the mockup. */
export default function RoleSelect() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <View className="flex-1 px-5 pt-6">
        <Text className="text-2xl font-bold text-text-dark">Choose your role</Text>
        <Text className="mt-1 text-sm text-text-muted">Select how you want to continue</Text>

        <View className="mt-6">
          {ROLES.map((r) => {
            const isSelected = r.role === 'patient';
            return (
              <Pressable
                key={r.role}
                onPress={() => router.push({ pathname: '/login', params: { role: r.role } })}
                className="mb-4 flex-row items-center rounded-2xl border-2 bg-card p-4"
                style={{ borderColor: isSelected ? r.accent : colors.divider }}
              >
                <View
                  className="mr-4 h-14 w-14 items-center justify-center rounded-full"
                  style={{ backgroundColor: r.accentBg }}
                >
                  <Ionicons name={r.icon} size={26} color={r.accent} />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-text-dark">{r.title}</Text>
                  <Text className="mt-0.5 text-sm text-text-muted">{r.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </Pressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}
