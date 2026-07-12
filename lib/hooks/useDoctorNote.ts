import { DoctorNote } from '../types';
import { DOCTOR_NOTES, PATIENT_ID } from '../mockData';

export function useDoctorNote(patientId: string = PATIENT_ID): { data: DoctorNote | null; isLoading: boolean; error: null } {
  return {
    data: DOCTOR_NOTES.find((n) => n.patientId === patientId) ?? null,
    isLoading: false,
    error: null,
  };
}

/**
 * Mutates the mock note in place — not a hook itself, just the write
 * side of this domain until real persistence lands. Screens that read
 * via useDoctorNote() on a fresh render (e.g. navigating back) will see
 * the update since it's the same underlying object.
 */
export function updateDoctorNote(patientId: string, content: string, updatedAt: string) {
  const note = DOCTOR_NOTES.find((n) => n.patientId === patientId);
  if (note) {
    note.content = content;
    note.updatedAt = updatedAt;
  }
}
