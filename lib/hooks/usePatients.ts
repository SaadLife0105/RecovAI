import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { PatientRowData } from '../../components/cards/PatientListRow';
import { colors, riskBand } from '../../constants/theme';
import { supabase } from '../supabase';
import { getMauritiusDateString, daysBetween } from '../mauritiusTime';
import { computeForecast, forecastsHighRisk } from '../forecast';
import { useSession } from './useSession';

interface PatientsData {
  patients: PatientRowData[];
  archivedPatients: PatientRowData[];
  totalPatients: number;
  highRisk: number;
  predictedHighRisk: number;
}

const EMPTY_DATA: PatientsData = {
  patients: [],
  archivedPatients: [],
  totalPatients: 0,
  highRisk: 0,
  predictedHighRisk: 0,
};

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
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // A plain useEffect only runs once on mount (per resolvedDoctorId) — it
  // never re-fires just because the doctor navigated to Patient Detail,
  // archived/restored someone, and came back. expo-router keeps the
  // dashboard mounted underneath the stack rather than remounting it, so
  // without an explicit refetch-on-focus the list silently goes stale after
  // any mutation made from another screen. useFocusEffect below covers that.
  const fetchPatients = useCallback(async () => {
    if (!resolvedDoctorId) {
      setData(EMPTY_DATA);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    {
      const { data: profileRows } = await supabase
        .from('profiles')
        .select('*')
        .eq('assigned_doctor_id', resolvedDoctorId)
        .eq('role', 'patient');
      if (!isMountedRef.current) return;

      const profiles = profileRows ?? [];
      const patientIds = profiles.map((p) => p.id);

      const { data: checkinRows } = patientIds.length
        ? await supabase.from('checkins').select('*').in('patient_id', patientIds).order('date', { ascending: true })
        : { data: [] as { patient_id: string; date: string; risk_score: number }[] };
      if (!isMountedRef.current) return;

      const today = getMauritiusDateString();

      // Chronological (date asc) checkins per patient — the query is already
      // ordered, so appending preserves order.
      const checkinsByPatient = new Map<string, { date: string; risk_score: number }[]>();
      for (const row of checkinRows ?? []) {
        const list = checkinsByPatient.get(row.patient_id) ?? [];
        list.push({ date: row.date, risk_score: row.risk_score });
        checkinsByPatient.set(row.patient_id, list);
      }

      // Build one row, plus the derived numbers the aggregates/sorting need.
      const buildRow = (p: (typeof profiles)[number]) => {
        const history = checkinsByPatient.get(p.id) ?? [];
        const latest = history.length ? history[history.length - 1] : undefined;
        const avatarColor = stableColorFor(p.id);

        const window = history.slice(-7);
        const trendData = window.length >= 2 ? window.map((c) => c.risk_score) : undefined;
        const trendDelta = trendData ? trendData[trendData.length - 1] - trendData[0] : undefined;

        // Forecast needs exactly 7+ check-ins; feed the most recent 7.
        const forecast = history.length >= 7 ? computeForecast(history.slice(-7).map((c) => c.risk_score)) : null;

        const scoredToday = latest?.date === today;
        const currentBand = latest ? riskBand(latest.risk_score) : null;
        const isHighNow = scoredToday && currentBand === 'high';
        // Only patients not already counted in highRisk (i.e. not High today)
        // count toward predicted — otherwise they'd double-count.
        const predictsHigh = !isHighNow && forecastsHighRisk(forecast);

        let row: PatientRowData;
        if (!latest) {
          row = {
            id: p.id,
            name: p.full_name,
            patientId: p.username ?? p.id,
            score: null,
            notLoggedIn: true,
            statusLabel: 'Pending',
            avatarColor,
            archived: p.archived,
            trendData,
            trendDelta,
          };
        } else if (!scoredToday) {
          const daysAgo = daysBetween(latest.date, today);
          row = {
            id: p.id,
            name: p.full_name,
            patientId: p.username ?? p.id,
            score: null,
            lastCheckInDaysAgo: daysAgo,
            statusLabel: daysAgo >= 7 ? 'Inactive (7+ days)' : `Last check-in ${daysAgo}d ago`,
            avatarColor,
            archived: p.archived,
            trendData,
            trendDelta,
          };
        } else {
          row = {
            id: p.id,
            name: p.full_name,
            patientId: p.username ?? p.id,
            score: latest.risk_score,
            statusLabel:
              currentBand === 'high' ? 'High Risk' : currentBand === 'medium' ? 'Medium Risk' : 'Low Risk',
            avatarColor,
            archived: p.archived,
            trendData,
            trendDelta,
          };
        }

        return { row, isHighNow, predictsHigh };
      };

      const active = profiles.filter((p) => !p.archived).map(buildRow);
      const archived = profiles.filter((p) => p.archived).map(buildRow);

      // Sort active rows: (1) checked in today, by score desc; (2) past
      // check-in but not today, by lastCheckInDaysAgo asc; (3) never checked
      // in, by name alpha.
      const rank = (r: PatientRowData) => (r.score !== null ? 0 : r.lastCheckInDaysAgo !== undefined ? 1 : 2);
      const activeRows = active.map((a) => a.row).sort((a, b) => {
        const ra = rank(a);
        const rb = rank(b);
        if (ra !== rb) return ra - rb;
        if (ra === 0) return b.score! - a.score!;
        if (ra === 1) return a.lastCheckInDaysAgo! - b.lastCheckInDaysAgo!;
        return a.name.localeCompare(b.name);
      });

      const archivedRows = archived.map((a) => a.row).sort((a, b) => a.name.localeCompare(b.name));

      if (!isMountedRef.current) return;
      setData({
        patients: activeRows,
        archivedPatients: archivedRows,
        totalPatients: activeRows.length,
        highRisk: active.filter((a) => a.isHighNow).length,
        predictedHighRisk: active.filter((a) => a.predictsHigh).length,
      });
      setIsLoading(false);
    }
  }, [resolvedDoctorId]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // Refetch whenever the dashboard (or wherever else this hook is used)
  // regains focus — covers archiving/restoring/adding a patient from another
  // screen and navigating back, which the mount-only effect above misses.
  useFocusEffect(
    useCallback(() => {
      fetchPatients();
    }, [fetchPatients])
  );

  return { data, isLoading, error: null };
}
