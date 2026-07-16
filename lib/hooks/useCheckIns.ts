import { useEffect, useState } from 'react';
import { CheckIn } from '../types';
import { supabase } from '../supabase';
import { getMauritiusDateString } from '../mauritiusTime';
import { useSession } from './useSession';

interface UseCheckInsResult {
  data: CheckIn[];
  isLoading: boolean;
  error: null;
  /** Whether today (Mauritius time) already has a logged check-in. */
  hasCheckedInToday: boolean;
}

/** Same shape everywhere so swapping in a real Supabase query later never changes calling code. */
export function useCheckIns(patientId?: string): UseCheckInsResult {
  const { session } = useSession();
  const resolvedPatientId = patientId ?? session?.user.id;

  const [data, setData] = useState<CheckIn[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!resolvedPatientId) {
      setData([]);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    supabase
      .from('checkins')
      .select('*')
      .eq('patient_id', resolvedPatientId)
      .order('date', { ascending: true })
      .then(({ data: rows }) => {
        if (!isMounted) return;
        setData(
          (rows ?? []).map((row) => ({
            id: row.id,
            patientId: row.patient_id,
            date: row.date,
            mood: row.mood,
            sleep: row.sleep,
            craving: row.craving,
            isolated: row.isolated,
            steps: row.steps,
            riskScore: row.risk_score,
            createdAt: row.created_at,
          }))
        );
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [resolvedPatientId]);

  return {
    data,
    isLoading,
    error: null,
    hasCheckedInToday: data.some((c) => c.date === getMauritiusDateString()),
  };
}
