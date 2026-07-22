import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, riskBand, riskBandColors } from '../../constants/theme';
import { EmptyStateCard } from '../../components/cards/EmptyStateCard';
import { ReportListSkeleton } from '../../components/skeletons/ReportListSkeleton';
import { SOSButton } from '../../components/sos/SOSButton';
import { DoctorTabBar } from '../../components/navigation/DoctorTabBar';
import { WeeklyCheckinGrid } from '../../components/reports/WeeklyCheckinGrid';
import { usePatients } from '../../lib/hooks/usePatients';
import { useCurrentWeekSnapshot } from '../../lib/hooks/useCurrentWeekSnapshot';
import { getMauritiusDateString } from '../../lib/mauritiusTime';

/** Screen 14 — Doctor Reports. A LIVE snapshot of the week in progress, one
 *  card per active patient, computed on the fly rather than read from
 *  weekly_reports (which only ever holds finished weeks). Reworked
 *  2026-07-22: opening Reports should answer "how is each patient doing right
 *  now", not "what did last week look like" — the completed weekly reports
 *  moved to each patient's own detail screen, under its Reports tab. */
export default function DoctorReports() {
  const router = useRouter();
  const { data: patientsData } = usePatients();
  const patients = patientsData.patients; // active only — archived caseload isn't live
  const { data: snapshots, isLoading } = useCurrentWeekSnapshot(patients.map((p) => p.id));
  const today = getMauritiusDateString();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1">
        <ScrollView contentContainerClassName="px-5 pb-10" showsVerticalScrollIndicator={false}>
          <View className="mt-2">
            <Text className="text-2xl font-bold text-text-dark">Reports</Text>
            <Text className="mt-0.5 text-xs text-text-muted">
              This week so far. Tap a patient for their completed weekly reports.
            </Text>
          </View>

          {isLoading ? (
            <View className="mt-4">
              <ReportListSkeleton />
            </View>
          ) : patients.length === 0 ? (
            <View className="mt-4">
              <EmptyStateCard
                illustration={require('../../assets/illustrations/15-report-sheet-with-bar-chart.png')}
                title="No patients yet"
                subtitle="Add a patient to start seeing their weekly progress here."
              />
            </View>
          ) : (
            <View className="mt-4">
              {patients.map((patient) => {
                const snapshot = snapshots.get(patient.id);

                // Never checked in at all — nothing true to show, so show
                // nothing rather than a grid of fabricated misses.
                if (!snapshot || !snapshot.hasAnyHistory) {
                  return (
                    <Pressable
                      key={patient.id}
                      onPress={() =>
                        router.push({ pathname: '/(doctor)/patient/[id]', params: { id: patient.id, tab: 'Reports' } })
                      }
                      className="mb-3 rounded-2xl bg-card p-4"
                    >
                      <Text className="text-sm font-semibold text-text-dark">{patient.name}</Text>
                      <Text className="mt-1 text-xs text-text-muted">
                        No check-ins on record — this patient has never submitted a check-in.
                      </Text>
                    </Pressable>
                  );
                }

                const avg = snapshot.avgRiskScoreThisWeek;
                const band = avg !== null ? riskBandColors(avg) : null;
                return (
                  <Pressable
                    key={patient.id}
                    onPress={() =>
                      router.push({ pathname: '/(doctor)/patient/[id]', params: { id: patient.id, tab: 'Reports' } })
                    }
                    className="mb-3 rounded-2xl bg-card p-4"
                  >
                    <View className="flex-row items-start justify-between">
                      <View>
                        <Text className="text-sm font-semibold text-text-dark">{patient.name}</Text>
                        {/* No date range — the week hasn't finished, and an end
                            date would imply data that doesn't exist yet. */}
                        <Text className="mt-0.5 text-xs text-text-muted">This Week</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                    </View>

                    <View className="mt-3">
                      <Text className="text-xs text-text-muted">Avg. Risk</Text>
                      {avg !== null && band !== null ? (
                        <View className="mt-1 flex-row items-center">
                          <View className="self-start rounded-full px-2 py-0.5" style={{ backgroundColor: band.bg }}>
                            <Text className="text-[11px] font-semibold" style={{ color: band.text }}>
                              {bandLabel(avg)}
                            </Text>
                          </View>
                          <Text className="ml-2 text-sm font-bold text-text-dark">{avg}</Text>
                        </View>
                      ) : (
                        <Text className="mt-1 text-xs text-text-muted">No check-ins yet this week</Text>
                      )}
                    </View>

                    <View className="mt-3">
                      <Text className="text-xs text-text-muted">Days checked in</Text>
                      <View className="mt-1.5">
                        <WeeklyCheckinGrid
                          weekStart={snapshot.weekStart}
                          checkedInDates={snapshot.checkedInDatesThisWeek}
                          asOfDate={today}
                        />
                      </View>
                    </View>

                    <View className="mt-3 flex-row items-center">
                      <Ionicons name="notifications-outline" size={13} color={colors.textMuted} />
                      <Text className="ml-1 mr-4 text-xs text-text-muted">{snapshot.alertCountThisWeek} alerts</Text>
                      <Ionicons name="location-outline" size={13} color={colors.textMuted} />
                      <Text className="ml-1 text-xs text-text-muted">
                        {snapshot.zoneBreachCountThisWeek} zone breaches
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>

        <SOSButton />

        <DoctorTabBar active="reports" />
      </View>
    </SafeAreaView>
  );
}

/** theme.ts's riskBand(), title-cased for display. */
function bandLabel(score: number): string {
  const band = riskBand(score);
  return band.charAt(0).toUpperCase() + band.slice(1);
}
