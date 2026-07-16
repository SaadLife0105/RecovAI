import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { RatingSlider } from '../../components/sliders/RatingSlider';
import { Card } from '../../components/cards/Card';
import { StatRow } from '../../components/cards/StatRow';
import { SOSButton } from '../../components/sos/SOSButton';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/hooks/useSession';
import { getMauritiusDateString } from '../../lib/mauritiusTime';
import { formatDateLabel } from '../../lib/formatDate';
import { computeRiskScore } from '../../lib/riskEngine';
import { computeNextStreak, StreakState } from '../../lib/streakLogic';
import { DrugClass } from '../../lib/types';

// Mock passive data — real sensor wiring lands in Phase 2.4 (see docs/Development Plan.md)
const MOCK_PASSIVE = { steps: 6342, zone: 'Safe Zone' };

/** Screen 6 — Daily Check-In. No live risk preview: score is computed on submit only. */
export default function CheckIn() {
  const router = useRouter();
  const { session } = useSession();
  const patientId = session?.user.id;
  const [mood, setMood] = useState(6);
  const [sleep, setSleep] = useState(5);
  const [craving, setCraving] = useState(7);
  const [isolated, setIsolated] = useState<boolean | null>(false);
  const [primaryDrugClass, setPrimaryDrugClass] = useState<DrugClass | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!patientId) return;
    supabase
      .from('patient_substances')
      .select('drug_class')
      .eq('patient_id', patientId)
      .eq('is_primary', true)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setPrimaryDrugClass(data.drug_class);
        else setErrorMessage('No primary drug class found for this patient.');
      });
  }, [patientId]);

  const handleSubmit = async () => {
    if (!patientId || !primaryDrugClass) {
      setErrorMessage('No primary drug class found for this patient.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const today = getMauritiusDateString();
    const nearRiskZone = MOCK_PASSIVE.zone !== 'Safe Zone';
    const score = computeRiskScore(
      { craving, mood, sleep, isolated: !!isolated, steps: MOCK_PASSIVE.steps, nearRiskZone },
      primaryDrugClass
    );

    const { error: checkinError } = await supabase.from('checkins').upsert(
      {
        patient_id: patientId,
        date: today,
        mood,
        sleep,
        craving,
        isolated: !!isolated,
        steps: MOCK_PASSIVE.steps,
        risk_score: score,
      },
      { onConflict: 'patient_id,date' }
    );

    if (checkinError) {
      setErrorMessage(checkinError.message);
      setIsSubmitting(false);
      return;
    }

    const { data: streakRow } = await supabase
      .from('streaks')
      .select('*')
      .eq('patient_id', patientId)
      .maybeSingle();

    const currentState: StreakState = streakRow
      ? {
          currentStreak: streakRow.current_streak,
          longestStreak: streakRow.longest_streak,
          lastCheckinDate: streakRow.last_checkin_date,
        }
      : { currentStreak: 0, longestStreak: 0, lastCheckinDate: null };

    const nextState = computeNextStreak(currentState, today);

    const { error: streakError } = await supabase.from('streaks').upsert(
      {
        patient_id: patientId,
        current_streak: nextState.currentStreak,
        longest_streak: nextState.longestStreak,
        last_checkin_date: nextState.lastCheckinDate,
      },
      { onConflict: 'patient_id' }
    );

    if (streakError) {
      setErrorMessage(streakError.message);
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    router.replace('/checkin-success');
  };

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
              <Text className="text-xs text-text-muted">{formatDateLabel(getMauritiusDateString())}</Text>
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

          {errorMessage && (
            <Text className="mt-4 text-center text-sm" style={{ color: colors.riskHigh }}>
              {errorMessage}
            </Text>
          )}

          <Pressable
            onPress={handleSubmit}
            disabled={isSubmitting}
            className="mt-5 items-center rounded-2xl py-4"
            style={{ backgroundColor: colors.primary, opacity: isSubmitting ? 0.6 : 1 }}
          >
            <Text className="text-base font-semibold text-white">
              {isSubmitting ? 'Submitting...' : 'Submit Check-In'}
            </Text>
          </Pressable>
        </ScrollView>

        <SOSButton />
      </View>
    </SafeAreaView>
  );
}
