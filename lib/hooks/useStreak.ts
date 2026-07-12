import { CURRENT_STREAK, LONGEST_STREAK, PATIENT_ID } from '../mockData';

interface StreakData {
  currentStreak: number;
  longestStreak: number;
}

/**
 * Days-sober streak. Static mock numbers for now — real computation needs
 * Mauritius-timezone-aware day boundaries, which lands with the risk
 * engine (see docs/Development Plan.md §2.1/§2.2), not here.
 */
export function useStreak(_patientId: string = PATIENT_ID): { data: StreakData; isLoading: boolean; error: null } {
  return {
    data: { currentStreak: CURRENT_STREAK, longestStreak: LONGEST_STREAK },
    isLoading: false,
    error: null,
  };
}
