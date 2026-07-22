/**
 * Centralized mock data, grounded in lib/types.ts shapes.
 *
 * Every value here mirrors what's already hardcoded inline across the
 * built screens (see docs/Known-Issues.md #4) — nothing invented, just
 * consolidated so lib/hooks/* has one typed source to read from instead
 * of each screen keeping its own copy.
 *
 * MOCK_TODAY anchors "today" for derived fields like hasCheckedInToday.
 * All mock dates are frozen at May 2025 (matching every screen's
 * hardcoded dates), so derivations use this constant instead of the
 * real system clock — real Date.now() would silently break the mock
 * once the calendar moves past May 2025.
 */

import type { Alert, ChatMessage, CheckIn, DoctorNote, JournalEntry, PatientSubstance, Profile, RiskZone } from './types';
import type { PatientRowData } from '../components/cards/PatientListRow';
import { colors } from '../constants/theme';

export const MOCK_TODAY = '2025-05-24';

export const PATIENT_ID = 'patient-1';
export const DOCTOR_ID = 'doctor-1';

export const PATIENT_PROFILE: Profile = {
  id: PATIENT_ID,
  role: 'patient',
  fullName: 'Alex Brown',
  assignedDoctorId: DOCTOR_ID,
  archived: false,
  sobrietyStartDate: '2025-05-10',
};

// Doctor-only display fields (specialty, joinedDate) aren't part of the
// `profiles` DB schema documented in CLAUDE.md, so they're kept here
// rather than added to the shared Profile interface.
export interface DoctorProfileMock extends Profile {
  specialty: string;
  joinedDate: string; // ISO date
}

export const DOCTOR_PROFILE: DoctorProfileMock = {
  id: DOCTOR_ID,
  role: 'doctor',
  fullName: 'Dr. Sarah Lee',
  assignedDoctorId: null,
  archived: false,
  sobrietyStartDate: null,
  specialty: 'Addiction Specialist',
  joinedDate: '2024-01-15',
};

export const PATIENT_SUBSTANCE: PatientSubstance = {
  patientId: PATIENT_ID,
  drugClass: 'cannabis',
  isPrimary: true,
  recoveryStartDate: PATIENT_PROFILE.sobrietyStartDate!,
};

// 12 days of check-ins ending today — length backs the "Check-ins: 12"
// stat on profile.tsx; today's entry matches home.tsx's known values.
export const CHECK_INS: CheckIn[] = [
  { id: 'checkin-1', patientId: PATIENT_ID, date: '2025-05-13', mood: 5, sleep: 6, craving: 5, isolated: false, steps: 5210, riskScore: 38, createdAt: '2025-05-13T08:15:00+04:00' },
  { id: 'checkin-2', patientId: PATIENT_ID, date: '2025-05-14', mood: 6, sleep: 6, craving: 4, isolated: false, steps: 5890, riskScore: 33, createdAt: '2025-05-14T08:20:00+04:00' },
  { id: 'checkin-3', patientId: PATIENT_ID, date: '2025-05-15', mood: 4, sleep: 5, craving: 6, isolated: true, steps: 3100, riskScore: 52, createdAt: '2025-05-15T08:05:00+04:00' },
  { id: 'checkin-4', patientId: PATIENT_ID, date: '2025-05-16', mood: 5, sleep: 5, craving: 6, isolated: false, steps: 4400, riskScore: 45, createdAt: '2025-05-16T08:30:00+04:00' },
  { id: 'checkin-5', patientId: PATIENT_ID, date: '2025-05-17', mood: 6, sleep: 6, craving: 5, isolated: false, steps: 5600, riskScore: 39, createdAt: '2025-05-17T08:10:00+04:00' },
  { id: 'checkin-6', patientId: PATIENT_ID, date: '2025-05-18', mood: 7, sleep: 7, craving: 4, isolated: false, steps: 6800, riskScore: 30, createdAt: '2025-05-18T08:25:00+04:00' },
  { id: 'checkin-7', patientId: PATIENT_ID, date: '2025-05-19', mood: 6, sleep: 6, craving: 5, isolated: false, steps: 6100, riskScore: 37, createdAt: '2025-05-19T08:12:00+04:00' },
  { id: 'checkin-8', patientId: PATIENT_ID, date: '2025-05-20', mood: 5, sleep: 5, craving: 6, isolated: false, steps: 4900, riskScore: 44, createdAt: '2025-05-20T08:18:00+04:00' },
  { id: 'checkin-9', patientId: PATIENT_ID, date: '2025-05-21', mood: 4, sleep: 4, craving: 7, isolated: false, steps: 4200, riskScore: 51, createdAt: '2025-05-21T08:05:00+04:00' },
  { id: 'checkin-10', patientId: PATIENT_ID, date: '2025-05-22', mood: 5, sleep: 5, craving: 6, isolated: false, steps: 5300, riskScore: 43, createdAt: '2025-05-22T08:20:00+04:00' },
  { id: 'checkin-11', patientId: PATIENT_ID, date: '2025-05-23', mood: 6, sleep: 5, craving: 6, isolated: false, steps: 5900, riskScore: 40, createdAt: '2025-05-23T09:10:00+04:00' },
  { id: 'checkin-12', patientId: PATIENT_ID, date: MOCK_TODAY, mood: 6, sleep: 5, craving: 7, isolated: false, steps: 6342, riskScore: 42, createdAt: '2025-05-24T08:30:00+04:00' },
];

export const CURRENT_STREAK = 14;
export const LONGEST_STREAK = 14;

// Zone coordinates aren't shown anywhere in the built UI (zones.tsx only
// lists name/radius/type) — the one coordinate shown anywhere is the
// generic placeholder on add-zone.tsx, reused here for all zones since
// no per-zone coordinates exist to extract.
const MOCK_LAT = -20.1531;
const MOCK_LNG = 57.5016;

export const RISK_ZONES: RiskZone[] = [
  { id: 'zone-1', patientId: PATIENT_ID, doctorId: DOCTOR_ID, lat: MOCK_LAT, lng: MOCK_LNG, radiusM: 200, zoneType: 'home', classification: 'safe', label: 'Home' },
  { id: 'zone-2', patientId: PATIENT_ID, doctorId: DOCTOR_ID, lat: MOCK_LAT, lng: MOCK_LNG, radiusM: 300, zoneType: 'bar_nightclub', classification: 'high_risk', label: 'Downtown Bar' },
  { id: 'zone-3', patientId: PATIENT_ID, doctorId: DOCTOR_ID, lat: MOCK_LAT, lng: MOCK_LNG, radiusM: 250, zoneType: 'drug_market', classification: 'high_risk', label: 'Old Market' },
  { id: 'zone-4', patientId: PATIENT_ID, doctorId: DOCTOR_ID, lat: MOCK_LAT, lng: MOCK_LNG, radiusM: 400, zoneType: 'friends_house', classification: 'high_risk', label: "John's House" },
  { id: 'zone-5', patientId: PATIENT_ID, doctorId: DOCTOR_ID, lat: MOCK_LAT, lng: MOCK_LNG, radiusM: 500, zoneType: 'workplace', classification: 'safe', label: 'Office' },
  { id: 'zone-6', patientId: PATIENT_ID, doctorId: DOCTOR_ID, lat: MOCK_LAT, lng: MOCK_LNG, radiusM: 150, zoneType: 'other', classification: 'high_risk', label: 'City Park' },
];

export const ALERTS: Alert[] = [
  { id: 'alert-1', patientId: 'patient-2', doctorId: DOCTOR_ID, type: 'high_risk', urgency: 'high', xaiExplanation: null, read: false, createdAt: '2025-05-24T09:50:00+04:00' },
  { id: 'alert-2', patientId: 'patient-3', doctorId: DOCTOR_ID, type: 'missed_checkin', urgency: 'medium', xaiExplanation: null, read: false, createdAt: '2025-05-24T08:00:00+04:00' },
  { id: 'alert-3', patientId: 'patient-4', doctorId: DOCTOR_ID, type: 'zone_breach', urgency: 'medium', xaiExplanation: null, read: true, createdAt: '2025-05-23T23:32:00+04:00' },
  { id: 'alert-4', patientId: PATIENT_ID, doctorId: DOCTOR_ID, type: 'predicted_high_risk', urgency: 'medium', xaiExplanation: null, read: true, createdAt: '2025-05-23T21:15:00+04:00' },
];

// Resolves alert.patientId → display name for patients that have no
// other mock record (ALERTS references patient-2/3/4, which otherwise
// exist nowhere but dashboard.tsx's PATIENTS list) — reuses those names.
export const PATIENT_NAMES: Record<string, string> = {
  'patient-1': 'Alex Brown',
  'patient-2': 'Jordan Smith',
  'patient-3': 'Morgan Davis',
  'patient-4': 'Taylor Johnson',
};

// REPORTS removed in Phase 6 — weekly reports are real rows now
// (weekly_reports table + useReports.ts), and its only consumer was the
// mock useReports.

export const JOURNAL_ENTRIES: JournalEntry[] = [
  { id: 'journal-1', patientId: PATIENT_ID, date: '2025-05-24', moodLevel: 'great', text: 'Today was a good day. I felt more motivated and stayed positive...', createdAt: '2025-05-24T20:45:00+04:00' },
  { id: 'journal-2', patientId: PATIENT_ID, date: '2025-05-23', moodLevel: 'okay', text: 'Had some anxiety in the morning but talking to the AI helped me...', createdAt: '2025-05-23T21:10:00+04:00' },
  { id: 'journal-3', patientId: PATIENT_ID, date: '2025-05-22', moodLevel: 'low', text: 'Struggled with cravings in the evening. I went for a walk instead...', createdAt: '2025-05-22T19:30:00+04:00' },
  { id: 'journal-4', patientId: PATIENT_ID, date: '2025-05-21', moodLevel: 'rough', text: "Tough day overall. Feeling down but I didn't give up...", createdAt: '2025-05-21T20:05:00+04:00' },
  { id: 'journal-5', patientId: PATIENT_ID, date: '2025-05-20', moodLevel: 'great', text: 'Grateful for the progress. Small steps every day!', createdAt: '2025-05-20T21:15:00+04:00' },
];

// Doctor caseload — matches mockup screen 31 exactly (avatar color is
// presentation, not domain, data).
export const PATIENTS: PatientRowData[] = [
  { id: PATIENT_ID, name: 'Alex Brown', patientId: 'P1024', score: 72, statusLabel: 'High Risk', avatarColor: colors.primary },
  { id: 'patient-3', name: 'Morgan Davis', patientId: 'P1037', score: 48, statusLabel: 'Medium Risk', avatarColor: colors.secondary },
  { id: 'patient-4', name: 'Taylor Johnson', patientId: 'P1041', score: 28, statusLabel: 'Low Risk', avatarColor: colors.textDark },
  { id: 'patient-2', name: 'Jordan Smith', patientId: 'P1052', score: null, lastCheckInDaysAgo: 8, statusLabel: 'Inactive (7+ days)', avatarColor: colors.textMuted },
  { id: 'patient-5', name: 'Casey Lee', patientId: 'P1060', score: null, notLoggedIn: true, statusLabel: 'Pending', avatarColor: colors.textMuted },
  { id: 'patient-6', name: 'Jamie Wilson', patientId: 'P1073', score: null, lastCheckInDaysAgo: 12, statusLabel: 'Inactive (7+ days)', avatarColor: colors.textMuted },
];

// Mutated in place by updateDoctorNote() (see lib/hooks/useDoctorNote.ts)
// — a plain in-memory edit until real Supabase persistence lands.
export const DOCTOR_NOTES: DoctorNote[] = [
  {
    id: 'note-1',
    patientId: PATIENT_ID,
    doctorId: DOCTOR_ID,
    content: 'Patient shows good progress overall. Struggling with evening cravings. Encourage sleep consistency.',
    updatedAt: '2025-05-24T10:15:00+04:00',
  },
];

// RAG chat conversation — mirrors mockup screen 39 exactly.
export const CHAT_MESSAGES: ChatMessage[] = [
  { id: 'chat-1', patientId: PATIENT_ID, sender: 'assistant', text: 'Hi Alex! How are you feeling today?', createdAt: `${MOCK_TODAY}T09:30:00+04:00` },
  { id: 'chat-2', patientId: PATIENT_ID, sender: 'patient', text: "I'm feeling a bit stressed today.", createdAt: `${MOCK_TODAY}T09:31:00+04:00`, read: true },
  { id: 'chat-3', patientId: PATIENT_ID, sender: 'assistant', text: "I'm here for you. Want to talk about what's on your mind?", createdAt: `${MOCK_TODAY}T09:31:00+04:00` },
  { id: 'chat-4', patientId: PATIENT_ID, sender: 'patient', text: 'I had some cravings earlier.', createdAt: `${MOCK_TODAY}T09:32:00+04:00`, read: true },
  { id: 'chat-5', patientId: PATIENT_ID, sender: 'assistant', text: "Thanks for sharing that with me. That's a tough moment. Remember, this feeling will pass. Would you like some tips to help?", createdAt: `${MOCK_TODAY}T09:33:00+04:00` },
  { id: 'chat-6', patientId: PATIENT_ID, sender: 'patient', text: 'Yes, please.', createdAt: `${MOCK_TODAY}T09:33:00+04:00`, read: true },
  { id: 'chat-7', patientId: PATIENT_ID, sender: 'assistant', text: "Okay, let's try a quick breathing exercise together.", createdAt: `${MOCK_TODAY}T09:34:00+04:00` },
];

// Not part of the documented `profiles` schema (see CLAUDE.md) — same
// category as edit-profile.tsx's MOCK_DOB/MOCK_PHONE/MOCK_EMAIL, kept
// here so profile.tsx and edit-profile.tsx share one source instead of
// each hardcoding their own copy.
export const PATIENT_PREFERENCES = { checkInReminderTime: '8:00 PM', notificationsEnabled: true };

export const DOCTOR_CASELOAD_STATS = {
  totalPatients: 128,
  highRisk: 18,
  predictedHighRisk: 24,
};
