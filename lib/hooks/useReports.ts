import { WeeklyReport } from '../types';
import { PATIENT_ID, REPORTS } from '../mockData';

export function useReports(patientId: string = PATIENT_ID): { data: WeeklyReport[]; isLoading: boolean; error: null } {
  return {
    data: REPORTS.filter((r) => r.patientId === patientId),
    isLoading: false,
    error: null,
  };
}
