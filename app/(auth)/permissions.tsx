import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';

const PERMISSIONS: { icon: keyof typeof Ionicons.glyphMap; title: string; description: string }[] = [
  { icon: 'location-outline', title: 'Location', description: 'Helps monitor your surroundings and safety.' },
  { icon: 'walk-outline', title: 'Activity', description: 'Tracks steps and movement for better insights.' },
  { icon: 'notifications-outline', title: 'Notifications', description: 'Sends reminders and important updates.' },
  { icon: 'heart-outline', title: 'Health Data', description: 'Helps personalize your recovery plan.' },
];

/** Screen 4 — Permissions request. Static UI only; no real permission prompts wired yet. */
export default function Permissions() {
  const router = useRouter();
  const { role } = useLocalSearchParams<{ role?: string }>();
  // Group-qualified: "/(doctor)/profile" and "/(patient)/profile" both exist,
  // so any bare path shared between the two groups would resolve ambiguously.
  const destination = role === 'doctor' ? '/(doctor)/dashboard' : '/(patient)/home';

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <View className="flex-1 px-5 pt-4">
        <Pressable onPress={() => router.back()} accessibilityLabel="Go back" hitSlop={8} className="mb-4 h-9 w-9 items-center justify-center">
          <Ionicons name="chevron-back" size={24} color={colors.textDark} />
        </Pressable>

        <Text className="text-2xl font-bold text-text-dark">We need a few permissions</Text>
        <Text className="mt-1 text-sm text-text-muted">These help us provide better insights and support.</Text>

        <View className="mt-6">
          {PERMISSIONS.map((p) => (
            <View key={p.title} className="mb-4 flex-row items-center rounded-2xl bg-card p-4">
              <View className="mr-4 h-11 w-11 items-center justify-center rounded-full bg-surface">
                <Ionicons name={p.icon} size={20} color={colors.primary} />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-text-dark">{p.title}</Text>
                <Text className="mt-0.5 text-xs text-text-muted">{p.description}</Text>
              </View>
            </View>
          ))}
        </View>

        <View className="flex-1" />

        <Pressable
          onPress={() => router.push(destination)}
          className="mb-6 items-center rounded-2xl py-4"
          style={{ backgroundColor: colors.primary }}
        >
          <Text className="text-base font-semibold text-white">Allow All</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
