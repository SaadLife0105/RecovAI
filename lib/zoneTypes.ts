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
