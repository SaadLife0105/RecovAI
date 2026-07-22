import { View, Text, Pressable, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { Card } from '../../components/cards/Card';

const steps = [
  'When RecovAI first asks for location access, choose "Allow all the time" if offered directly. If your phone only offers "While using the app" at first, Android will usually prompt you to go to Settings afterward to upgrade it to "Allow all the time" manually.',
  'Open your phone\'s Settings > Battery (may be called "Battery and device care" or similar) > Background usage limits.',
  'Add RecovAI to the "Never sleeping apps" list.',
  'Separately, go to Settings > Apps > RecovAI > Battery, and set it to "Unrestricted" (not "Optimized").',
  'Restart your phone after changing these.',
];

/** Patient-facing walkthrough for the foreground + background location permissions zone monitoring depends on — linked from the check-in location tips. */
export default function LocationHelp() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView contentContainerClassName="px-5 pb-6" showsVerticalScrollIndicator={false}>
        <View className="mt-2 flex-row items-center">
          <Pressable onPress={() => router.back()} accessibilityLabel="Go back" hitSlop={8} className="mr-2 h-9 w-9 items-center justify-center">
            <Ionicons name="chevron-back" size={24} color={colors.textDark} />
          </Pressable>
          <Text className="text-xl font-bold text-text-dark">Getting Location Tracking Working</Text>
        </View>

        <Text className="mt-4 text-sm text-text-muted">
          RecovAI checks your proximity to saved risk zones, including while the app is closed. This needs a few
          permissions set up correctly — usually a one-time setup.
        </Text>

        <Card className="mt-4">
          {steps.map((step, i) => (
            <View key={i} className={`flex-row ${i > 0 ? 'mt-3' : ''}`}>
              <Text className="mr-2 text-sm font-semibold text-text-dark">{i + 1}.</Text>
              <Text className="flex-1 text-sm text-text-dark">{step}</Text>
            </View>
          ))}
        </Card>

        <Text className="mt-4 text-xs text-text-muted">
          You'll see a persistent notification while RecovAI is checking your location in the background — this is
          required by Android for any app doing this, not a sign something's wrong.
        </Text>

        <Text className="mt-3 text-xs text-text-muted">
          Exact menu names vary a little by phone brand.
        </Text>

        <Pressable
          onPress={() => Linking.openSettings()}
          className="mt-5 items-center rounded-2xl py-4"
          style={{ backgroundColor: colors.primary }}
        >
          <Text className="text-base font-semibold text-white">Open App Settings</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
