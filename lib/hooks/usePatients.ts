import { useEffect, useState } from 'react';
import { PatientRowData } from '../../components/cards/PatientListRow';
import { colors, riskBand } from '../../constants/theme';
import { supabase } from '../supabase';
import { getMauritiusDateString, daysBetween } from '../mauritiusTime';
import { useSession } from './useSession';

interface PatientsData {
  patients: PatientRowData[];
  totalPatients: number;
  highRisk: number;
  predictedHighRisk: number;
}

const EMPTY_DATA: PatientsData = { patients: [], totalPatients: 0, highRisk: 0, predictedHighRisk: 0 };

// No per-patient color field exists in the schema — cycle a small fixed
// palette, keyed by a stable hash of the patient's own id (not row order,
// which can shift between queries/sorts and would make a patient's color
// change for no reason).
const AVATAR_COLORS = [colors.primary, colors.secondary, colors.textDark, colors.textMuted];

function stableColorFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/** Doctor's caseload for the Mission Control dashboard. */
export function usePatients(doctorId?: string): { data: PatientsData; isLoading: boolean; error: null } {
  const { session } = useSession();
  const resolvedDoctorId = doctorId ?? session?.user.id;

  const [data, setData] = useState<PatientsData>(EMPTY_DATA);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!resolvedDoctorId) {
      setData(EMPTY_DATA);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    (async () => {
      const { data: profileRows } = await supabase
        .from('profiles')
        .select('*')
        .eq('assigned_doctor_id', resolvedDoctorId)
        .eq('role', 'patient');
      if (!isMounted) return;

      const patients = profileRows ?? [];
      const patientIds = patients.map((p) => p.id);

      const { data: checkinRows } = patientIds.length
        ? await supabase.from('checkins').select('*').in('patient_id', patientIds)
        : { data: [] as { patient_id: string; date: string; risk_score: number }[] };
      if (!isMounted) return;

      const today = getMauritiusDateString();

      // Latest checkin per patient, by date.
      const latestByPatient = new Map<string, { date: string; risk_score: number }>();
      for (const row of checkinRows ?? []) {
        const current = latestByPatient.get(row.patient_id);
        if (!current || row.date > current.date) {
          latestByPatient.set(row.patient_id, { date: row.date, risk_score: row.risk_score });
        }
      }

      const rows: PatientRowData[] = patients.map((p) => {
        const latest = latestByPatient.get(p.id);
        const avatarColor = stableColorFor(p.id);

        if (!latest) {
          return {
            id: p.id,
            name: p.full_name,
            patientId: p.username ?? p.id,
            score: null,
            notLoggedIn: true,
            statusLabel: 'Pending',
            avatarColor,
          };
        }

        if (latest.date !== today) {
          const daysAgo = daysBetween(latest.date, today);
          return {
            id: p.id,
            name: p.full_name,
            patientId: p.username ?? p.id,
            score: null,
            lastCheckInDaysAgo: daysAgo,
            statusLabel: daysAgo >= 7 ? 'Inactive (7+ days)' : `Last check-in ${daysAgo}d ago`,
            avatarColor,
          };
        }

        const band = riskBand(latest.risk_score);
        return {
          id: p.id,
          name: p.full_name,
          patientId: p.username ?? p.id,
          score: latest.risk_score,
          statusLabel: band === 'high' ? 'High Risk' : band === 'medium' ? 'Medium Risk' : 'Low Risk',
          avatarColor,
        };
      });

      const highRisk = patients.filter((p) => {
        const latest = latestByPatient.get(p.id);
        return latest && riskBand(latest.risk_score) === 'high';
      }).length;

      setData({
        patients: rows,
        totalPatients: patients.length,
        highRisk,
        // The forecaster doesn't exist yet (Phase 3) — no real source for this.
        predictedHighRisk: 0,
      });
      setIsLoading(false);
    })();

    return () => {
      isMounted = false;
    };
  }, [resolvedDoctorId]);

  return { data, isLoading, error: null };
}
