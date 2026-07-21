import { colors } from '../constants/theme';
import { formatDateLabel, todayDeviceLocalDateString } from './formatDate';

// Shared by the Alerts screen and Patient Detail's Recent Alerts — keep this
// the single source of truth so the two screens can't drift apart.
export const ALERT_TYPE_META: Record<string, { badgeLabel: string; message: string; dotColor: string }> = {
  high_risk: { badgeLabel: 'High Risk', message: 'High risk score detected', dotColor: colors.riskHigh },
  missed_checkin: { badgeLabel: 'Missed Check-in', message: 'No check-in recorded today', dotColor: colors.riskMedium },
  zone_breach: { badgeLabel: 'Zone Breach', message: 'Entered a risk zone', dotColor: colors.riskMedium },
  predicted_high_risk: { badgeLabel: 'Predicted High Risk', message: 'High risk predicted for next 24h', dotColor: colors.riskMedium },
  relapse_logged: { badgeLabel: 'Relapse Logged', message: 'Patient logged a relapse', dotColor: colors.riskHigh },
  // Phase 5: raised by the risk-agent's own judgement, distinct from the old
  // deterministic high_risk_score alerts (Development Plan.md §5.0 point 1).
  agent_alert: { badgeLabel: 'AI Agent Alert', message: 'The monitoring agent raised a concern', dotColor: colors.riskHigh },
  high_risk_score: { badgeLabel: 'High Risk', message: 'High risk score detected', dotColor: colors.riskHigh },
};
export const FALLBACK_ALERT_META = { badgeLabel: 'Alert', message: 'New alert', dotColor: colors.riskMedium };

export function yesterdayOf(dateStr: string): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function dayLabel(iso: string): string {
  const today = todayDeviceLocalDateString();
  const date = iso.slice(0, 10);
  if (date === today) return 'Today';
  if (date === yesterdayOf(today)) return 'Yesterday';
  return formatDateLabel(date);
}
