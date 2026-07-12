import { riskBand } from '../../constants/theme';
import type { RiskBand } from '../types';
import { CHECK_INS, PATIENT_ID } from '../mockData';

interface RiskScoreData {
  score: number;
  band: RiskBand;
}

/** Current risk score — the most recent check-in's score, same value shown on Home and Profile. */
export function useRiskScore(patientId: string = PATIENT_ID): { data: RiskScoreData | null; isLoading: boolean; error: null } {
  const patientCheckIns = CHECK_INS.filter((c) => c.patientId === patientId);
  const latest = patientCheckIns[patientCheckIns.length - 1];

  return {
    data: latest ? { score: latest.riskScore, band: riskBand(latest.riskScore) } : null,
    isLoading: false,
    error: null,
  };
}
