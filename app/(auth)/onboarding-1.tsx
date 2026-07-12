import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Rect } from 'react-native-svg';
import { colors } from '../../constants/theme';
import { OnboardingDots } from '../../components/cards/OnboardingDots';
import { SOSButton } from '../../components/sos/SOSButton';
import { BottomTabBar } from '../../components/navigation/BottomTabBar';

/**
 * Slide 1 illustration — no single illustration asset matches "phone with a
 * heart, orbited by mood/sleep/activity context icons" (checked
 * docs/Illustrations.md; 10-phone-with-health-icons.png and
 * 11-phone-with-recovery-logo.png are the closest but show different
 * content inside/around the phone). Built as a one-off custom
 * composition, same exception basis as the Add Zone map preview.
 */
function OnboardingHero() {
  return (
    <View style={{ width: 220, height: 220 }} className="items-center justify-center">
      <Svg width={140} height={220}>
        <Rect x={10} y={10} width={120} height={200} rx={24} fill={colors.card} stroke={colors.primary} strokeWidth={4} />
      </Svg>
      <View style={{ position: 'absolute' }}>
        <Ionicons name="heart" size={40} color={colors.primary} />
      </View>
      <View className="absolute left-0 top-4 h-11 w-11 items-center justify-center rounded-full bg-surface">
        <Ionicons name="moon" size={20} color={colors.primary} />
      </View>
      <View className="absolute right-2 top-10 h-11 w-11 items-center justify-center rounded-full bg-surface">
        <Ionicons name="happy" size={20} color={colors.primary} />
      </View>
      <View className="absolute bottom-6 left-4 h-11 w-11 items-center justify-center rounded-full bg-surface">
        <Ionicons name="bar-chart" size={20} color={colors.primary} />
      </View>
    </View>
  );
}

/** Screen 25 — Patient Onboarding 1/3. Static UI; flow sequencing (before/after first-login) is resolved later. */
export default function Onboarding1() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1">
        <View className="flex-1 px-6 pt-2">
          <View className="items-end">
            <Pressable onPress={() => router.push('/(patient)/home')}>
              <Text className="text-sm font-medium" style={{ color: colors.primary }}>
                Skip
              </Text>
            </Pressable>
          </View>

          <View className="flex-1 items-center justify-center">
            <OnboardingHero />
            <Text className="mt-6 text-center text-2xl font-bold text-text-dark">Track your recovery daily</Text>
            <Text className="mt-2 text-center text-sm text-text-muted">
              Check in every day to monitor your mood, sleep, and cravings.
            </Text>
          </View>

          <OnboardingDots total={3} activeIndex={0} />

          <Pressable
            onPress={() => router.push('/(auth)/onboarding-2')}
            className="mb-6 mt-5 items-center rounded-2xl py-4"
            style={{ backgroundColor: colors.primary }}
          >
            <Text className="text-base font-semibold text-white">Next</Text>
          </Pressable>
        </View>

        <SOSButton />

        <BottomTabBar active="home" />
      </View>
    </SafeAreaView>
  );
}
