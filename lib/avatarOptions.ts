import type { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';

export interface AvatarOption {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

/**
 * The 8 fixed patient avatars, persisted as `profiles.avatar_key`.
 *
 * Deliberately a PLACEHOLDER set: Ionicons has no proper friendly-animal
 * icons, so these stand in until real generated artwork replaces them. Keys
 * are the stable contract with the database — changing an icon or color later
 * is free, changing a key is a migration.
 *
 * The first entry is the default: the onboarding avatar step preselects it so
 * "Next"/"Skip" always has a valid selection to save.
 */
export const AVATAR_OPTIONS: AvatarOption[] = [
  { key: 'paw', icon: 'paw', color: colors.primary },
  { key: 'fish', icon: 'fish', color: colors.secondary },
  // The *Text variants, not riskLow/riskMedium themselves — the avatar renders
  // as a white icon on a solid circle, and the base green/amber are far too
  // light to carry white at 4.5:1.
  { key: 'bug', icon: 'bug', color: colors.riskLowText },
  { key: 'sunny', icon: 'sunny', color: colors.riskMediumText },
  { key: 'moon', icon: 'moon', color: colors.avatarPurple },
  { key: 'star', icon: 'star', color: colors.riskHigh },
  { key: 'heart', icon: 'heart', color: colors.avatarPink },
  { key: 'planet', icon: 'planet', color: colors.avatarCyan },
];

export function findAvatarOption(key: string | null | undefined): AvatarOption | undefined {
  if (!key) return undefined;
  return AVATAR_OPTIONS.find((option) => option.key === key);
}
