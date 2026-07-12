import { CheckIn } from '../types';
import { CHECK_INS, MOCK_TODAY, PATIENT_ID } from '../mockData';

interface UseCheckInsResult {
  data: CheckIn[];
  isLoading: boolean;
  error: null;
  /** Whether MOCK_TODAY already has a logged check-in — see docs/Known-Issues.md #2. */
  hasCheckedInToday: boolean;
}

/** Same shape everywhere so swapping in a real Supabase query later never changes calling code. */
export function useCheckIns(patientId: string = PATIENT_ID): UseCheckInsResult {
  const data = CHECK_INS.filter((c) => c.patientId === patientId);

  return {
    data,
    isLoading: false,
    error: null,
    hasCheckedInToday: data.some((c) => c.date === MOCK_TODAY),
  };
}
