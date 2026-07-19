import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Alert } from '../types';
import { supabase } from '../supabase';

/** A single patient's alerts, for the doctor's Patient Detail screen. Mirrors useAlerts's field mapping. */
export function usePatientAlertsForDoctor(patientId: string): { data: Alert[]; isLoading: boolean; error: null } {
  const [data, setData] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchAlerts = useCallback(async () => {
    if (!patientId) {
      setData([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const { data: rows } = await supabase
      .from('alerts')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });
    if (!isMountedRef.current) return;

    setData(
      (rows ?? []).map((row) => ({
        id: row.id,
        patientId: row.patient_id,
        doctorId: row.doctor_id,
        type: row.type,
        urgency: row.urgency,
        xaiExplanation: row.xai_explanation,
        read: row.read,
        createdAt: row.created_at,
      }))
    );
    setIsLoading(false);
  }, [patientId]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  useFocusEffect(
    useCallback(() => {
      fetchAlerts();
    }, [fetchAlerts])
  );

  return { data, isLoading, error: null };
}
