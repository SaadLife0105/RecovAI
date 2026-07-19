import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../supabase';
import { computeForecast, ForecastResult } from '../forecast';

export interface PatientDetailData {
  id: string;
  name: string;
  username: string | null;
  archived: boolean;
  latestScore: number | null;
  trendData: number[]; // chronological, up to last 7 check-ins
  trendDelta: number | null; // null if fewer than 2 check-ins exist — not enough data for a trend
  forecast: ForecastResult | null; // null unless the patient has 7+ check-ins
}

/** Doctor's view of a single patient's detail screen. */
export function usePatientDetail(patientId?: string): { data: PatientDetailData | null; isLoading: boolean; error: null } {
  const [data, setData] = useState<PatientDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Refetches on mount AND on focus (see usePatients.ts for why the focus
  // case matters — e.g. archiving from this exact screen, then coming back
  // to it via router.back()+re-navigate, or editing the note and returning,
  // must not show stale archived/score/trend state).
  const fetchDetail = useCallback(async () => {
    if (!patientId) {
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    {
      const [{ data: profileRow }, { data: checkinRows }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', patientId).single(),
        supabase.from('checkins').select('*').eq('patient_id', patientId).order('date', { ascending: true }),
      ]);
      if (!isMountedRef.current) return;

      if (!profileRow) {
        setData(null);
        setIsLoading(false);
        return;
      }

      const history = (checkinRows ?? []).map((row) => row.risk_score);
      const trendData = history.slice(-7);
      const latestScore = trendData.length ? trendData[trendData.length - 1] : null;
      const trendDelta = trendData.length >= 2 ? trendData[trendData.length - 1] - trendData[0] : null;

      // Forecast needs exactly 7+ check-ins; feed the most recent 7 (same as usePatients.ts).
      const forecast = history.length >= 7 ? computeForecast(history.slice(-7)) : null;

      setData({
        id: profileRow.id,
        name: profileRow.full_name,
        username: profileRow.username,
        archived: profileRow.archived,
        latestScore,
        trendData,
        trendDelta,
        forecast,
      });
      setIsLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  useFocusEffect(
    useCallback(() => {
      fetchDetail();
    }, [fetchDetail])
  );

  return { data, isLoading, error: null };
}

/**
 * Archive or restore a patient. Relies on migration 0006's "doctor updates
 * assigned patients" policy. Only `archived` is ever written here.
 */
export async function setPatientArchived(patientId: string, archived: boolean): Promise<{ error: string | null }> {
  const { error } = await supabase.from('profiles').update({ archived }).eq('id', patientId);
  return { error: error ? error.message : null };
}
