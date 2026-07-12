import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';

export type DoctorTabKey = 'dashboard' | 'alerts' | 'reports' | 'profile';

// Group-qualified hrefs disambiguate from the patient (patient)/profile route,
// which would otherwise collide on the bare "/profile" path.
const TABS: { key: DoctorTabKey; label: string; icon: keyof typeof Ionicons.glyphMap; route: '/(doctor)/dashboard' | '/(doctor)/alerts' | '/(doctor)/reports' | '/(doctor)/profile' }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'grid', route: '/(doctor)/dashboard' },
  { key: 'alerts', label: 'Alerts', icon: 'notifications-outline', route: '/(doctor)/alerts' },
  { key: 'reports', label: 'Reports', icon: 'document-text-outline', route: '/(doctor)/reports' },
  { key: 'profile', label: 'Profile', icon: 'person-outline', route: '/(doctor)/profile' },
];

/** Bottom tab bar shared by doctor screens. Dashboard is fully built; the rest link to placeholder screens. */
export function DoctorTabBar({ active }: { active: DoctorTabKey }) {
  const router = useRouter();

  return (
    <View className="flex-row border-t border-divider bg-card pb-6 pt-2">
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Pressable key={tab.key} onPress={() => router.push(tab.route)} className="flex-1 items-center">
            <Ionicons name={tab.icon} size={22} color={isActive ? colors.secondary : colors.textMuted} />
            <Text className="mt-0.5 text-[10px]" style={{ color: isActive ? colors.secondary : colors.textMuted }}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
