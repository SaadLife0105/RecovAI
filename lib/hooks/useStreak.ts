import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useSession } from './useSession';

interface StreakData {
  currentStreak: number;
  longestStreak: number;
}

/** Check-in streak, backed by the `streaks` table (Mauritius-timezone-aware; see lib/streakLogic.ts). */
export function useStreak(patientId?: string): { data: StreakData; isLoading: boolean; error: null } {
  const { session } = useSession();
  const resolvedPatientId = patientId ?? session?.user.id;

  const [data, setData] = useState<StreakData>({ currentStreak: 0, longestStreak: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!resolvedPatientId) {
      setData({ currentStreak: 0, longestStreak: 0 });
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    supabase
      .from('streaks')
      .select('*')
      .eq('patient_id', resolvedPatientId)
      .maybeSingle()
      .then(({ data: row }) => {
        if (!isMounted) return;
        setData({
          currentStreak: row?.current_streak ?? 0,
          longestStreak: row?.longest_streak ?? 0,
        });
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [resolvedPatientId]);

  return { data, isLoading, error: null };
}
