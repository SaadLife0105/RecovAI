import { RiskZone } from '../types';
import { PATIENT_ID, RISK_ZONES } from '../mockData';

export function useRiskZones(patientId: string = PATIENT_ID): { data: RiskZone[]; isLoading: boolean; error: null } {
  return {
    data: RISK_ZONES.filter((z) => z.patientId === patientId),
    isLoading: false,
    error: null,
  };
}
