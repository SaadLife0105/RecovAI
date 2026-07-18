import { useEffect, useState } from 'react';
import { RiskZone } from '../types';
import { supabase } from '../supabase';
import { useSession } from './useSession';

/** Same shape as useCheckIns — patientId defaults to the current session user. */
export function useRiskZones(patientId?: string): { data: RiskZone[]; isLoading: boolean; error: null } {
  const { session } = useSession();
  const resolvedPatientId = patientId ?? session?.user.id;

  const [data, setData] = useState<RiskZone[]>([]);
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
      .from('risk_zones')
      .select('*')
      .eq('patient_id', resolvedPatientId)
      .then(({ data: rows }) => {
        if (!isMounted) return;
        setData(
          (rows ?? []).map((row) => ({
            id: row.id,
            patientId: row.patient_id,
            doctorId: row.doctor_id,
            lat: row.lat,
            lng: row.lng,
            radiusM: row.radius_m,
            zoneType: row.zone_type,
            classification: row.classification,
            label: row.label,
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
