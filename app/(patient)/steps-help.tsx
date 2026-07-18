import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { openHealthConnectSettings } from 'react-native-health-connect';
import { colors } from '../../constants/theme';
import { Card } from '../../components/cards/Card';

const steps = [
  'Open your phone\'s health app (e.g. Samsung Health).',
  'Go to its Settings menu.',
  'Look for an option specifically called "Health Connect" — this is different from any "Sync with Cloud" option, which won\'t help here.',
  'Turn on sharing for Steps (or "Allow All").',
  'Still inside your health app\'s settings, look for a "Privacy" or "Consents" section, and make sure "Consent to the processing of health and wellness data" is turned on — this is easy to miss and is often the actual blocker even when everything else looks right.',
  'Restart your phone.',
  'Walk around for a minute or two, then check back here.',
];

/** Patient-facing walkthrough for the Health Connect setup that step tracking depends on — linked from the check-in "steps not showing" tip. */
export default function StepsHelp() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView contentContainerClassName="px-5 pb-6" showsVerticalScrollIndicator={false}>
        <View className="mt-2 flex-row items-center">
          <Pressable onPress={() => router.back()} className="mr-2 h-9 w-9 items-center justify-center">
            <Ionicons name="chevron-back" size={24} color={colors.textDark} />
          </Pressable>
          <Text className="text-xl font-bold text-text-dark">Getting Step Tracking Working</Text>
        </View>

        <Text className="mt-4 text-sm text-text-muted">
          RecovAI reads your steps from Android's Health Connect, which needs your phone's health app to be sharing
          data with it. This is usually a one-time setup.
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
          Exact menu names vary a little by phone brand — if yours looks different, look for anything mentioning
          "Health Connect" in your health app's settings.
        </Text>

        <Pressable
          onPress={() => openHealthConnectSettings()}
          className="mt-5 items-center rounded-2xl py-4"
          style={{ backgroundColor: colors.primary }}
        >
          <Text className="text-base font-semibold text-white">Open Health Connect</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
