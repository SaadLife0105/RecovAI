import { useState } from 'react';
import { View, Text, Image, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../constants/theme';
import { RiskGauge } from '../../../components/gauges/RiskGauge';
import { MiniSparkline } from '../../../components/sparklines/MiniSparkline';
import { AlertRow } from '../../../components/cards/AlertRow';
import { SOSButton } from '../../../components/sos/SOSButton';
import { ArchivePatientModal } from '../../../components/modals/ArchivePatientModal';
import { useDoctorNote } from '../../../lib/hooks/useDoctorNote';
import { formatTimestamp } from '../../../lib/formatDate';
import { PATIENTS } from '../../../lib/mockData';

// dashboard.tsx's onPress always navigates here with a hardcoded id: '1'
// regardless of which row was tapped, so there's no real per-ID lookup to
// do yet — this just consolidates the duplicate hardcoded name/age/ID
// copy onto the one real caseload row (Alex Brown) instead of retyping it.
const patient = PATIENTS[0];

// No hook or mock data backs a per-patient 7-day risk trend series yet —
// stays local mock pending real historical data (Development Plan Phase 3).
const MOCK_TREND = {
  riskScore: 72,
  trendDelta: 12,
  trendData: [50, 54, 58, 62, 66, 70, 72],
};

const TABS = ['Overview', 'Check-ins', 'Alerts', 'Zones', 'Reports'] as const;
type Tab = (typeof TABS)[number];

const TAB_ICONS: Record<Exclude<Tab, 'Overview'>, keyof typeof Ionicons.glyphMap> = {
  'Check-ins': 'checkmark-circle-outline',
  Alerts: 'notifications-outline',
  Zones: 'map-outline',
  Reports: 'document-text-outline',
};

/** Screen 16 — Patient Detail (Doctor). Only the Overview tab is built; the rest are placeholders. */
export default function PatientDetail() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const { data: note } = useDoctorNote();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1">
        <ScrollView contentContainerClassName="px-5 pb-10" showsVerticalScrollIndicator={false}>
          <View className="mt-2 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Pressable onPress={() => router.back()} className="mr-2 h-9 w-9 items-center justify-center">
                <Ionicons name="chevron-back" size={24} color={colors.textDark} />
              </Pressable>
              <Image
                source={require('../../../assets/illustrations/21-patient-avatar.png')}
                style={{ width: 44, height: 44, borderRadius: 22 }}
              />
              <View className="ml-3">
                <View className="flex-row items-center">
                  <Text className="text-base font-bold text-text-dark">{patient.name}</Text>
                  <View className="ml-2 rounded-full px-2 py-0.5" style={{ backgroundColor: colors.riskLowBg }}>
                    <Text className="text-[10px] font-semibold" style={{ color: colors.riskLowText }}>
                      Active
                    </Text>
                  </View>
                </View>
                <Text className="text-xs text-text-muted">
                  {patient.age} years old • ID: {patient.patientId}
                </Text>
              </View>
            </View>
            <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4 -mx-5 px-5">
            <View className="flex-row gap-2">
              {TABS.map((tab) => {
                const isActive = tab === activeTab;
                return (
                  <Pressable
                    key={tab}
                    onPress={() => setActiveTab(tab)}
                    className="rounded-full px-4 py-2"
                    style={{ backgroundColor: isActive ? colors.secondary : colors.card }}
                  >
                    <Text className="text-xs font-semibold" style={{ color: isActive ? '#FFFFFF' : colors.textDark }}>
                      {tab}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          {activeTab === 'Overview' ? (
            <View className="mt-5">
              <View className="flex-row items-center rounded-2xl bg-card p-4">
                <View className="flex-1 items-center">
                  <Text className="mb-2 self-start text-xs text-text-muted">Risk Score</Text>
                  <RiskGauge score={MOCK_TREND.riskScore} size={120} />
                </View>
                <View className="flex-1 pl-2">
                  <Text className="text-xs text-text-muted">Trend (7 days)</Text>
                  <View className="mt-1 flex-row items-center">
                    <Ionicons name="trending-up" size={16} color={colors.riskHigh} />
                    <Text className="ml-1 text-base font-bold" style={{ color: colors.riskHighText }}>
                      {MOCK_TREND.trendDelta}
                    </Text>
                  </View>
                  <Text className="text-xs text-text-muted">from last 7 days</Text>
                  <View className="mt-2">
                    <MiniSparkline data={MOCK_TREND.trendData} color={colors.riskHigh} width={100} height={40} />
                  </View>
                </View>
              </View>

              <View className="mt-4 flex-row items-center rounded-2xl p-4" style={{ backgroundColor: colors.riskHighBg }}>
                <Image
                  source={require('../../../assets/illustrations/49-ai-brain-ai-insights.png')}
                  style={{ width: 40, height: 40 }}
                  resizeMode="contain"
                />
                <View className="ml-3 flex-1">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm font-bold" style={{ color: colors.riskHighText }}>
                      AI Analysis
                    </Text>
                    <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: colors.riskHigh }}>
                      <Text className="text-[10px] font-semibold text-white">High Risk</Text>
                    </View>
                  </View>
                  <Text className="mt-1 text-xs" style={{ color: colors.riskHighText }}>
                    Increased late-night phone usage and time spent in high-risk zones detected. Recommend extra
                    check-ins and encouraging healthy routines.
                  </Text>
                </View>
              </View>

              <View className="mb-2 mt-6 flex-row items-center justify-between">
                <Text className="text-sm font-semibold text-text-dark">Recent Alerts</Text>
                <Pressable>
                  <Text className="text-xs font-semibold" style={{ color: colors.secondary }}>
                    View All
                  </Text>
                </Pressable>
              </View>
              <AlertRow
                dotColor={colors.riskHigh}
                title="High risk score predicted"
                message="Risk score is 72 (High)"
                meta="Today, 8:30 AM"
              />
              <AlertRow
                dotColor={colors.riskMedium}
                title="Missed check-in"
                message="No check-in for 1 day"
                meta="Yesterday, 9:20 AM"
              />
              <AlertRow
                dotColor={colors.riskMedium}
                title="Zone breach"
                message="Entered risk zone: Downtown Bar"
                meta="Yesterday, 6:45 PM"
              />

              <View className="mt-3 rounded-2xl bg-card p-4">
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm font-semibold text-text-dark">Notes</Text>
                  <Pressable onPress={() => router.push('/(doctor)/edit-note')}>
                    <Ionicons name="pencil-outline" size={16} color={colors.textMuted} />
                  </Pressable>
                </View>
                <Text className="mt-2 text-sm text-text-muted">{note?.content}</Text>
                {note ? (
                  <Text className="mt-3 text-[11px] text-text-muted">Last updated: {formatTimestamp(note.updatedAt)}</Text>
                ) : null}
              </View>

              <Pressable
                onPress={() => setArchiveModalOpen(true)}
                className="mt-5 items-center rounded-2xl border-2 py-4"
                style={{ borderColor: colors.riskHigh }}
              >
                <Text className="text-base font-semibold" style={{ color: colors.riskHigh }}>
                  Archive Patient
                </Text>
              </Pressable>
            </View>
          ) : (
            <View className="mt-16 items-center px-8">
              <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-surface">
                <Ionicons name={TAB_ICONS[activeTab]} size={28} color={colors.primary} />
              </View>
              <Text className="text-lg font-bold text-text-dark">{activeTab}</Text>
              <Text className="mt-1 text-center text-sm text-text-muted">Coming soon.</Text>
            </View>
          )}
        </ScrollView>

        <SOSButton />
      </View>

      <ArchivePatientModal
        visible={archiveModalOpen}
        patientName={patient.name}
        onClose={() => setArchiveModalOpen(false)}
        onConfirm={() => {
          // No backend yet — archiving lands with the doctor caseload wiring (see docs/Development Plan.md Phase 3).
          setArchiveModalOpen(false);
          router.back();
        }}
      />
    </SafeAreaView>
  );
}
