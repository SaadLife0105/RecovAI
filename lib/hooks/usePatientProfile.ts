import { useEffect, useState } from 'react';
import { Profile } from '../types';
import { supabase } from '../supabase';
import { useSession } from './useSession';

export interface PatientProfileData extends Profile {
  /** Resolved via a follow-up query on assignedDoctorId; null if the patient has no assigned doctor. */
  assignedDoctorName: string | null;
  /** Same follow-up query; null if the doctor hasn't set a phone number yet. */
  assignedDoctorPhone: string | null;
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

      // Reads the doctor's own profiles row. This only returns anything from
      // migration 0018 onward, which added the select policy that finally
      // permits it — see that migration's header for why it was silently
      // empty before.
      let assignedDoctorName: string | null = null;
      let assignedDoctorPhone: string | null = null;
      if (row.assigned_doctor_id) {
        const { data: doctorRow } = await supabase
          .from('profiles')
          .select('full_name, phone')
          .eq('id', row.assigned_doctor_id)
          .single();
        if (!isMounted) return;
        assignedDoctorName = doctorRow?.full_name ?? null;
        assignedDoctorPhone = doctorRow?.phone ?? null;
      }

      setData({
        id: row.id,
        role: row.role,
        fullName: row.full_name,
        assignedDoctorId: row.assigned_doctor_id,
        archived: row.archived,
        sobrietyStartDate: row.sobriety_start_date,
        avatarKey: row.avatar_key,
        contactEmail: row.contact_email,
        phone: row.phone,
        dateOfBirth: row.date_of_birth,
        assignedDoctorName,
        assignedDoctorPhone,
      });
      setIsLoading(false);
    })();

    return () => {
      isMounted = false;
    };
  }, [resolvedPatientId]);

  return { data, isLoading, error: null };
}
