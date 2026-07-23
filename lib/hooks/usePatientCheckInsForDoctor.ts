import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { CheckIn } from '../types';
import { supabase } from '../supabase';

/**
 * A single patient's check-in history, for the doctor's Patient Detail screen.
 *
 * Structurally identical to usePatientAlertsForDoctor — plain focus-refetch,
 * no Realtime channel. Ordered date-descending (newest first), unlike
 * useCheckIns, which the patient's own screens need ascending for charting.
 */
export function usePatientCheckInsForDoctor(patientId: string): { data: CheckIn[]; isLoading: boolean; error: null } {
  const [data, setData] = useState<CheckIn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchCheckIns = useCallback(async () => {
    if (!patientId) {
      setData([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const { data: rows } = await supabase
      .from('checkins')
      .select('*')
      .eq('patient_id', patientId)
      .order('date', { ascending: false });
    if (!isMountedRef.current) return;

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
  }, [patientId]);

  useEffect(() => {
    fetchCheckIns();
  }, [fetchCheckIns]);

  useFocusEffect(
    useCallback(() => {
      fetchCheckIns();
    }, [fetchCheckIns])
  );

  return { data, isLoading, error: null };
}
