import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../constants/theme';

export type MoodKey = 'rough' | 'low' | 'okay' | 'good' | 'great';

export interface MoodLevel {
  key: MoodKey;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  bg: string;
  text: string;
}

/** Worst → best, used by the journal entry mood picker and the journal list's per-entry avatar. */
export const MOOD_LEVELS: MoodLevel[] = [
  { key: 'rough', icon: 'emoticon-cry-outline', color: colors.riskHigh, bg: colors.riskHighBg, text: colors.riskHighText },
  { key: 'low', icon: 'emoticon-sad-outline', color: colors.riskMedium, bg: colors.riskMediumBg, text: colors.riskMediumText },
  { key: 'okay', icon: 'emoticon-neutral-outline', color: colors.moodOkay, bg: colors.moodOkayBg, text: colors.moodOkayText },
  { key: 'good', icon: 'emoticon-happy-outline', color: colors.riskLow, bg: colors.riskLowBg, text: colors.riskLowText },
  { key: 'great', icon: 'emoticon-excited-outline', color: colors.riskLow, bg: colors.riskLowBg, text: colors.riskLowText },
];

export function getMoodLevel(key: MoodKey): MoodLevel {
  return MOOD_LEVELS.find((m) => m.key === key) ?? MOOD_LEVELS[2];
}
