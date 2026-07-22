import { useState } from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '../../constants/theme';
import { OnboardingDots } from '../../components/cards/OnboardingDots';
import { useToast } from '../../components/toast/ToastProvider';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/hooks/useSession';

const SLIDES = [
  {
    illustration: require('../../assets/illustrations/27-sunrise-new-beginning.png'),
    title: 'Welcome to RecovAI',
    body: 'Check in daily, track your risk score, and see your progress over time.',
  },
  {
    illustration: require('../../assets/illustrations/13-speech-bubble-with-heart.png'),
    title: "We're here for you",
    body: 'Chat support anytime, a private journal, and SOS always one tap away.',
  },
  {
    illustration: require('../../assets/illustrations/20-doctor-avatar.png'),
    title: 'Your care team is connected',
    body: 'Your doctor sees your progress and can reach out if needed.',
  },
] as const;

/** First-login walkthrough. Shown once, gated by profiles.onboarding_completed in (patient)/_layout.tsx. */
export default function Onboarding() {
  const router = useRouter();
  const { session } = useSession();
  const { showToast } = useToast();
  const [index, setIndex] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);

  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  // Skip and Finish are the same path — skipping isn't a lesser outcome, just
  // a faster one to it. If the write fails we still let them in rather than
  // trapping them here; they'd simply see the walkthrough again next launch.
  async function complete() {
    if (isFinishing) return;
    setIsFinishing(true);

    const patientId = session?.user.id;
    if (patientId) {
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', patientId);
      if (error) {
        // Was console.warn-only: the patient still landed on home, with no
        // hint that the walkthrough would reappear on their next launch.
        console.warn('Could not save onboarding completion:', error.message);
        showToast("Couldn't save your progress — you may see this again next time.");
      }
    }

    router.replace('/(patient)/home');
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <View className="flex-1 px-6">
        <View className="flex-row justify-end py-2">
          <Pressable onPress={complete} hitSlop={12} disabled={isFinishing}>
            <Text className="text-base font-semibold" style={{ color: colors.textMuted }}>
              Skip
            </Text>
          </Pressable>
        </View>

        <View className="flex-1 items-center justify-center">
          <Image source={slide.illustration} style={{ width: 220, height: 220 }} resizeMode="contain" />
          <Text className="mt-8 text-center text-2xl font-bold text-text-dark">{slide.title}</Text>
          <Text className="mt-3 text-center text-base leading-6 text-text-muted">{slide.body}</Text>
        </View>

        <View className="mb-6">
          <OnboardingDots total={SLIDES.length} activeIndex={index} />
        </View>

        <Pressable
          onPress={() => (isLast ? complete() : setIndex(index + 1))}
          disabled={isFinishing}
          className="mb-4 w-full items-center rounded-2xl py-4"
          style={{ backgroundColor: colors.primary, opacity: isFinishing ? 0.6 : 1 }}
        >
          <Text className="text-base font-semibold text-white">{isLast ? 'Get Started' : 'Next'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
