import { useState } from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '../../constants/theme';
import { SOSButton } from '../../components/sos/SOSButton';
import { BottomTabBar } from '../../components/navigation/BottomTabBar';
import { useStreak } from '../../lib/hooks/useStreak';
import { getRandomSupportDisclaimer } from '../../lib/supportDisclaimers';

/** Screen — Relapse Logged. Calm, non-celebratory counterpart to checkin-success.tsx. */
export default function RelapseLogged() {
  const router = useRouter();
  const { data: streak } = useStreak();
  const [supportDisclaimer] = useState(getRandomSupportDisclaimer);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1">
        <View className="flex-1 items-center px-6 pt-10">
          <Image
            source={require('../../assets/illustrations/30-hands-holding-heart.png')}
            style={{ width: 170, height: 170 }}
            resizeMode="contain"
          />
          <Text className="mt-4 text-center text-2xl font-bold text-text-dark">Thank you for being honest.</Text>
          <Text className="mt-1 text-center text-sm text-text-muted">
            That takes real courage. Your care team has been notified and your check-in streak hasn&apos;t been
            affected.
          </Text>

          <View className="mt-6 w-full rounded-2xl bg-card p-4">
            <Text className="text-center text-sm text-text-muted">
              Your streak: {streak.currentStreak} days — still going.
            </Text>
          </View>

          <Text className="mt-4 text-center text-xs" style={{ color: colors.textMuted }}>
            {supportDisclaimer}
          </Text>

          <Pressable
            onPress={() => router.replace('/(patient)/home')}
            className="mt-6 w-full items-center rounded-2xl py-4"
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
