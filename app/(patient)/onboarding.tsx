import { useEffect, useState } from 'react';
import { View, Text, Pressable, Image, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { OnboardingDots } from '../../components/cards/OnboardingDots';
import { useToast } from '../../components/toast/ToastProvider';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/hooks/useSession';
import { usePatientProfile } from '../../lib/hooks/usePatientProfile';
import { AVATAR_OPTIONS } from '../../lib/avatarOptions';

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

// Info slides with a "Set It Up" action: same illustration+heading+body format
// as the static slides, but each links out to the existing help screen (via
// push, so back returns here). Tapping through is optional — like permissions,
// the OS setup is requested contextually later, not blocked on here.
const ACTION_SLIDES = [
  {
    illustration: require('../../assets/illustrations/18-map-with-circular-geofence-around-pin.png'),
    title: 'Location Tracking',
    body: 'RecovAI can watch for the risky zones you and your doctor set, and only works if background location stays on.',
    route: '/(patient)/location-help',
  },
  {
    illustration: require('../../assets/illustrations/39-shoe-step-counter.png'),
    title: 'Step Tracking',
    body: 'Your daily steps quietly hint at how active you are, so your risk score reflects real life without extra taps from you.',
    route: '/(patient)/steps-help',
  },
] as const;

// The 3 static slides are followed by 2 action slides, then two interactive
// steps, so `index` runs past SLIDES.length rather than being bounded by it.
const ACTION_START = SLIDES.length;
const AVATAR_STEP = SLIDES.length + ACTION_SLIDES.length;
const EMAIL_STEP = AVATAR_STEP + 1;
const TOTAL_STEPS = EMAIL_STEP + 1;

// Permissive on purpose — the point is to catch a typo like a missing "@",
// not to adjudicate RFC 5322. Nothing is sent to this address in this bundle.
const LOOKS_LIKE_EMAIL = /^\S+@\S+\.\S+$/;

/** First-login walkthrough. Shown once, gated by profiles.onboarding_completed in (patient)/_layout.tsx. */
export default function Onboarding() {
  const router = useRouter();
  const { session } = useSession();
  const { showToast } = useToast();
  const { data: profile } = usePatientProfile();
  const [index, setIndex] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);
  // Preselected so Next/Skip always has something valid to persist.
  const [avatarKey, setAvatarKey] = useState(AVATAR_OPTIONS[0].key);
  const [email, setEmail] = useState('');
  const [emailWarning, setEmailWarning] = useState(false);
  // A patient created after the "doctor provides email" change already has a
  // contact_email at first login. Seed the field with it once the profile
  // loads, and flip this step from first-entry to review-and-correct. A legacy
  // patient with no email keeps the original blank, optional behaviour.
  const [emailWasPrefilled, setEmailWasPrefilled] = useState(false);
  const [emailHydrated, setEmailHydrated] = useState(false);
  useEffect(() => {
    if (emailHydrated || !profile) return;
    if (profile.contactEmail) {
      setEmail(profile.contactEmail);
      setEmailWasPrefilled(true);
    }
    setEmailHydrated(true);
  }, [emailHydrated, profile]);

  const slide = index < SLIDES.length ? SLIDES[index] : null;
  const actionSlide =
    index >= ACTION_START && index < AVATAR_STEP ? ACTION_SLIDES[index - ACTION_START] : null;
  const isLast = index === TOTAL_STEPS - 1;

  // Skip and Finish are the same path — skipping isn't a lesser outcome, just
  // a faster one to it. Skipping from any step still saves whatever's been
  // chosen so far: the default avatar, and a null email if never filled in.
  // If the write fails we still let them in rather than trapping them here;
  // they'd simply see the walkthrough again next launch.
  async function complete() {
    if (isFinishing) return;
    setIsFinishing(true);

    const trimmedEmail = email.trim();

    const patientId = session?.user.id;
    if (patientId) {
      const { error } = await supabase
        .from('profiles')
        .update({
          onboarding_completed: true,
          avatar_key: avatarKey,
          contact_email: trimmedEmail.length > 0 ? trimmedEmail : null,
        })
        .eq('id', patientId);
      if (error) {
        // Was console.warn-only: the patient still landed on home, with no
        // hint that the walkthrough would reappear on their next launch.
        console.warn('Could not save onboarding completion:', error.message);
        showToast("Couldn't save your progress — you may see this again next time.");
      } else if (trimmedEmail.length > 0) {
        // Also make this the patient's real Auth identity email, so they can
        // reset their own password later instead of depending on their doctor.
        // Best-effort: a failure here just leaves the doctor-reset path in
        // place, and the next edit-profile Save retries the swap.
        const { error: syncError } = await supabase.functions.invoke('sync-patient-login-email', {
          body: { email: trimmedEmail },
        });
        if (syncError) console.warn('Could not sync login email:', syncError.message);
      }
    }

    router.replace('/(patient)/home');
  }

  // The email step's only gate: a first press on something that doesn't look
  // like an email surfaces a warning instead of finishing. A second press goes
  // through regardless — a nudge, not a wall, since blank is allowed anyway.
  function handleAdvance() {
    if (index !== EMAIL_STEP) {
      setIndex(index + 1);
      return;
    }
    const trimmed = email.trim();
    if (trimmed.length > 0 && !LOOKS_LIKE_EMAIL.test(trimmed) && !emailWarning) {
      setEmailWarning(true);
      return;
    }
    complete();
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

        {slide ? (
          <View className="flex-1 items-center justify-center">
            <Image source={slide.illustration} style={{ width: 220, height: 220 }} resizeMode="contain" />
            <Text className="mt-8 text-center text-2xl font-bold text-text-dark">{slide.title}</Text>
            <Text className="mt-3 text-center text-base leading-6 text-text-muted">{slide.body}</Text>
          </View>
        ) : actionSlide ? (
          <View className="flex-1 items-center justify-center">
            <Image source={actionSlide.illustration} style={{ width: 220, height: 220 }} resizeMode="contain" />
            <Text className="mt-8 text-center text-2xl font-bold text-text-dark">{actionSlide.title}</Text>
            <Text className="mt-3 text-center text-base leading-6 text-text-muted">{actionSlide.body}</Text>
            <Pressable
              onPress={() => router.push(actionSlide.route)}
              className="mt-8 rounded-2xl border-2 px-6 py-3"
              style={{ borderColor: colors.primary }}
            >
              <Text className="text-base font-semibold" style={{ color: colors.primary }}>
                Set It Up
              </Text>
            </Pressable>
          </View>
        ) : index === AVATAR_STEP ? (
          <View className="flex-1 justify-center">
            <Text className="text-center text-2xl font-bold text-text-dark">Pick your avatar</Text>
            <Text className="mt-3 text-center text-base leading-6 text-text-muted">
              This is how you&apos;ll appear in the app. You can change it later.
            </Text>

            <View className="mt-8 flex-row flex-wrap justify-center gap-4">
              {AVATAR_OPTIONS.map((option) => {
                const isSelected = option.key === avatarKey;
                return (
                  <Pressable
                    key={option.key}
                    onPress={() => setAvatarKey(option.key)}
                    accessibilityLabel={`Avatar ${option.key}`}
                    accessibilityState={{ selected: isSelected }}
                    className="h-12 w-12 items-center justify-center rounded-full border-2"
                    style={{ borderColor: isSelected ? option.color : 'transparent', backgroundColor: colors.surface }}
                  >
                    <Ionicons name={option.icon} size={22} color={option.color} />
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : (
          <View className="flex-1 justify-center">
            <Text className="text-center text-2xl font-bold text-text-dark">
              {emailWasPrefilled ? 'Confirm your email' : 'Your email address'}
            </Text>
            <Text className="mt-3 text-center text-base leading-6 text-text-muted">
              {emailWasPrefilled
                ? "Your doctor set this up — make sure it's right, or change it if it's not."
                : "We'll use this if you ever need to reset your password. You can add it later instead."}
            </Text>

            <Text className="mb-1 mt-8 text-sm font-medium text-text-dark">
              {emailWasPrefilled ? 'Email' : 'Email (optional)'}
            </Text>
            <TextInput
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setEmailWarning(false);
              }}
              placeholder="you@example.com"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              className="rounded-xl bg-card px-4 py-3 text-text-dark"
            />
            {emailWarning ? (
              <Text className="mt-2 text-sm" style={{ color: colors.riskMediumText }}>
                That doesn&apos;t look like an email address. Tap Get Started again to use it anyway.
              </Text>
            ) : null}
          </View>
        )}

        <View className="mb-6">
          <OnboardingDots total={TOTAL_STEPS} activeIndex={index} />
        </View>

        <Pressable
          onPress={handleAdvance}
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
