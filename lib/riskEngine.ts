import { DrugClass } from './types';

export const CLASS_SENSITIVITY: Record<DrugClass, number> = {
  heroin_opioids: 1.15,
  synthetic_cannabinoids: 1.10,
  stimulants: 1.05,
  sedatives_benzo: 1.05,
  other_polydrug: 1.05,
  cannabis: 1.00,
};

export interface RiskInputs {
  craving: number; // 1–10
  mood: number; // 1–10
  sleep: number; // 1–10
  isolated: boolean;
  steps: number;
  nearRiskZone: boolean;
}

export interface RiskBreakdown {
  cravingContribution: number;
  moodContribution: number;
  sleepContribution: number;
  isolationContribution: number;
  lowActivityContribution: number;
  zoneProximityContribution: number;
  base: number;
  sensitivityMultiplier: number;
  score: number;
}

/** The base formula before the drug-class sensitivity modifier — identical for every patient. */
export function computeBreakdown(inputs: RiskInputs, primaryDrugClass: DrugClass): RiskBreakdown {
  const cravingContribution = inputs.craving * 0.3 * 10;
  const moodContribution = (10 - inputs.mood) * 0.2 * 10;
  const sleepContribution = (10 - inputs.sleep) * 0.15 * 10;
  const isolationContribution = inputs.isolated ? 15 : 0;
  const lowActivityContribution = inputs.steps < 2000 ? 10 : 0;
  const zoneProximityContribution = inputs.nearRiskZone ? 10 : 0;

  const base =
    cravingContribution +
    moodContribution +
    sleepContribution +
    isolationContribution +
    lowActivityContribution +
    zoneProximityContribution;

  const sensitivityMultiplier = CLASS_SENSITIVITY[primaryDrugClass];
  const score = Math.min(100, Math.max(0, base * sensitivityMultiplier));

  return {
    cravingContribution,
    moodContribution,
    sleepContribution,
    isolationContribution,
    lowActivityContribution,
    zoneProximityContribution,
    base,
    sensitivityMultiplier,
    score,
  };
}

/** Convenience wrapper when only the final number is needed. */
export function computeRiskScore(inputs: RiskInputs, primaryDrugClass: DrugClass): number {
  return computeBreakdown(inputs, primaryDrugClass).score;
}
