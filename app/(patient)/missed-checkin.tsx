import { View, Text, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { SOSButton } from '../../components/sos/SOSButton';
import { BottomTabBar } from '../../components/navigation/BottomTabBar';

/** Screen 7 — Missed Check-In. Shown when the app opens with no check-in logged today. */
export default function MissedCheckIn() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1">
        <View className="flex-1 px-6 pt-4">
          <Pressable onPress={() => router.back()} className="h-9 w-9 items-center justify-center">
            <Ionicons name="chevron-back" size={24} color={colors.textDark} />
          </Pressable>

          <View className="mt-10 items-center">
            <Image
              source={require('../../assets/illustrations/06-calendar-with-red-x.png')}
              style={{ width: 160, height: 160 }}
              resizeMode="contain"
            />
            <Text className="mt-6 text-center text-2xl font-bold text-text-dark">
              You missed yesterday&apos;s check-in
            </Text>
            <Text className="mt-3 text-center text-sm leading-5 text-text-muted">
              That&apos;s okay — consistency is built over time. Check in now to keep your streak going.
            </Text>

            <Pressable
              onPress={() => router.push('/check-in')}
              className="mt-8 w-full items-center rounded-2xl py-4"
              style={{ backgroundColor: colors.primary }}
            >
              <Text className="text-base font-semibold text-white">Check In Now</Text>
            </Pressable>

            <Pressable onPress={() => router.push('/home')} className="mt-4">
              <Text className="text-sm font-semibold" style={{ color: colors.primary }}>
                Remind me later
              </Text>
            </Pressable>
          </View>
        </View>

        <SOSButton />

        <BottomTabBar active="checkin" />
      </View>
    </SafeAreaView>
  );
}
