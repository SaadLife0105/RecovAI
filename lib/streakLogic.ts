import { daysBetween } from './mauritiusTime';

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastCheckinDate: string | null; // "YYYY-MM-DD", Mauritius time
}

/** Given the existing streak state and today's Mauritius date, returns the streak after today's check-in. isNewDay is false if today's check-in was already recorded (no change). */
export function computeNextStreak(state: StreakState, todayMauritius: string): StreakState & { isNewDay: boolean } {
  if (state.lastCheckinDate === todayMauritius) {
    return { ...state, isNewDay: false };
  }

  const gap = state.lastCheckinDate ? daysBetween(state.lastCheckinDate, todayMauritius) : null;
  const nextCurrent = gap === 1 ? state.currentStreak + 1 : 1;
  const nextLongest = Math.max(state.longestStreak, nextCurrent);

  return {
    currentStreak: nextCurrent,
    longestStreak: nextLongest,
    lastCheckinDate: todayMauritius,
    isNewDay: true,
  };
}
