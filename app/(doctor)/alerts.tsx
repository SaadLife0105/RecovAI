import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { AlertRow } from '../../components/cards/AlertRow';
import { EmptyStateCard } from '../../components/cards/EmptyStateCard';
import { SOSButton } from '../../components/sos/SOSButton';
import { DoctorTabBar } from '../../components/navigation/DoctorTabBar';
import { useAlerts } from '../../lib/hooks/useAlerts';
import { usePatients } from '../../lib/hooks/usePatients';
import { formatDateLabel, formatTime } from '../../lib/formatDate';
import { getMauritiusDateString, toMauritiusIsoString } from '../../lib/mauritiusTime';

const FILTERS = ['All', 'Unread', 'High Risk'] as const;

const ALERT_TYPE_META: Record<string, { badgeLabel: string; message: string; dotColor: string }> = {
  high_risk: { badgeLabel: 'High Risk', message: 'High risk score detected', dotColor: colors.riskHigh },
  missed_checkin: { badgeLabel: 'Missed Check-in', message: 'No check-in recorded today', dotColor: colors.riskMedium },
  zone_breach: { badgeLabel: 'Zone Breach', message: 'Entered a risk zone', dotColor: colors.riskMedium },
  predicted_high_risk: { badgeLabel: 'Predicted High Risk', message: 'High risk predicted for next 24h', dotColor: colors.riskMedium },
  relapse_logged: { badgeLabel: 'Relapse Logged', message: 'Patient logged a relapse', dotColor: colors.riskHigh },
};
const FALLBACK_ALERT_META = { badgeLabel: 'Alert', message: 'New alert', dotColor: colors.riskMedium };

function yesterdayOf(dateStr: string): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function dayLabel(iso: string): string {
  const today = getMauritiusDateString();
  const date = iso.slice(0, 10);
  if (date === today) return 'Today';
  if (date === yesterdayOf(today)) return 'Yesterday';
  return formatDateLabel(date);
}

/** Screen 13 — Doctor Alerts. Filter tabs filter useAlerts() data by read/urgency. */
export default function DoctorAlerts() {
  const { data: alerts } = useAlerts();
  const { data: patients } = usePatients();
  const [activeFilter, setActiveFilter] = useState<(typeof FILTERS)[number]>('All');

  const patientById = new Map(patients.patients.map((p) => [p.id, { name: p.name, avatarColor: p.avatarColor }]));

  const filteredAlerts = alerts.filter((alert) => {
    if (activeFilter === 'Unread') return !alert.read;
    if (activeFilter === 'High Risk') return alert.urgency === 'high';
    return true;
  });

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1">
        <ScrollView contentContainerClassName="px-5 pb-10" showsVerticalScrollIndicator={false}>
          <View className="mt-2 flex-row items-center justify-between">
            <Text className="text-2xl font-bold text-text-dark">Alerts</Text>
            <Ionicons name="notifications-outline" size={24} color={colors.textDark} />
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
                const mauritiusCreatedAt = toMauritiusIsoString(alert.createdAt);
                const name = patient?.name ?? alert.patientId.slice(0, 8);
                const isHigh = typeMeta.badgeLabel === 'High Risk' || typeMeta.badgeLabel === 'Relapse Logged';
                const badge = {
                  label: typeMeta.badgeLabel,
                  bg: isHigh ? colors.riskHighBg : colors.riskMediumBg,
                  text: isHigh ? colors.riskHighText : colors.riskMediumText,
                };
                const meta = `${dayLabel(mauritiusCreatedAt)}, ${formatTime(mauritiusCreatedAt)} • ${alert.read ? 'Read' : 'Unread'}`;
                return (
                  <AlertRow
                    key={alert.id}
                    dotColor={typeMeta.dotColor}
                    avatar={{ initials: name.split(' ').map((p) => p[0]).join(''), color: patient?.avatarColor ?? colors.textMuted }}
                    title={name}
                    message={typeMeta.message}
                    badge={badge}
                    meta={meta}
                  />
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

        <SOSButton />

        <DoctorTabBar active="alerts" />
      </View>
    </SafeAreaView>
  );
}
