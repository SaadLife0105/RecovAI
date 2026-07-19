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

// 4-level zone-breach labeling. Note low_risk deliberately uses moodOkay (not
// riskLow, which is reserved for "safe") to match the
// Safe→Low→Medium→High = riskLow→moodOkay→riskMedium→riskHigh gradient.
const ZONE_BREACH_META: Record<
  'safe' | 'low_risk' | 'medium_risk' | 'high_risk',
  { title: string; iconColor: string; iconBg: string }
> = {
  safe: { title: 'Entered safe zone', iconColor: colors.secondary, iconBg: colors.secondaryBg },
  low_risk: { title: 'Entered low-risk zone', iconColor: colors.moodOkay, iconBg: colors.moodOkayBg },
  medium_risk: { title: 'Entered medium-risk zone', iconColor: colors.riskMedium, iconBg: colors.riskMediumBg },
  high_risk: { title: 'Entered high-risk zone', iconColor: colors.riskHigh, iconBg: colors.riskHighBg },
};

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
    const zoneMeta = ZONE_BREACH_META[zone.classification];
    items.push({
      id: `zone-${breach.id}`,
      type: 'zone',
      title: zoneMeta.title,
      subtitle: zone.label,
      timestamp: breach.detectedAt,
      icon: 'location',
      iconColor: zoneMeta.iconColor,
      iconBg: zoneMeta.iconBg,
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
