import { useEffect, useState } from 'react';
import { Profile } from '../types';
import { supabase } from '../supabase';
import { useSession } from './useSession';

// specialty/joinedDate aren't part of the documented `profiles` schema
// (see CLAUDE.md / Development Plan §1.2) — kept off the shared Profile
// interface, same reasoning as the old mock comment.
export interface DoctorProfileData extends Profile {
  specialty: string;
  joinedDate: string; // ISO date
}

/** Doctor's own profile, defaulting to the signed-in doctor. */
export function useDoctorProfile(doctorId?: string): { data: DoctorProfileData | null; isLoading: boolean; error: null } {
  const { session } = useSession();
  const resolvedDoctorId = doctorId ?? session?.user.id;

  const [data, setData] = useState<DoctorProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!resolvedDoctorId) {
      setData(null);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    (async () => {
      const [{ data: row }, { data: userData }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', resolvedDoctorId).single(),
        supabase.auth.getUser(),
      ]);
      if (!isMounted) return;

      if (!row) {
        setData(null);
        setIsLoading(false);
        return;
      }

      setData({
        id: row.id,
        role: row.role,
        fullName: row.full_name,
        assignedDoctorId: row.assigned_doctor_id,
        archived: row.archived,
        sobrietyStartDate: row.sobriety_start_date,
        joinedDate: userData.user?.created_at ?? row.created_at,
        // No `specialty` field exists anywhere in the schema (profiles or
        // auth) — placeholder pending a real column, not a per-doctor value.
        specialty: 'Addiction Medicine',
      });
      setIsLoading(false);
    })();

    return () => {
      isMounted = false;
    };
  }, [resolvedDoctorId]);

  return { data, isLoading, error: null };
}
