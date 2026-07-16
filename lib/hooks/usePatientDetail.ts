import { useEffect, useState } from 'react';
import { supabase } from '../supabase';

export interface PatientDetailData {
  id: string;
  name: string;
  username: string | null;
  archived: boolean;
  latestScore: number | null;
  trendData: number[]; // chronological, up to last 7 check-ins
  trendDelta: number | null; // null if fewer than 2 check-ins exist — not enough data for a trend
}

/** Doctor's view of a single patient's detail screen. */
export function usePatientDetail(patientId?: string): { data: PatientDetailData | null; isLoading: boolean; error: null } {
  const [data, setData] = useState<PatientDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!patientId) {
      setData(null);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    (async () => {
      const [{ data: profileRow }, { data: checkinRows }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', patientId).single(),
        supabase.from('checkins').select('*').eq('patient_id', patientId).order('date', { ascending: true }),
      ]);
      if (!isMounted) return;

      if (!profileRow) {
        setData(null);
        setIsLoading(false);
        return;
      }

      const window = (checkinRows ?? []).slice(-7);
      const trendData = window.map((row) => row.risk_score);
      const latestScore = trendData.length ? trendData[trendData.length - 1] : null;
      const trendDelta = trendData.length >= 2 ? trendData[trendData.length - 1] - trendData[0] : null;

      setData({
        id: profileRow.id,
        name: profileRow.full_name,
        username: profileRow.username,
        archived: profileRow.archived,
        latestScore,
        trendData,
        trendDelta,
      });
      setIsLoading(false);
    })();

    return () => {
      isMounted = false;
    };
  }, [patientId]);

  return { data, isLoading, error: null };
}
