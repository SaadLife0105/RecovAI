import { useEffect, useState } from 'react';
import { Profile } from '../types';
import { supabase } from '../supabase';
import { useSession } from './useSession';

export interface PatientProfileData extends Profile {
  /** Resolved via a follow-up query on assignedDoctorId; null if the patient has no assigned doctor. */
  assignedDoctorName: string | null;
}

/** Patient's own profile, defaulting to the signed-in patient. */
export function usePatientProfile(patientId?: string): { data: PatientProfileData | null; isLoading: boolean; error: null } {
  const { session } = useSession();
  const resolvedPatientId = patientId ?? session?.user.id;

  const [data, setData] = useState<PatientProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!resolvedPatientId) {
      setData(null);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    (async () => {
      const { data: row } = await supabase.from('profiles').select('*').eq('id', resolvedPatientId).single();
      if (!isMounted) return;

      if (!row) {
        setData(null);
        setIsLoading(false);
        return;
      }

      let assignedDoctorName: string | null = null;
      if (row.assigned_doctor_id) {
        const { data: doctorRow } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', row.assigned_doctor_id)
          .single();
        if (!isMounted) return;
        assignedDoctorName = doctorRow?.full_name ?? null;
      }

      setData({
        id: row.id,
        role: row.role,
        fullName: row.full_name,
        assignedDoctorId: row.assigned_doctor_id,
        archived: row.archived,
        sobrietyStartDate: row.sobriety_start_date,
        assignedDoctorName,
      });
      setIsLoading(false);
    })();

    return () => {
      isMounted = false;
    };
  }, [resolvedPatientId]);

  return { data, isLoading, error: null };
}
