import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';

export type PatientTabKey = 'home' | 'history' | 'journal' | 'chat' | 'profile';

// Group-qualified hrefs: "/(doctor)/profile" and "/(patient)/profile" both
// exist, so the bare "/profile" path would resolve ambiguously.
const TABS: { key: PatientTabKey; label: string; icon: keyof typeof Ionicons.glyphMap; route: '/(patient)/home' | '/(patient)/history' | '/(patient)/journal' | '/(patient)/chat' | '/(patient)/profile' }[] = [
  { key: 'home', label: 'Home', icon: 'home', route: '/(patient)/home' },
  { key: 'history', label: 'History', icon: 'time-outline', route: '/(patient)/history' },
  { key: 'journal', label: 'Journal', icon: 'book-outline', route: '/(patient)/journal' },
  { key: 'chat', label: 'Chat', icon: 'chatbubble-ellipses-outline', route: '/(patient)/chat' },
  { key: 'profile', label: 'Profile', icon: 'person-outline', route: '/(patient)/profile' },
];

/** Bottom tab bar shared by all patient screens. */
// `active` is optional: the post-check-in flow screens (success, missed,
// relapse-logged) aren't any tab, so they render the bar with nothing lit.
export function BottomTabBar({ active }: { active?: PatientTabKey }) {
  const router = useRouter();

  return (
    <View className="flex-row border-t border-divider bg-card pb-6 pt-2">
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            // Tapping the tab you're already on used to re-push the same
            // route, remounting the whole screen and refetching everything —
            // felt like a full reload for no reason. No-op instead.
            onPress={() => {
              if (!isActive) router.push(tab.route);
            }}
            className="flex-1 items-center"
          >
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
