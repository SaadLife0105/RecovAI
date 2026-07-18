import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { useCheckIns } from './useCheckIns';
import { useRiskZones } from './useRiskZones';
import { usePatientAlerts } from './usePatientAlerts';
import { useJournalEntries } from './useJournalEntries';
import { useZoneBreaches } from './useZoneBreaches';

export type ActivityFeedItemType = 'checkin' | 'zone' | 'alert' | 'journal';

export interface ActivityFeedItem {
  id: string;
  type: ActivityFeedItemType;
  title: string;
  subtitle: string;
  timestamp: string; // ISO
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
}

const ALERT_LABELS: Record<string, { title: string; subtitle: string }> = {
  high_risk: { title: 'High risk score', subtitle: 'Risk score is elevated' },
  missed_checkin: { title: 'Missed check-in', subtitle: 'No check-in logged' },
  zone_breach: { title: 'Zone breach', subtitle: 'Entered a risk zone' },
  predicted_high_risk: { title: 'High risk score predicted', subtitle: 'High risk predicted for next 24h' },
};

/**
 * Unified, sorted activity feed for the patient History screen —
 * combines useCheckIns/useRiskZones/usePatientAlerts/useJournalEntries
 * instead of duplicating their mock data. A genuine combinator, not a new
 * mock data source: every field here traces back to one of those hooks.
 */
export function useActivityFeed(patientId?: string): { data: ActivityFeedItem[]; isLoading: boolean; error: null } {
  const { data: checkIns } = useCheckIns(patientId);
  const { data: riskZones } = useRiskZones(patientId);
  const { data: alerts } = usePatientAlerts(patientId);
  const { data: journalEntries } = useJournalEntries(patientId);
  const { data: zoneBreaches } = useZoneBreaches(patientId);

  const items: ActivityFeedItem[] = [];

  for (const checkIn of checkIns) {
    items.push({
      id: `checkin-${checkIn.id}`,
      type: 'checkin',
      title: 'Check-in completed',
      subtitle: checkIn.mood >= 6 ? 'Good mood reported' : 'Check-in logged',
      timestamp: checkIn.createdAt,
      icon: 'checkmark-circle',
      iconColor: colors.riskLow,
      iconBg: colors.riskLowBg,
    });
  }

  for (const breach of zoneBreaches) {
    const zone = riskZones.find((z) => z.id === breach.zoneId);
    if (!zone) continue; // zone since deleted — nothing to label this breach with
    const isRisk = zone.classification === 'risk';
    items.push({
      id: `zone-${breach.id}`,
      type: 'zone',
      title: isRisk ? 'Entered risk zone' : 'Entered safe zone',
      subtitle: zone.label,
      timestamp: breach.detectedAt,
      icon: 'location',
      iconColor: isRisk ? colors.riskHigh : colors.secondary,
      iconBg: isRisk ? colors.riskHighBg : colors.secondaryBg,
    });
  }

  for (const alert of alerts) {
    const label = ALERT_LABELS[alert.type] ?? { title: alert.type, subtitle: '' };
    items.push({
      id: `alert-${alert.id}`,
      type: 'alert',
      title: label.title,
      subtitle: label.subtitle,
      timestamp: alert.createdAt,
      icon: 'warning',
      iconColor: alert.urgency === 'high' ? colors.riskHigh : colors.riskMedium,
      iconBg: alert.urgency === 'high' ? colors.riskHighBg : colors.riskMediumBg,
    });
  }

  for (const entry of journalEntries) {
    items.push({
      id: `journal-${entry.id}`,
      type: 'journal',
      title: 'Journal entry added',
      subtitle: entry.text,
      timestamp: entry.createdAt,
      icon: 'create',
      iconColor: colors.riskMedium,
      iconBg: colors.riskMediumBg,
    });
  }

  items.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

  return { data: items, isLoading: false, error: null };
}
