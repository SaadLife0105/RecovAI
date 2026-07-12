import { Profile } from '../types';
import { DOCTOR_PROFILE, PATIENT_ID, PATIENT_PROFILE } from '../mockData';

export interface PatientProfileData extends Profile {
  /** Resolved from assignedDoctorId — a real query would join or follow up; this hook hides that. */
  assignedDoctorName: string | null;
}

export function usePatientProfile(patientId: string = PATIENT_ID): { data: PatientProfileData | null; isLoading: boolean; error: null } {
  if (patientId !== PATIENT_PROFILE.id) {
    return { data: null, isLoading: false, error: null };
  }

  return {
    data: {
      ...PATIENT_PROFILE,
      assignedDoctorName: PATIENT_PROFILE.assignedDoctorId === DOCTOR_PROFILE.id ? DOCTOR_PROFILE.fullName : null,
    },
    isLoading: false,
    error: null,
  };
}
