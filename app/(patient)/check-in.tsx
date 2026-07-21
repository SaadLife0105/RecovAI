import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { openHealthConnectSettings } from 'react-native-health-connect';
import { colors } from '../../constants/theme';
import { RatingSlider } from '../../components/sliders/RatingSlider';
import { Card } from '../../components/cards/Card';
import { StatRow } from '../../components/cards/StatRow';
import { SOSButton } from '../../components/sos/SOSButton';
import { LogRelapseModal } from '../../components/modals/LogRelapseModal';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/hooks/useSession';
import { getMauritiusDateString } from '../../lib/mauritiusTime';
import { formatDateLabel } from '../../lib/formatDate';
import { computeRiskScore } from '../../lib/riskEngine';
import { computeNextStreak, StreakState } from '../../lib/streakLogic';
import { DrugClass } from '../../lib/types';
import { usePassiveData } from '../../lib/context/PassiveDataContext';

// 4-level zone display (riskLow→moodOkay→riskMedium→riskHigh gradient).
const ZONE_STATUS_DISPLAY: Record<
  'safe' | 'low_risk' | 'medium_risk' | 'high_risk',
  { label: string; color: string }
> = {
  safe: { label: 'Safe Zone', color: colors.riskLowText },
  low_risk: { label: 'Low-Risk Area', color: colors.moodOkayText },
  medium_risk: { label: 'Medium-Risk Area', color: colors.riskMediumText },
  high_risk: { label: 'High-Risk Zone', color: colors.riskHigh },
};

/** Screen 6 — Daily Check-In. No live risk preview: score is computed on submit only. */
export default function CheckIn() {
  const router = useRouter();
  const { session } = useSession();
  const patientId = session?.user.id;
  const passive = usePassiveData();
  const [mood, setMood] = useState(6);
  const [sleep, setSleep] = useState(5);
  const [craving, setCraving] = useState(7);
  const [isolated, setIsolated] = useState<boolean | null>(false);
  const [primaryDrugClass, setPrimaryDrugClass] = useState<DrugClass | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [relapseModalOpen, setRelapseModalOpen] = useState(false);
  const [isLoggingRelapse, setIsLoggingRelapse] = useState(false);
  const [stepsTipDismissed, setStepsTipDismissed] = useState(false);

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
    const score = computeRiskScore(
      { craving, mood, sleep, isolated: !!isolated, steps: passive.steps, zoneDangerLevel: passive.currentZoneStatus },
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
        steps: passive.steps,
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

    // Every check-in — not just high ones — goes to the agent, which decides
    // whether anything should happen at all (Development Plan.md §5.0 point 1;
    // this replaced the old deterministic score >= 70 generate-xai call).
    // Genuinely NOT awaited: NFR8 says the check-in must never be blocked by
    // how long the agent takes (up to 15s) or how it resolves. The earlier
    // version awaited this call before navigating, which meant every single
    // check-in — not just high-risk ones — paid the agent's full latency as
    // visible delay before the Success screen; caught via real on-device
    // testing 2026-07-21, not verified in code review beforehand. The
    // .catch() below only stops an unhandled-rejection warning; it is not
    // waiting for a result.
    supabase.functions.invoke('risk-agent', { body: {} }).catch((e) => {
      console.warn('risk-agent failed (check-in still succeeded):', e);
    });

    setIsSubmitting(false);
    router.replace('/checkin-success');
  };

  // Relapse logging never reads or writes `streaks` — the check-in streak and
  // sobriety are deliberately separate concepts (see Development Plan.md
  // "Relapse logging"). Only relapse_logs + profiles.sobriety_start_date change.
  const handleLogRelapse = async (notes: string | null) => {
    if (!patientId) return;

    setIsLoggingRelapse(true);

    const { error: relapseError } = await supabase.from('relapse_logs').insert({ patient_id: patientId, notes });
    if (relapseError) {
      setErrorMessage(relapseError.message);
      setIsLoggingRelapse(false);
      return;
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ sobriety_start_date: getMauritiusDateString() })
      .eq('id', patientId);
    if (profileError) {
      setErrorMessage(profileError.message);
      setIsLoggingRelapse(false);
      return;
    }

    const { data: profileRow, error: doctorLookupError } = await supabase
      .from('profiles')
      .select('assigned_doctor_id')
      .eq('id', patientId)
      .single();
    if (doctorLookupError) {
      setErrorMessage(doctorLookupError.message);
      setIsLoggingRelapse(false);
      return;
    }

    const assignedDoctorId = profileRow?.assigned_doctor_id;
    if (!assignedDoctorId) {
      console.warn('Patient has no assigned doctor — skipping relapse alert.');
    } else {
      const { error: alertError } = await supabase.from('alerts').insert({
        patient_id: patientId,
        doctor_id: assignedDoctorId,
        type: 'relapse_logged',
        urgency: 'high',
        xai_explanation: null,
        read: false,
      });
      if (alertError) {
        setErrorMessage(alertError.message);
        setIsLoggingRelapse(false);
        return;
      }
    }

    setIsLoggingRelapse(false);
    setRelapseModalOpen(false);
    router.replace('/(patient)/relapse-logged');
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
              <StatRow
                icon="footsteps-outline"
                label="Steps"
                value={passive.stepsAvailable ? passive.steps.toLocaleString() : '—'}
              />
              <StatRow
                icon="location-outline"
                label="Location"
                value={
                  !passive.zoneAvailable
                    ? '—'
                    : passive.currentZoneStatus
                    ? ZONE_STATUS_DISPLAY[passive.currentZoneStatus].label
                    : 'No zone data'
                }
                valueColor={
                  passive.currentZoneStatus
                    ? ZONE_STATUS_DISPLAY[passive.currentZoneStatus].color
                    : colors.riskLowText
                }
              />
            </View>
            {!passive.stepsAvailable && (
              <Text className="mt-2 text-xs text-text-muted">
                Step tracking unavailable — {passive.stepsPermissionDenied ? 'permission not granted' : 'no sensor'}
              </Text>
            )}
            {!passive.zoneAvailable && (
              <Text className="mt-1 text-xs text-text-muted">
                Location unavailable — {passive.zonePermissionDenied ? 'permission not granted' : 'no signal'}
                {'\n'}
                <Text className="text-xs font-medium text-text-muted underline" onPress={() => Linking.openSettings()}>
                  Open App Settings
                </Text>
                {'\n'}
                <Text
                  className="text-xs font-medium text-text-muted underline"
                  onPress={() => router.push('/(patient)/location-help')}
                >
                  Need more help?
                </Text>
              </Text>
            )}
            <Text
              className="mt-2 text-xs text-text-muted underline"
              onPress={() => router.push('/(patient)/location-help')}
            >
              Location tracking not working as expected?
            </Text>
            {passive.stepsAvailable && passive.steps === 0 && !stepsTipDismissed && (
              <View className="mt-2 flex-row items-start justify-between">
                <Text className="mr-2 flex-1 text-xs text-text-muted">
                  Not seeing steps? Make sure your phone's health app (e.g. Samsung Health) is sharing data with
                  Health Connect.{' '}
                  <Text className="text-xs font-medium text-text-muted underline" onPress={() => openHealthConnectSettings()}>
                    Open Health Connect
                  </Text>
                  {'\n'}
                  <Text
                    className="text-xs font-medium text-text-muted underline"
                    onPress={() => router.push('/(patient)/steps-help')}
                  >
                    Need more help?
                  </Text>
                </Text>
                <Pressable onPress={() => setStepsTipDismissed(true)} hitSlop={8}>
                  <Ionicons name="close" size={14} color={colors.textMuted} />
                </Pressable>
              </View>
            )}
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

          <Pressable
            onPress={() => {
              setErrorMessage(null);
              setRelapseModalOpen(true);
            }}
            className="mt-4 items-center"
          >
            <Text className="text-center text-sm" style={{ color: colors.textMuted }}>
              Had a setback? Log a relapse
            </Text>
          </Pressable>
        </ScrollView>

        <SOSButton />

        <LogRelapseModal
          visible={relapseModalOpen}
          onClose={() => setRelapseModalOpen(false)}
          onConfirm={handleLogRelapse}
          isSubmitting={isLoggingRelapse}
          errorMessage={errorMessage}
        />
      </View>
    </SafeAreaView>
  );
}
