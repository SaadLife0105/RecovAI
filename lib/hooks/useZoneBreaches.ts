import { useEffect, useState } from 'react';
import { ZoneBreach } from '../types';
import { supabase } from '../supabase';
import { useSession } from './useSession';

/** Same shape as useCheckIns — patientId defaults to the current session user. */
export function useZoneBreaches(patientId?: string): { data: ZoneBreach[]; isLoading: boolean; error: null } {
  const { session } = useSession();
  const resolvedPatientId = patientId ?? session?.user.id;

  const [data, setData] = useState<ZoneBreach[]>([]);
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
      .from('zone_breaches')
      .select('*')
      .eq('patient_id', resolvedPatientId)
      .order('detected_at', { ascending: false })
      .then(({ data: rows }) => {
        if (!isMounted) return;
        setData(
          (rows ?? []).map((row) => ({
            id: row.id,
            patientId: row.patient_id,
            zoneId: row.zone_id,
            detectedAt: row.detected_at,
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
