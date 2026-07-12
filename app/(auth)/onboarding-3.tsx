import { View, Text, Image, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '../../constants/theme';
import { OnboardingDots } from '../../components/cards/OnboardingDots';
import { SOSButton } from '../../components/sos/SOSButton';
import { BottomTabBar } from '../../components/navigation/BottomTabBar';

/**
 * Slide 3 illustration — no single asset shows a chat bubble paired with a
 * heart bubble, so this combines two existing illustrations rather than
 * hand-building new bubble shapes: 02-two-chat-bubbles.png as the base,
 * with 13-speech-bubble-with-heart.png layered as a smaller accent
 * bubble, matching the mockup's composition.
 */
function OnboardingHero() {
  return (
    <View style={{ width: 200, height: 200 }} className="items-center justify-center">
      <Image
        source={require('../../assets/illustrations/02-two-chat-bubbles.png')}
        style={{ width: 200, height: 200 }}
        resizeMode="contain"
      />
      <Image
        source={require('../../assets/illustrations/13-speech-bubble-with-heart.png')}
        style={{ width: 76, height: 76, position: 'absolute', bottom: 4, right: 0 }}
        resizeMode="contain"
      />
    </View>
  );
}

/** Screen 27 — Patient Onboarding 3/3. Last slide: no Skip link, "Get Started" instead of "Next". */
export default function Onboarding3() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1">
        <View className="flex-1 px-6 pt-2">
          <View className="items-end h-6" />

          <View className="flex-1 items-center justify-center">
            <OnboardingHero />
            <Text className="mt-6 text-center text-2xl font-bold text-text-dark">You&apos;re never alone</Text>
            <Text className="mt-2 text-center text-sm text-text-muted">
              Our AI companion is here 24/7 to support you through difficult moments.
            </Text>
          </View>

          <OnboardingDots total={3} activeIndex={2} />

          <Pressable
            onPress={() => router.push('/(patient)/home')}
            className="mb-6 mt-5 items-center rounded-2xl py-4"
            style={{ backgroundColor: colors.primary }}
          >
            <Text className="text-base font-semibold text-white">Get Started</Text>
          </Pressable>
        </View>

        <SOSButton />

        <BottomTabBar active="home" />
      </View>
    </SafeAreaView>
  );
}
