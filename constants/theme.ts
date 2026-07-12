/**
 * Design tokens for RecovAI.
 *
 * Source of truth is `tailwind.config.js` — these are the SAME values,
 * duplicated here because some libraries (react-native-svg props,
 * react-native-chart-kit config objects, dynamic style calculations)
 * take raw color strings and can't consume Tailwind classes.
 *
 * Rule: never hardcode a hex value in a screen or component. Import it
 * from here (for JS-side use) or use the matching Tailwind class (for
 * className-driven styling). If you need a new color, add it here AND
 * in tailwind.config.js in the same change.
 */

export const colors = {
  primary: '#0D9488',
  background: '#F8FAFC',
  surface: '#F1F5F9',
  card: '#FFFFFF',
  divider: '#E2E8F0',

  textDark: '#1E293B',
  textMuted: '#64748B',

  riskHigh: '#EF4444',
  riskHighBg: '#FEF2F2',
  riskHighText: '#B91C1C',

  riskMedium: '#F59E0B',
  riskMediumBg: '#FFFBEB',
  riskMediumText: '#B45309',

  riskLow: '#22C55E',
  riskLowBg: '#F0FDF4',
  riskLowText: '#15803D',

  safeZoneBg: '#F0FDF4',
  nearRiskBg: '#FFF1F2',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 999,
} as const;

/** 0–39 Low / 40–69 Medium / 70–100 High — see lib/riskEngine.ts */
export function riskBand(score: number): 'low' | 'medium' | 'high' {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

export function riskBandColors(score: number) {
  const band = riskBand(score);
  if (band === 'high') return { bg: colors.riskHighBg, text: colors.riskHighText, dot: colors.riskHigh };
  if (band === 'medium') return { bg: colors.riskMediumBg, text: colors.riskMediumText, dot: colors.riskMedium };
  return { bg: colors.riskLowBg, text: colors.riskLowText, dot: colors.riskLow };
}
