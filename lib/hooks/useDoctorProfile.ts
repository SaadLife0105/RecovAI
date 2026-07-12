import { DoctorProfileMock, DOCTOR_ID, DOCTOR_PROFILE } from '../mockData';

export function useDoctorProfile(doctorId: string = DOCTOR_ID): { data: DoctorProfileMock | null; isLoading: boolean; error: null } {
  return {
    data: doctorId === DOCTOR_PROFILE.id ? DOCTOR_PROFILE : null,
    isLoading: false,
    error: null,
  };
}
