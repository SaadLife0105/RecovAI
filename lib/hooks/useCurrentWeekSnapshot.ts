import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { getMauritiusDateString, getMauritiusStartOfDayIso, getMauritiusWeekStart } from '../mauritiusTime';

export interface CurrentWeekSnapshot {
  weekStart: string;
  /** Has this patient EVER checked in, on any date — not just this week. */
  hasAnyHistory: boolean;
  /** null (never 0) when there are no check-ins yet this week — a 0 would read as a real, genuinely-zero risk score. */
  avgRiskScoreThisWeek: number | null;
  checkedInDatesThisWeek: Set<string>;
  alertCountThisWeek: number;
  zoneBreachCountThisWeek: number;
}

/**
 * Live snapshot of the week currently in progress, computed on the fly for
 * the whole caseload at once — deliberately NOT read from weekly_reports,
 * which only ever holds finished weeks (generate-weekly-reports runs Monday
 * for the week just ended).
 *
 * Takes patientIds rather than fetching the caseload itself; the Reports
 * screen already has it from usePatients().
 */
export function useCurrentWeekSnapshot(patientIds: string[]): {
  data: Map<string, CurrentWeekSnapshot>;
  isLoading: boolean;
} {
  const [data, setData] = useState<Map<string, CurrentWeekSnapshot>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  // patientIds is a fresh array on every render — key the effect on its
  // contents, not its identity, or this refetches forever.
  const patientIdsKey = patientIds.join(',');

  useEffect(() => {
    const ids = patientIdsKey ? patientIdsKey.split(',') : [];
    if (ids.length === 0) {
      setData(new Map());
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const weekStart = getMauritiusWeekStart();
    const today = getMauritiusDateString();
    // Real UTC instant of Mauritius midnight on weekStart, for the
    // timestamptz columns. UTC-midnight of weekStart is still the same
    // Mauritius day (+4h), so the existing helper resolves it correctly.
    const weekStartIso = getMauritiusStartOfDayIso(new Date(`${weekStart}T00:00:00Z`));

    (async () => {
      const [weekCheckins, weekAlerts, weekBreaches, everCheckins] = await Promise.all([
        supabase
          .from('checkins')
          .select('patient_id, date, risk_score')
          .in('patient_id', ids)
          .gte('date', weekStart)
          .lte('date', today),
        // No upper bound — "so far this week" means up to whenever this runs.
        supabase.from('alerts').select('patient_id').in('patient_id', ids).gte('created_at', weekStartIso),
        supabase.from('zone_breaches').select('patient_id').in('patient_id', ids).gte('detected_at', weekStartIso),
        // Unfiltered on purpose: prototype-scale data, and skipping patients
        // already known to have check-ins this week isn't worth the branching.
        supabase.from('checkins').select('patient_id').in('patient_id', ids),
      ]);

      if (!isMounted) return;

      const alertCounts = new Map<string, number>();
      for (const row of weekAlerts.data ?? []) {
        alertCounts.set(row.patient_id, (alertCounts.get(row.patient_id) ?? 0) + 1);
      }
      const breachCounts = new Map<string, number>();
      for (const row of weekBreaches.data ?? []) {
        breachCounts.set(row.patient_id, (breachCounts.get(row.patient_id) ?? 0) + 1);
      }
      const everCheckedIn = new Set((everCheckins.data ?? []).map((row) => row.patient_id));

      const dates = new Map<string, Set<string>>();
      const scores = new Map<string, number[]>();
      for (const row of weekCheckins.data ?? []) {
        const set = dates.get(row.patient_id) ?? new Set<string>();
        set.add(row.date);
        dates.set(row.patient_id, set);
        scores.set(row.patient_id, [...(scores.get(row.patient_id) ?? []), row.risk_score]);
      }

      const next = new Map<string, CurrentWeekSnapshot>();
      for (const patientId of ids) {
        const patientScores = scores.get(patientId) ?? [];
        next.set(patientId, {
          weekStart,
          hasAnyHistory: everCheckedIn.has(patientId),
          avgRiskScoreThisWeek:
            patientScores.length > 0
              ? Math.round((patientScores.reduce((sum, s) => sum + s, 0) / patientScores.length) * 10) / 10
              : null,
          checkedInDatesThisWeek: dates.get(patientId) ?? new Set<string>(),
          alertCountThisWeek: alertCounts.get(patientId) ?? 0,
          zoneBreachCountThisWeek: breachCounts.get(patientId) ?? 0,
        });
      }

      setData(next);
      setIsLoading(false);
    })();

    return () => {
      isMounted = false;
    };
  }, [patientIdsKey]);

  return { data, isLoading };
}
