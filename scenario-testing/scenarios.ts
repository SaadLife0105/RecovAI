// The ten Phase 5.3 scenario definitions (Development Plan.md §5.3).
//
// Every day's inputs are written out explicitly rather than interpolated in
// code: these exact numbers were hand-verified against computeRiskScore before
// the harness existed, so they are the spec, not a derived convenience. If a
// computed score disagrees with `expectedFinalScore`, the seeding is wrong (or
// the formula changed) — do NOT edit the inputs to make the mismatch go away.

import type { DrugClass } from '../lib/types';

export type ZoneLevel = 'safe' | 'low_risk' | 'medium_risk' | 'high_risk';

export interface Day {
  craving: number;
  mood: number;
  sleep: number;
  isolated: boolean;
  steps: number;
  zone: ZoneLevel;
}

export interface Scenario {
  id: string;
  name: string;
  /** What §5.3 expects the agent to do — recorded in the results file so the
   * honest correct/incorrect discussion has something to compare against. */
  expectation: string;
  days: Day[];
  drugClass: DrugClass;
  /** A historical zone breach to seed, N days before the final (test) day. */
  breach?: { classification: 'medium_risk' | 'high_risk'; daysAgo: number; label: string };
  /** 1-indexed day to backdate a seeded "already alerted" alerts row to. */
  seedAlertOnDay?: number;
  /** Hand-calculated score for the LAST day. The harness compares this against
   * what computeRiskScore actually returns and reports any mismatch. */
  expectedFinalScore: number;
}

const CALM: Day = { craving: 2, mood: 8, sleep: 7, isolated: false, steps: 6000, zone: 'safe' };
const SPIKE: Day = { craving: 9, mood: 2, sleep: 3, isolated: true, steps: 1000, zone: 'safe' };

/** Six calm days — the shared lead-in for scenarios (b) and (d). */
const sixCalmDays = (): Day[] => Array.from({ length: 6 }, () => ({ ...CALM }));

export const SCENARIOS: Scenario[] = [
  {
    id: 'a',
    name: 'Routine low-risk, flat',
    expectation: 'No action. Nothing has changed; alerting here is alert fatigue.',
    days: Array.from({ length: 7 }, () => ({ ...CALM })),
    drugClass: 'cannabis',
    expectedFinalScore: 14.5,
  },
  {
    id: 'b',
    name: 'Sharp spike after a calm week',
    expectation: 'Alert the doctor, with an XAI explanation.',
    days: [...sixCalmDays(), { ...SPIKE }],
    drugClass: 'cannabis',
    expectedFinalScore: 78.5,
  },
  {
    id: 'c',
    name: 'Medium score, compounding signals (breach + sleep decline + rising craving)',
    expectation: 'Nuanced multi-action response — the score alone understates the picture.',
    days: [
      { craving: 2, mood: 8, sleep: 7, isolated: false, steps: 6000, zone: 'safe' },
      { craving: 3, mood: 7, sleep: 7, isolated: false, steps: 6000, zone: 'safe' },
      { craving: 4, mood: 7, sleep: 6, isolated: false, steps: 6000, zone: 'safe' },
      { craving: 4, mood: 6, sleep: 6, isolated: false, steps: 6000, zone: 'safe' },
      { craving: 5, mood: 6, sleep: 5, isolated: false, steps: 6000, zone: 'safe' },
      { craving: 6, mood: 5, sleep: 5, isolated: false, steps: 6000, zone: 'safe' },
      { craving: 7, mood: 4, sleep: 4, isolated: false, steps: 1500, zone: 'medium_risk' },
    ],
    drugClass: 'cannabis',
    breach: { classification: 'medium_risk', daysAgo: 2, label: 'Scenario harness zone — C' },
    expectedFinalScore: 58,
  },
  {
    id: 'd',
    name: 'High craving alone, everything else fine',
    expectation: 'Supportive patient message; probably not a doctor alert.',
    days: [...sixCalmDays(), { craving: 9, mood: 7, sleep: 7, isolated: false, steps: 6000, zone: 'safe' }],
    drugClass: 'cannabis',
    expectedFinalScore: 37.5,
  },
  {
    id: 'e',
    name: 'Same high score as yesterday, already alerted',
    expectation: 'Restraint — no duplicate alert for an unchanged, already-alerted score.',
    days: [...Array.from({ length: 5 }, () => ({ ...CALM })), { ...SPIKE }, { ...SPIKE }],
    drugClass: 'cannabis',
    seedAlertOnDay: 6,
    expectedFinalScore: 78.5,
  },
  {
    id: 'f',
    name: 'Slow week-long deterioration',
    expectation: 'Alert — the gradual slope is exactly what a fixed threshold misses until day 7.',
    days: [
      { craving: 3, mood: 8, sleep: 7, isolated: false, steps: 6000, zone: 'safe' },
      { craving: 4, mood: 7, sleep: 6, isolated: false, steps: 6000, zone: 'safe' },
      { craving: 5, mood: 6, sleep: 6, isolated: false, steps: 6000, zone: 'safe' },
      { craving: 6, mood: 5, sleep: 5, isolated: false, steps: 6000, zone: 'safe' },
      { craving: 7, mood: 4, sleep: 4, isolated: false, steps: 6000, zone: 'safe' },
      { craving: 8, mood: 3, sleep: 3, isolated: true, steps: 6000, zone: 'safe' },
      { craving: 9, mood: 2, sleep: 2, isolated: true, steps: 1500, zone: 'safe' },
    ],
    drugClass: 'cannabis',
    expectedFinalScore: 80,
  },
  {
    id: 'g',
    name: 'Low score throughout, but a high-risk zone breach 2 days ago',
    expectation: 'Judgement call — the breach is context the score never sees.',
    days: Array.from({ length: 7 }, () => ({ ...CALM })),
    drugClass: 'cannabis',
    breach: { classification: 'high_risk', daysAgo: 2, label: 'Scenario harness zone — G' },
    expectedFinalScore: 14.5,
  },
  {
    id: 'h',
    name: 'Persistent isolation, otherwise stable',
    expectation: 'Probably a supportive message; a week of isolation is not a doctor alert on its own.',
    days: Array.from({ length: 7 }, () => ({ craving: 2, mood: 8, sleep: 7, isolated: true, steps: 6000, zone: 'safe' })),
    drugClass: 'cannabis',
    expectedFinalScore: 29.5,
  },
  {
    id: 'i',
    name: 'New patient — only 3 days of history, sharp jump on day 3',
    expectation: 'Act on thin history without over-reading a 3-point trend.',
    days: [
      { craving: 3, mood: 7, sleep: 6, isolated: false, steps: 6000, zone: 'safe' },
      { craving: 4, mood: 6, sleep: 6, isolated: false, steps: 6000, zone: 'safe' },
      { craving: 8, mood: 3, sleep: 3, isolated: true, steps: 1500, zone: 'safe' },
    ],
    drugClass: 'cannabis',
    expectedFinalScore: 73.5,
  },
  {
    id: 'j',
    name: "Drug-class sensitivity — scenario (b)'s exact sequence, opioid patient",
    expectation:
      "Same inputs as (b) but heroin_opioids: expect more urgency in the agent's framing, not just a higher number. Compare directly against (b)'s runs.",
    days: [...sixCalmDays(), { ...SPIKE }],
    drugClass: 'heroin_opioids',
    // 78.5 × 1.15 sensitivity
    expectedFinalScore: 90.275,
  },
];
