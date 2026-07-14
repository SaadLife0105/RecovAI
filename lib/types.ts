/**
 * Core domain types for RecovAI.
 *
 * Keep this file as the single source of truth for shared shapes.
 * Anything that mirrors a DB table should mirror its columns exactly
 * (see docs/Development Plan.md §1.2 for the schema).
 */

// Mood scale is defined in lib/moodLevels.ts (it also carries the
// icon/color mapping used by the journal screens) — re-exported here so
// domain types can reference it without a second source of truth.
import type { MoodKey } from './moodLevels';
export type { MoodKey };

export type UserRole = 'patient' | 'doctor';

/**
 * Six-class drug taxonomy grounded in NDO 2024 national data.
 * The system models CLASSES, never individual drugs. See
 * docs/Development Plan.md §1.3 before touching this — this enum is
 * referenced by the DB enum, the risk-engine sensitivity map,
 * kb_documents metadata filtering, and agent context.
 */
export type DrugClass =
  | 'cannabis'
  | 'synthetic_cannabinoids'
  | 'heroin_opioids'
  | 'stimulants'
  | 'sedatives_benzo'
  | 'other_polydrug';

export const DRUG_CLASS_LABELS: Record<DrugClass, string> = {
  cannabis: 'Cannabis',
  synthetic_cannabinoids: 'Synthetic Cannabinoids / NPS',
  heroin_opioids: 'Heroin / Opioids',
  stimulants: 'Stimulants',
  sedatives_benzo: 'Sedatives / Benzodiazepines',
  other_polydrug: 'Other / Polydrug',
};

export interface Profile {
  id: string;
  role: UserRole;
  fullName: string;
  assignedDoctorId: string | null;
  archived: boolean;
  sobrietyStartDate: string | null; // ISO date
}

export interface PatientSubstance {
  patientId: string;
  drugClass: DrugClass;
  isPrimary: boolean;
  recoveryStartDate: string; // ISO date
}

export type RiskBand = 'low' | 'medium' | 'high';

export interface CheckIn {
  id: string;
  patientId: string;
  date: string; // ISO date, Mauritius time (UTC+4) — see riskEngine.ts note
  mood: number; // 1–10
  sleep: number; // 1–10
  craving: number; // 1–10
  isolated: boolean;
  steps: number;
  riskScore: number; // 0–100
  createdAt: string;
}

export interface RiskZone {
  id: string;
  patientId: string;
  doctorId: string;
  lat: number;
  lng: number;
  radiusM: number;
  zoneType: string;
  classification: 'safe' | 'risk';
  label: string;
}

export interface Alert {
  id: string;
  patientId: string;
  doctorId: string;
  type: string;
  urgency: 'low' | 'medium' | 'high';
  xaiExplanation: string | null;
  read: boolean;
  createdAt: string;
}

export interface JournalEntry {
  id: string;
  patientId: string;
  date: string; // ISO date, Mauritius time — see CheckIn note
  moodLevel: MoodKey;
  text: string;
  createdAt: string;
}

export interface WeeklyReport {
  id: string;
  patientId: string;
  weekStart: string; // ISO date
  weekEnd: string; // ISO date
  avgRisk: RiskBand;
  compliancePercent: number;
}

export interface ChatMessage {
  id: string;
  patientId: string;
  sender: 'patient' | 'assistant';
  text: string;
  createdAt: string;
  read?: boolean;
}

export interface DoctorNote {
  id: string;
  patientId: string;
  doctorId: string;
  content: string;
  updatedAt: string; // ISO timestamp
}
