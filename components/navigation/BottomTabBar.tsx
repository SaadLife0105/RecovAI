import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';

export type PatientTabKey = 'home' | 'checkin' | 'history' | 'journal' | 'chat' | 'profile';

// Group-qualified hrefs: "/(doctor)/profile" and "/(patient)/profile" both
// exist, so the bare "/profile" path would resolve ambiguously.
const TABS: { key: PatientTabKey; label: string; icon: keyof typeof Ionicons.glyphMap; route: '/(patient)/home' | '/(patient)/check-in' | '/(patient)/history' | '/(patient)/journal' | '/(patient)/chat' | '/(patient)/profile' }[] = [
  { key: 'home', label: 'Home', icon: 'home', route: '/(patient)/home' },
  { key: 'checkin', label: 'Check-in', icon: 'checkmark-circle-outline', route: '/(patient)/check-in' },
  { key: 'history', label: 'History', icon: 'time-outline', route: '/(patient)/history' },
  { key: 'journal', label: 'Journal', icon: 'book-outline', route: '/(patient)/journal' },
  { key: 'chat', label: 'Chat', icon: 'chatbubble-ellipses-outline', route: '/(patient)/chat' },
  { key: 'profile', label: 'Profile', icon: 'person-outline', route: '/(patient)/profile' },
];

/** Bottom tab bar shared by all patient screens. Only Home and Check-in are fully built; the rest link to placeholder screens. */
export function BottomTabBar({ active }: { active: PatientTabKey }) {
  const router = useRouter();

  return (
    <View className="flex-row border-t border-divider bg-card pb-6 pt-2">
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Pressable key={tab.key} onPress={() => router.push(tab.route)} className="flex-1 items-center">
            <Ionicons name={tab.icon} size={22} color={isActive ? colors.primary : colors.textMuted} />
            <Text className="mt-0.5 text-[10px]" style={{ color: isActive ? colors.primary : colors.textMuted }}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
