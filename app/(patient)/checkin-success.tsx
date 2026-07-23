import { View, Text, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../../constants/theme';
import { StreakCard } from '../../components/cards/StreakCard';
import { SOSButton } from '../../components/sos/SOSButton';
import { BottomTabBar } from '../../components/navigation/BottomTabBar';
import { useStreak } from '../../lib/hooks/useStreak';

// Scattered celebration dots around the success illustration — angle (deg), radius, size, color.
const CONFETTI_DOTS: { angle: number; radius: number; size: number; color: string }[] = [
  { angle: 20, radius: 95, size: 5, color: colors.riskMedium },
  { angle: 60, radius: 100, size: 4, color: colors.riskLow },
  { angle: 100, radius: 96, size: 3, color: colors.primary },
  { angle: 140, radius: 100, size: 5, color: colors.riskMedium },
  { angle: 180, radius: 95, size: 4, color: colors.riskLow },
  { angle: 220, radius: 100, size: 3, color: colors.primary },
  { angle: 260, radius: 96, size: 5, color: colors.riskMedium },
  { angle: 300, radius: 100, size: 4, color: colors.riskLow },
  { angle: 340, radius: 95, size: 3, color: colors.primary },
];

/** Dotted celebration ring — inline SVG (no illustration asset covers scattered confetti dots). The checkmark itself is the real illustration asset, layered on top. */
function ConfettiRing() {
  const size = 220;
  const c = size / 2;

  return (
    <Svg width={size} height={size} style={{ position: 'absolute' }}>
      {CONFETTI_DOTS.map((dot, i) => {
        const rad = (dot.angle * Math.PI) / 180;
        return (
          <Circle
            key={i}
            cx={c + dot.radius * Math.cos(rad)}
            cy={c + dot.radius * Math.sin(rad)}
            r={dot.size}
            fill={dot.color}
          />
        );
      })}
    </Svg>
  );
}

/** Screen 8 — Check-in Success. */
export default function CheckInSuccess() {
  const router = useRouter();
  const { data: streak } = useStreak();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1">
        <View className="flex-1 items-center px-6 pt-10">
          <View style={{ width: 220, height: 220 }} className="items-center justify-center">
            <ConfettiRing />
            <Image
              source={require('../../assets/illustrations/19-success-checkmark.png')}
              style={{ width: 170, height: 170 }}
              resizeMode="contain"
            />
          </View>
          <Text className="mt-4 text-center text-2xl font-bold text-text-dark">Check-in complete!</Text>
          <Text className="mt-1 text-center text-sm text-text-muted">Great job staying on track today.</Text>

          <View className="mt-6 w-full">
            <StreakCard days={streak.currentStreak} variant="card" tagline="Keep it up!" status="On Fire!" />
          </View>

          <Pressable
            onPress={() => router.push('/history')}
            className="mt-6 w-full items-center rounded-2xl border-2 py-4"
            style={{ borderColor: colors.primary }}
          >
            <Text className="text-base font-semibold" style={{ color: colors.primary }}>
              View History
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/home')}
            className="mt-3 w-full items-center rounded-2xl py-4"
            style={{ backgroundColor: colors.primary }}
          >
            <Text className="text-base font-semibold text-white">Go Home</Text>
          </Pressable>
        </View>

        <SOSButton />

        <BottomTabBar />
      </View>
    </SafeAreaView>
  );
}
