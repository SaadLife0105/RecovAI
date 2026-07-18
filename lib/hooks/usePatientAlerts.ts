import { useEffect, useState } from 'react';
import { Alert } from '../types';
import { supabase } from '../supabase';
import { useSession } from './useSession';

/**
 * Patient's own alerts, backed by the `alerts` table — genuinely separate
 * from useAlerts.ts (doctor inbox, filters by doctor_id). Deliberately not
 * merged: the query semantics differ (patient_id vs doctor_id), and merging
 * them is exactly what caused useActivityFeed.ts to query the wrong column.
 */
export function usePatientAlerts(patientId?: string): { data: Alert[]; isLoading: boolean; error: null } {
  const { session } = useSession();
  const resolvedPatientId = patientId ?? session?.user.id;

  const [data, setData] = useState<Alert[]>([]);
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
      .from('alerts')
      .select('*')
      .eq('patient_id', resolvedPatientId)
      .order('created_at', { ascending: false })
      .then(({ data: rows }) => {
        if (!isMounted) return;
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
      });

    return () => {
      isMounted = false;
    };
  }, [resolvedPatientId]);

  return { data, isLoading, error: null };
}
