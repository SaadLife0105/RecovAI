import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, riskBandColors } from '../../constants/theme';
import { EmptyStateCard } from '../../components/cards/EmptyStateCard';
import { ReportListSkeleton } from '../../components/skeletons/ReportListSkeleton';
import { SOSButton } from '../../components/sos/SOSButton';
import { DoctorTabBar } from '../../components/navigation/DoctorTabBar';
import { useReports } from '../../lib/hooks/useReports';
import { usePatientProfile } from '../../lib/hooks/usePatientProfile';
import { formatDateRange } from '../../lib/formatDate';

// DEV-ONLY: useReports().isLoading is always false right now (no real
// async fetch exists yet). Flip this to true locally to preview
// ReportListSkeleton — remove once real loading states exist.
const DEV_FORCE_LOADING = false;

/** Screen 14 — Doctor Reports. Static UI; patient filter dropdown is visual only. */
export default function DoctorReports() {
  const { data: reports, isLoading } = useReports();
  const { data: profile } = usePatientProfile();
  const loading = isLoading || DEV_FORCE_LOADING;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1">
        <ScrollView contentContainerClassName="px-5 pb-10" showsVerticalScrollIndicator={false}>
          <View className="mt-2 flex-row items-center justify-between">
            <Text className="text-2xl font-bold text-text-dark">Reports</Text>
            <Pressable className="flex-row items-center rounded-xl bg-card px-3 py-2">
              <Text className="mr-1 text-sm text-text-dark">All Patients</Text>
              <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
            </Pressable>
          </View>

          {loading ? (
            <View className="mt-4">
              <ReportListSkeleton />
            </View>
          ) : reports.length === 0 ? (
            <View className="mt-4">
              <EmptyStateCard
                illustration={require('../../assets/illustrations/15-report-sheet-with-bar-chart.png')}
                title="No reports yet"
                subtitle="Weekly reports will appear here every Monday."
              />
              <View className="mt-3 flex-row items-center rounded-2xl p-4" style={{ backgroundColor: colors.surface }}>
                <Ionicons name="bulb-outline" size={20} color={colors.textMuted} />
                <Text className="ml-3 flex-1 text-xs text-text-muted">
                  Reports help track progress over time and identify patterns that matter.
                </Text>
              </View>
            </View>
          ) : (
            <View className="mt-4">
              {reports.map((report) => {
                const band = riskBandColors(report.avgRisk);
                const bandLabel = report.avgRisk.charAt(0).toUpperCase() + report.avgRisk.slice(1);
                return (
                  <View key={report.id} className="mb-3 rounded-2xl bg-card p-4">
                    <View className="flex-row items-start justify-between">
                      <View>
                        <Text className="text-sm font-semibold text-text-dark">
                          {formatDateRange(report.weekStart, report.weekEnd)}
                        </Text>
                        <Text className="mt-0.5 text-xs text-text-muted">{profile?.fullName}</Text>
                      </View>
                      <Pressable className="h-9 w-9 items-center justify-center rounded-full bg-surface">
                        <Ionicons name="download-outline" size={16} color={colors.textDark} />
                      </Pressable>
                    </View>

                    <View className="mt-3 flex-row items-center justify-between">
                      <View>
                        <Text className="text-xs text-text-muted">Avg. Risk</Text>
                        <View className="mt-1 self-start rounded-full px-2 py-0.5" style={{ backgroundColor: band.bg }}>
                          <Text className="text-[11px] font-semibold" style={{ color: band.text }}>
                            {bandLabel}
                          </Text>
                        </View>
                      </View>
                      <View className="flex-1 pl-6">
                        <Text className="text-right text-xs text-text-muted">Compliance</Text>
                        <Text className="text-right text-base font-bold" style={{ color: colors.riskLowText }}>
                          {report.compliancePercent}%
                        </Text>
                        <View className="mt-1 h-1.5 rounded-full bg-surface">
                          <View
                            className="h-1.5 rounded-full"
                            style={{ width: `${report.compliancePercent}%`, backgroundColor: colors.riskLow }}
                          />
                        </View>
                      </View>
                    </View>
                  </View>
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
