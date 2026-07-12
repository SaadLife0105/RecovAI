import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { RatingSlider } from '../../components/sliders/RatingSlider';
import { Card } from '../../components/cards/Card';
import { StatRow } from '../../components/cards/StatRow';
import { SOSButton } from '../../components/sos/SOSButton';

// Mock passive data — real sensor wiring lands in Phase 2.4 (see docs/Development Plan.md)
const MOCK_PASSIVE = { steps: 6342, zone: 'Safe Zone' };

/** Screen 6 — Daily Check-In. No live risk preview: score is computed on submit only. */
export default function CheckIn() {
  const router = useRouter();
  const [mood, setMood] = useState(6);
  const [sleep, setSleep] = useState(5);
  const [craving, setCraving] = useState(7);
  const [isolated, setIsolated] = useState<boolean | null>(false);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1">
        <ScrollView contentContainerClassName="px-5 pb-6" showsVerticalScrollIndicator={false}>
          <View className="mt-2 flex-row items-center">
            <Pressable onPress={() => router.back()} className="mr-2 h-9 w-9 items-center justify-center">
              <Ionicons name="chevron-back" size={24} color={colors.textDark} />
            </Pressable>
            <View>
              <Text className="text-xl font-bold text-text-dark">Daily Check-In</Text>
              <Text className="text-xs text-text-muted">May 24, 2025</Text>
            </View>
          </View>

          <Card title="Today's Info (Passive)" className="mt-4">
            <View className="mt-2 flex-row">
              <StatRow icon="footsteps-outline" label="Steps" value={MOCK_PASSIVE.steps.toLocaleString()} />
              <StatRow icon="location-outline" label="Location" value={MOCK_PASSIVE.zone} valueColor={colors.riskLowText} />
            </View>
          </Card>

          <View className="mt-4">
            <RatingSlider type="mood" value={mood} onValueChange={setMood} />
            <RatingSlider type="sleep" value={sleep} onValueChange={setSleep} />
            <RatingSlider type="craving" value={craving} onValueChange={setCraving} />
          </View>

          <View className="mt-2 flex-row items-center justify-between">
            <Text className="text-sm font-medium text-text-dark">Feeling isolated?</Text>
            <View className="flex-row overflow-hidden rounded-xl border border-divider">
              <Pressable
                onPress={() => setIsolated(false)}
                className="px-4 py-2"
                style={{ backgroundColor: isolated === false ? colors.primary : colors.card }}
              >
                <Text style={{ color: isolated === false ? '#FFFFFF' : colors.textDark }} className="text-sm font-medium">
                  No
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setIsolated(true)}
                className="px-4 py-2"
                style={{ backgroundColor: isolated === true ? colors.primary : colors.card }}
              >
                <Text style={{ color: isolated === true ? '#FFFFFF' : colors.textDark }} className="text-sm font-medium">
                  Yes
                </Text>
              </Pressable>
            </View>
          </View>

          <View className="mt-5 rounded-2xl p-4" style={{ backgroundColor: colors.safeZoneBg }}>
            <Text className="text-sm" style={{ color: colors.riskLowText }}>
              Every check-in is a step forward. Keep going.
            </Text>
          </View>

          <Pressable
            onPress={() => router.push('/checkin-success')}
            className="mt-5 items-center rounded-2xl py-4"
            style={{ backgroundColor: colors.primary }}
          >
            <Text className="text-base font-semibold text-white">Submit Check-In</Text>
          </Pressable>
        </ScrollView>

        <SOSButton />
      </View>
    </SafeAreaView>
  );
}
