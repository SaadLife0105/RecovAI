import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { Card } from '../../components/cards/Card';

const collected: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }[] = [
  {
    icon: 'create-outline',
    title: 'Daily check-ins',
    body: 'Your mood, sleep and craving ratings, and the risk score calculated from them. Your doctor sees these — they are what lets them notice a difficult stretch early.',
  },
  {
    icon: 'location-outline',
    title: 'Location',
    body: 'Only checked against the risk zones your doctor has saved for you. RecovAI records that you came near a zone, not a continuous history of everywhere you go.',
  },
  {
    icon: 'footsteps-outline',
    title: 'Step count',
    body: 'A daily total, used as one input to your risk score. No route, no timing, no map.',
  },
  {
    icon: 'book-outline',
    title: 'Journal entries',
    body: 'Private to you. Your doctor cannot read your journal — this is enforced by the database itself, not just hidden in the app.',
  },
  {
    icon: 'chatbubble-ellipses-outline',
    title: 'Chat messages',
    body: 'Used to answer you in the moment and to flag a crisis so support can be offered. Not shown to your doctor as a transcript.',
  },
];

/** Static "what we collect and why" screen — linked from edit-profile.tsx's Privacy & Data row. */
export default function PrivacyInfo() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView contentContainerClassName="px-5 pb-10" showsVerticalScrollIndicator={false}>
        <View className="mt-2 flex-row items-center">
          <Pressable onPress={() => router.back()} accessibilityLabel="Go back" hitSlop={8} className="mr-2 h-9 w-9 items-center justify-center">
            <Ionicons name="chevron-back" size={24} color={colors.textDark} />
          </Pressable>
          <Text className="text-xl font-bold text-text-dark">Privacy &amp; Data</Text>
        </View>

        <Text className="mt-4 text-sm text-text-muted">
          RecovAI collects the least it can while still being useful to you and your care team. Here is
          everything it holds, and what each thing is for.
        </Text>

        <Card className="mt-4">
          {collected.map((item, i) => (
            <View key={item.title} className={`flex-row ${i > 0 ? 'mt-4' : ''}`}>
              <Ionicons name={item.icon} size={18} color={colors.primary} style={{ marginTop: 2 }} />
              <View className="ml-3 flex-1">
                <Text className="text-sm font-semibold text-text-dark">{item.title}</Text>
                <Text className="mt-0.5 text-sm text-text-muted">{item.body}</Text>
              </View>
            </View>
          ))}
        </Card>

        <Text className="mb-2 mt-6 text-sm font-semibold text-text-dark">Who can see what</Text>
        <Card>
          <Text className="text-sm text-text-muted">
            Your assigned doctor sees your check-ins, risk scores, zone alerts and weekly summaries. Nobody
            else does. Your journal is yours alone. Every one of these boundaries is enforced by row-level
            security rules in the database, so a screen cannot accidentally show the wrong person your data.
          </Text>
        </Card>

        <Text className="mb-2 mt-6 text-sm font-semibold text-text-dark">Data minimisation</Text>
        <Card>
          <Text className="text-sm text-text-muted">
            RecovAI is built around the data-minimisation principle in Mauritius&apos; Data Protection Act
            2017: collect only what is adequate, relevant and limited to what the purpose actually needs.
            That is why location is reduced to a zone proximity check rather than stored as a movement
            history, and why steps are kept as a daily number rather than a detailed activity log.
          </Text>
        </Card>

        <Text className="mt-6 text-xs text-text-muted">
          If you want your data removed, ask your doctor — they can archive your account, and deletion can be
          arranged from there.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
