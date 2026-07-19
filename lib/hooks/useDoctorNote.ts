import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { DoctorNote } from '../types';
import { supabase } from '../supabase';

/** The most recent doctor note for a patient (doctor_notes is scoped by RLS to the signed-in doctor). */
export function useDoctorNote(patientId: string): { data: DoctorNote | null; isLoading: boolean; error: null } {
  const [data, setData] = useState<DoctorNote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Refetch on focus too — Patient Detail's Notes card needs to show the
  // real new content after navigating back from Edit Note, not the stale
  // pre-edit version (expo-router doesn't remount the screen underneath).
  const fetchNote = useCallback(async () => {
    if (!patientId) {
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const { data: row } = await supabase
      .from('doctor_notes')
      .select('*')
      .eq('patient_id', patientId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!isMountedRef.current) return;

    setData(
      row
        ? {
            id: row.id,
            patientId: row.patient_id,
            doctorId: row.doctor_id,
            content: row.content,
            updatedAt: row.updated_at,
          }
        : null
    );
    setIsLoading(false);
  }, [patientId]);

  useEffect(() => {
    fetchNote();
  }, [fetchNote]);

  useFocusEffect(
    useCallback(() => {
      fetchNote();
    }, [fetchNote])
  );

  return { data, isLoading, error: null };
}

/**
 * Upserts the doctor's note for a patient: updates the existing (patient, doctor)
 * row's content + updated_at, or inserts a fresh row if none exists yet.
 * doctor_notes has no updated_at trigger, so we set it explicitly.
 */
export async function saveDoctorNote(patientId: string, content: string): Promise<{ error: string | null }> {
  const { data: { session } } = await supabase.auth.getSession();
  const doctorId = session?.user.id;
  if (!doctorId) return { error: 'Not signed in.' };

  const now = new Date().toISOString();

  const { data: existing, error: findError } = await supabase
    .from('doctor_notes')
    .select('id')
    .eq('patient_id', patientId)
    .eq('doctor_id', doctorId)
    .limit(1)
    .maybeSingle();
  if (findError) return { error: findError.message };

  const { error } = existing
    ? await supabase.from('doctor_notes').update({ content, updated_at: now }).eq('id', existing.id)
    : await supabase.from('doctor_notes').insert({ patient_id: patientId, doctor_id: doctorId, content, updated_at: now });

  return { error: error ? error.message : null };
}
