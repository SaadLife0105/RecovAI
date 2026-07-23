import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';

/** Shared zone-type metadata — keys match RiskZone.zoneType exactly (see mockData.ts's RISK_ZONES). */
export const ZONE_TYPE_META: Record<string, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  bar_nightclub: { label: 'Bar / Nightclub', color: colors.riskHigh, bg: colors.riskHighBg, icon: 'wine' },
  drug_market: { label: 'Drug Market', color: colors.zoneDrugMarket, bg: colors.zoneDrugMarketBg, icon: 'storefront' },
  friends_house: { label: "Friend's House", color: colors.zoneFriendsHouse, bg: colors.zoneFriendsHouseBg, icon: 'people' },
  workplace: { label: 'Workplace', color: colors.secondary, bg: colors.secondaryBg, icon: 'briefcase' },
  home: { label: 'Home', color: colors.riskLow, bg: colors.riskLowBg, icon: 'home' },
  other: { label: 'Other', color: colors.textMuted, bg: colors.surface, icon: 'ellipsis-horizontal' },
};

/**
 * Zone-classification chip metadata — the 4-level gradient
 * (riskLow→moodOkay→riskMedium→riskHigh) shared by the patient-facing zone
 * chip, the add-zone selector, and both zone lists.
 *
 * `color` is the chip's TEXT color, so it uses the *Text tokens, not the vivid
 * band/dot tokens: riskMedium on riskMediumBg measured 2.07:1 and moodOkay on
 * moodOkayBg 1.85:1, far under AA. The *Text pairs all clear it.
 */
export const ZONE_STATUS_META: Record<
  'safe' | 'low_risk' | 'medium_risk' | 'high_risk',
  { label: string; color: string; bg: string }
> = {
  safe: { label: 'Safe', color: colors.riskLowText, bg: colors.riskLowBg },
  low_risk: { label: 'Low Risk', color: colors.moodOkayText, bg: colors.moodOkayBg },
  medium_risk: { label: 'Medium Risk', color: colors.riskMediumText, bg: colors.riskMediumBg },
  high_risk: { label: 'High Risk', color: colors.riskHighText, bg: colors.riskHighBg },
};
