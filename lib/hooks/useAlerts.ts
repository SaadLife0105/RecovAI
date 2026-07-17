import { useEffect, useState } from 'react';
import { Alert } from '../types';
import { supabase } from '../supabase';
import { useSession } from './useSession';

/** Doctor's alert inbox, backed by the `alerts` table. */
export function useAlerts(doctorId?: string): { data: Alert[]; isLoading: boolean; error: null } {
  const { session } = useSession();
  const resolvedDoctorId = doctorId ?? session?.user.id;

  const [data, setData] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!resolvedDoctorId) {
      setData([]);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    supabase
      .from('alerts')
      .select('*')
      .eq('doctor_id', resolvedDoctorId)
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
  }, [resolvedDoctorId]);

  return { data, isLoading, error: null };
}
