import { useState } from 'react';
import { View, Text, Image, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../constants/theme';
import { RiskGauge } from '../../../components/gauges/RiskGauge';
import { MiniSparkline } from '../../../components/sparklines/MiniSparkline';
import { RiskTrendChart } from '../../../components/charts/RiskTrendChart';
import { AlertRow } from '../../../components/cards/AlertRow';
import { SOSButton } from '../../../components/sos/SOSButton';
import { ArchivePatientModal } from '../../../components/modals/ArchivePatientModal';
import { useDoctorNote } from '../../../lib/hooks/useDoctorNote';
import { usePatientDetail, setPatientArchived, clearUrgentReviewFlag } from '../../../lib/hooks/usePatientDetail';
import { usePatientAlertsForDoctor } from '../../../lib/hooks/usePatientAlertsForDoctor';
import { ALERT_TYPE_META, FALLBACK_ALERT_META, dayLabel } from '../../../lib/alertMeta';
import { formatTimestamp, formatTime, toDeviceLocalIsoString } from '../../../lib/formatDate';

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
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const { data: patient, refetch: refetchPatient } = usePatientDetail(id);
  const { data: note } = useDoctorNote(id);
  const { data: alerts } = usePatientAlertsForDoctor(id);

  const recentAlerts = alerts.slice(0, 3);
  const latestAlert = alerts[0];
  const xai = latestAlert?.xaiExplanation ?? null;

  const confirmArchive = async () => {
    const { error } = await setPatientArchived(id, true);
    if (error) {
      setArchiveError(error);
      return;
    }
    setArchiveModalOpen(false);
    router.back();
  };

  const handleRestore = async () => {
    const { error } = await setPatientArchived(id, false);
    if (error) {
      setArchiveError(error);
      return;
    }
    router.back();
  };

  // Stays on this screen, so it refetches inline rather than relying on the
  // hook's focus refetch (which only covers navigating away and back).
  const handleClearFlag = async () => {
    const { error } = await clearUrgentReviewFlag(id);
    if (error) {
      setArchiveError(error);
      return;
    }
    setArchiveError(null);
    refetchPatient();
  };

  if (!patient) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-sm text-text-muted">Loading patient…</Text>
        </View>
      </SafeAreaView>
    );
  }

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
                  <View
                    className="ml-2 rounded-full px-2 py-0.5"
                    style={{ backgroundColor: patient.archived ? colors.riskMediumBg : colors.riskLowBg }}
                  >
                    <Text
                      className="text-[10px] font-semibold"
                      style={{ color: patient.archived ? colors.riskMediumText : colors.riskLowText }}
                    >
                      {patient.archived ? 'Archived' : 'Active'}
                    </Text>
                  </View>
                  {patient.flagged ? (
                    <View className="ml-2 flex-row items-center rounded-full px-2 py-0.5" style={{ backgroundColor: colors.riskHighBg }}>
                      <Ionicons name="flag" size={10} color={colors.riskHighText} style={{ marginRight: 3 }} />
                      <Text className="text-[10px] font-semibold" style={{ color: colors.riskHighText }}>
                        Flagged
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text className="text-xs text-text-muted">ID: {patient.username ?? patient.id.slice(0, 8)}</Text>
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
                    onPress={() =>
                      tab === 'Zones'
                        ? router.push({ pathname: '/(doctor)/zones', params: { patientId: patient.id, patientName: patient.name } })
                        : setActiveTab(tab)
                    }
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
                  {patient.latestScore !== null ? (
                    <RiskGauge score={patient.latestScore} size={120} showCaption={false} />
                  ) : (
                    <Text className="text-center text-xs text-text-muted">No check-ins yet</Text>
                  )}
                </View>
                <View className="flex-1 pl-2">
                  <Text className="text-xs text-text-muted">Trend (7 days)</Text>
                  {patient.trendDelta !== null ? (
                    <>
                      <View className="mt-1 flex-row items-center">
                        <Ionicons
                          name={patient.trendDelta >= 0 ? 'trending-up' : 'trending-down'}
                          size={16}
                          color={patient.trendDelta >= 0 ? colors.riskHigh : colors.riskLow}
                        />
                        <Text
                          className="ml-1 text-base font-bold"
                          style={{ color: patient.trendDelta >= 0 ? colors.riskHighText : colors.riskLowText }}
                        >
                          {patient.trendDelta >= 0 ? '+' : ''}
                          {patient.trendDelta.toFixed(1)}
                        </Text>
                      </View>
                      <Text className="text-xs text-text-muted">from last 7 days</Text>
                      <View className="mt-2">
                        <MiniSparkline data={patient.trendData} color={colors.riskHigh} width={100} height={40} />
                      </View>
                    </>
                  ) : (
                    <Text className="mt-1 text-xs text-text-muted">Not enough data yet — check back after a few more check-ins.</Text>
                  )}
                </View>
              </View>

              <View className="mt-4 rounded-2xl bg-card p-4">
                <Text className="mb-3 text-sm font-semibold text-text-dark">Risk Trend & Forecast</Text>
                <RiskTrendChart history={patient.trendData} forecast={patient.forecast} width={300} height={160} />
                <View className="mt-3 flex-row items-center gap-4">
                  <View className="flex-row items-center">
                    <View className="mr-2 h-0.5 w-5" style={{ backgroundColor: colors.secondary }} />
                    <Text className="text-[11px] text-text-muted">Actual</Text>
                  </View>
                  <View className="flex-row items-center">
                    <View
                      className="mr-2 h-0 w-5"
                      style={{ borderTopWidth: 2, borderStyle: 'dashed', borderColor: colors.riskMedium }}
                    />
                    <Text className="text-[11px] text-text-muted">Forecasted</Text>
                  </View>
                </View>
              </View>

              {xai !== null ? (
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
                        <Text className="text-[10px] font-semibold text-white">
                          {latestAlert.urgency === 'high' ? 'High Risk' : latestAlert.urgency === 'medium' ? 'Medium' : 'Low'}
                        </Text>
                      </View>
                    </View>
                    <Text className="mt-0.5 text-[10px]" style={{ color: colors.riskHighText, opacity: 0.75 }}>
                      From alert on {dayLabel(toDeviceLocalIsoString(latestAlert.createdAt))}, {formatTime(toDeviceLocalIsoString(latestAlert.createdAt))} — may not reflect the patient's current status shown above
                    </Text>
                    <Text className="mt-1 text-xs" style={{ color: colors.riskHighText }}>
                      {xai}
                    </Text>
                  </View>
                </View>
              ) : (
                <View className="mt-4 flex-row items-center rounded-2xl p-4" style={{ backgroundColor: colors.surface }}>
                  <Image
                    source={require('../../../assets/illustrations/49-ai-brain-ai-insights.png')}
                    style={{ width: 40, height: 40 }}
                    resizeMode="contain"
                  />
                  <View className="ml-3 flex-1">
                    <Text className="text-sm font-bold text-text-dark">AI Analysis</Text>
                    <Text className="mt-1 text-xs text-text-muted">
                      AI-generated explanations will appear here once a risk alert has enough context.
                    </Text>
                  </View>
                </View>
              )}

              <View className="mb-2 mt-6 flex-row items-center justify-between">
                <Text className="text-sm font-semibold text-text-dark">Recent Alerts</Text>
                <Pressable onPress={() => setActiveTab('Alerts')}>
                  <Text className="text-xs font-semibold" style={{ color: colors.secondary }}>
                    View All
                  </Text>
                </Pressable>
              </View>
              {recentAlerts.length > 0 ? (
                recentAlerts.map((alert) => {
                  const typeMeta = ALERT_TYPE_META[alert.type] ?? FALLBACK_ALERT_META;
                  const localCreatedAt = toDeviceLocalIsoString(alert.createdAt);
                  return (
                    <AlertRow
                      key={alert.id}
                      dotColor={typeMeta.dotColor}
                      title={typeMeta.badgeLabel}
                      message={typeMeta.message}
                      meta={`${dayLabel(localCreatedAt)}, ${formatTime(localCreatedAt)}`}
                    />
                  );
                })
              ) : (
                <Text className="text-xs text-text-muted">No alerts yet</Text>
              )}

              <View className="mt-3 rounded-2xl bg-card p-4">
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm font-semibold text-text-dark">Notes</Text>
                  <Pressable onPress={() => router.push({ pathname: '/(doctor)/edit-note', params: { id: patient.id } })}>
                    <Ionicons name="pencil-outline" size={16} color={colors.textMuted} />
                  </Pressable>
                </View>
                <Text className="mt-2 text-sm text-text-muted">{note?.content ?? 'No notes yet.'}</Text>
                {note ? (
                  <Text className="mt-3 text-[11px] text-text-muted">Last updated: {formatTimestamp(toDeviceLocalIsoString(note.updatedAt))}</Text>
                ) : null}
              </View>

              {patient.flagged ? (
                <Pressable
                  onPress={handleClearFlag}
                  className="mt-5 flex-row items-center justify-center rounded-2xl border-2 py-4"
                  style={{ borderColor: colors.riskHigh }}
                >
                  <Ionicons name="flag-outline" size={18} color={colors.riskHigh} style={{ marginRight: 6 }} />
                  <Text className="text-base font-semibold" style={{ color: colors.riskHigh }}>
                    Clear Urgent Review Flag
                  </Text>
                </Pressable>
              ) : null}

              {patient.archived ? (
                <>
                  <Pressable
                    onPress={handleRestore}
                    className="mt-5 flex-row items-center justify-center rounded-2xl border-2 py-4"
                    style={{ borderColor: colors.secondary }}
                  >
                    <Ionicons name="arrow-undo-outline" size={18} color={colors.secondary} style={{ marginRight: 6 }} />
                    <Text className="text-base font-semibold" style={{ color: colors.secondary }}>
                      Restore Patient
                    </Text>
                  </Pressable>
                  {archiveError ? (
                    <Text className="mt-2 text-center text-sm" style={{ color: colors.riskHigh }}>
                      {archiveError}
                    </Text>
                  ) : null}
                </>
              ) : (
                <Pressable
                  onPress={() => {
                    setArchiveError(null);
                    setArchiveModalOpen(true);
                  }}
                  className="mt-5 flex-row items-center justify-center rounded-2xl border-2 py-4"
                  style={{ borderColor: colors.riskHigh }}
                >
                  <Ionicons name="archive" size={18} color={colors.riskHigh} style={{ marginRight: 6 }} />
                  <Text className="text-base font-semibold" style={{ color: colors.riskHigh }}>
                    Archive Patient
                  </Text>
                </Pressable>
              )}
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
        errorMessage={archiveError}
        onClose={() => setArchiveModalOpen(false)}
        onConfirm={confirmArchive}
      />
    </SafeAreaView>
  );
}
