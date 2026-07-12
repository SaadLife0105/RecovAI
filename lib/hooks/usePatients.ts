import { PatientRowData } from '../../components/cards/PatientListRow';
import { DOCTOR_CASELOAD_STATS, PATIENTS } from '../mockData';

interface PatientsData {
  patients: PatientRowData[];
  totalPatients: number;
  highRisk: number;
  predictedHighRisk: number;
}

/** Doctor's caseload for the Mission Control dashboard. */
export function usePatients(_doctorId?: string): { data: PatientsData; isLoading: boolean; error: null } {
  return {
    data: { patients: PATIENTS, ...DOCTOR_CASELOAD_STATS },
    isLoading: false,
    error: null,
  };
}
