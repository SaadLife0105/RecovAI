import { View, Text, Image, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '../../constants/theme';
import { OnboardingDots } from '../../components/cards/OnboardingDots';
import { SOSButton } from '../../components/sos/SOSButton';
import { BottomTabBar } from '../../components/navigation/BottomTabBar';

/** Screen 26 — Patient Onboarding 2/3. */
export default function Onboarding2() {
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
            <Image
              source={require('../../assets/illustrations/18-map-with-circular-geofence-around-pin.png')}
              style={{ width: 200, height: 200 }}
              resizeMode="contain"
            />
            <Text className="mt-6 text-center text-2xl font-bold text-text-dark">Stay aware of your surroundings</Text>
            <Text className="mt-2 text-center text-sm text-text-muted">
              Your doctor assigns zones to help keep you on the right path.
            </Text>
          </View>

          <OnboardingDots total={3} activeIndex={1} />

          <Pressable
            onPress={() => router.push('/(auth)/onboarding-3')}
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
