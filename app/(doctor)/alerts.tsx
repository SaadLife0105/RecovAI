import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { AlertRow } from '../../components/cards/AlertRow';
import { EmptyStateCard } from '../../components/cards/EmptyStateCard';
import { DoctorTabBar } from '../../components/navigation/DoctorTabBar';
import { useAlerts } from '../../lib/hooks/useAlerts';
import { usePatients } from '../../lib/hooks/usePatients';
import { formatTime, formatTimestamp, toDeviceLocalIsoString } from '../../lib/formatDate';
import { ALERT_TYPE_META, FALLBACK_ALERT_META, dayLabel } from '../../lib/alertMeta';
import { AI_DISCLAIMER } from '../../lib/supportDisclaimers';

const FILTERS = ['All', 'Unread', 'High Risk'] as const;

/** Screen 13 — Doctor Alerts. Filter tabs filter useAlerts() data by read/urgency. */
export default function DoctorAlerts() {
  const router = useRouter();
  const { data: alerts, markRead } = useAlerts();
  const { data: patients } = usePatients();
  const [activeFilter, setActiveFilter] = useState<(typeof FILTERS)[number]>('All');
  // Accordion: one alert open at a time. Expanding is also what marks it read.
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);

  const toggleAlert = (alertId: string) => {
    if (expandedAlertId === alertId) {
      setExpandedAlertId(null);
      return;
    }
    setExpandedAlertId(alertId);
    markRead(alertId);
  };

  const patientById = new Map(patients.patients.map((p) => [p.id, { name: p.name, avatarColor: p.avatarColor }]));

  const filteredAlerts = alerts.filter((alert) => {
    // The currently-expanded alert survives the Unread filter even though
    // expanding it just marked it read — otherwise it would vanish from under
    // the doctor's finger the instant they opened it.
    if (activeFilter === 'Unread') return !alert.read || alert.id === expandedAlertId;
    if (activeFilter === 'High Risk') return alert.urgency === 'high';
    return true;
  });

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1">
        <ScrollView contentContainerClassName="px-5 pb-10" showsVerticalScrollIndicator={false}>
          <View className="mt-2">
            <Text className="text-2xl font-bold text-text-dark">Alerts</Text>
          </View>

          <View className="mt-4 flex-row rounded-xl bg-card p-1">
            {FILTERS.map((filter) => {
              const isActive = filter === activeFilter;
              return (
                <Pressable
                  key={filter}
                  onPress={() => setActiveFilter(filter)}
                  className="flex-1 items-center rounded-lg py-2"
                  style={{ backgroundColor: isActive ? colors.secondary : 'transparent' }}
                >
                  <Text className="text-xs font-semibold" style={{ color: isActive ? '#FFFFFF' : colors.textMuted }}>
                    {filter}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {filteredAlerts.length > 0 ? (
            <View className="mt-4">
              {filteredAlerts.map((alert) => {
                const typeMeta = ALERT_TYPE_META[alert.type] ?? FALLBACK_ALERT_META;
                const patient = patientById.get(alert.patientId);
                const localCreatedAt = toDeviceLocalIsoString(alert.createdAt);
                const name = patient?.name ?? alert.patientId.slice(0, 8);
                const isHigh = typeMeta.badgeLabel === 'High Risk' || typeMeta.badgeLabel === 'Relapse Logged';
                const badge = {
                  label: typeMeta.badgeLabel,
                  bg: isHigh ? colors.riskHighBg : colors.riskMediumBg,
                  text: isHigh ? colors.riskHighText : colors.riskMediumText,
                };
                const meta = `${dayLabel(localCreatedAt)}, ${formatTime(localCreatedAt)} • ${alert.read ? 'Read' : 'Unread'}`;
                return (
                  <AlertRow
                    key={alert.id}
                    dotColor={typeMeta.dotColor}
                    avatar={{ initials: name.split(' ').map((p) => p[0]).join(''), color: patient?.avatarColor ?? colors.textMuted }}
                    title={name}
                    message={typeMeta.message}
                    badge={badge}
                    meta={meta}
                    expanded={expandedAlertId === alert.id}
                    onPress={() => toggleAlert(alert.id)}
                  >
                    <Text className="text-xs font-semibold text-text-dark">Why this fired</Text>
                    <Text className="mt-1 text-xs leading-5 text-text-muted">
                      {alert.xaiExplanation ?? 'No AI explanation was generated for this alert.'}
                    </Text>
                    {alert.xaiExplanation ? (
                      <Text className="mt-1 text-[10px] text-text-muted">{AI_DISCLAIMER}</Text>
                    ) : null}

                    <Text className="mt-3 text-xs font-semibold text-text-dark">When</Text>
                    <Text className="mt-1 text-xs text-text-muted">{formatTimestamp(localCreatedAt)}</Text>

                    <Pressable
                      onPress={() => router.push({ pathname: '/(doctor)/patient/[id]', params: { id: alert.patientId } })}
                      className="mt-3 flex-row items-center"
                    >
                      <Text className="text-xs font-semibold" style={{ color: colors.secondary }}>
                        View {name}
                      </Text>
                      <Ionicons name="chevron-forward" size={12} color={colors.secondary} style={{ marginLeft: 2 }} />
                    </Pressable>
                  </AlertRow>
                );
              })}
            </View>
          ) : (
            <EmptyStateCard
              illustration={require('../../assets/illustrations/08-shield-with-checkmark.png')}
              title="All clear!"
              subtitle="No new alerts right now. You'll be notified if anything needs your attention."
            />
          )}
        </ScrollView>

        <DoctorTabBar active="alerts" />
      </View>
    </SafeAreaView>
  );
}
