import { ImageSourcePropType } from 'react-native';

// Day-range boundaries from docs/Illustrations.md "Streak Badges" table, in order.
const STREAK_ILLUSTRATIONS: { maxDays: number; source: ImageSourcePropType }[] = [
  { maxDays: 5, source: require('../assets/illustrations/streak-1-1-5-days.png') },
  { maxDays: 10, source: require('../assets/illustrations/streak-2-6-10-days.png') },
  { maxDays: 20, source: require('../assets/illustrations/streak-3-11-20-days.png') },
  { maxDays: 30, source: require('../assets/illustrations/streak-4-21-30-days.png') },
  { maxDays: 40, source: require('../assets/illustrations/streak-5-31-40-days.png') },
  { maxDays: 50, source: require('../assets/illustrations/streak-6-41-50-days.png') },
  { maxDays: 75, source: require('../assets/illustrations/streak-7-51-75-days.png') },
  { maxDays: 100, source: require('../assets/illustrations/streak-8-76-100-days.png') },
  { maxDays: 125, source: require('../assets/illustrations/streak-9-101-125-days.png') },
  { maxDays: 150, source: require('../assets/illustrations/streak-10-126-150-days.png') },
  { maxDays: 200, source: require('../assets/illustrations/streak-11-151-200-days.png') },
  { maxDays: 225, source: require('../assets/illustrations/streak-12-201-225-days.png') },
  { maxDays: 250, source: require('../assets/illustrations/streak-13-226-250-days.png') },
  { maxDays: 275, source: require('../assets/illustrations/streak-14-251-275-days.png') },
  { maxDays: 300, source: require('../assets/illustrations/streak-15-276-300-days.png') },
  { maxDays: 350, source: require('../assets/illustrations/streak-16-301-350-days.png') },
];

/** Maps a days-sober count to its streak badge illustration (see docs/Illustrations.md). Days beyond 350 keep the highest tier. */
export function getStreakIllustration(days: number): ImageSourcePropType {
  const tier = STREAK_ILLUSTRATIONS.find((t) => days <= t.maxDays);
  return (tier ?? STREAK_ILLUSTRATIONS[STREAK_ILLUSTRATIONS.length - 1]).source;
}
