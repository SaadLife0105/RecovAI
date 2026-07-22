import { useEffect, useState } from 'react';
import { WeeklyReport } from '../types';
import { supabase } from '../supabase';

/**
 * One patient's completed weekly reports, most recent week first — the
 * Patient Detail "Reports" tab. This is the single-patient descendant of the
 * old caseload-wide useReports.ts (removed: the Reports screen now shows a
 * live current-week snapshot instead, so nothing needed the whole-caseload
 * version any more).
 *
 * Filtered on patient_id and enforced again by the "weekly_reports: doctor
 * reads own patients" RLS policy — same explicit-filter-plus-RLS belt and
 * braces the rest of the doctor hooks use.
 *
 * Also returns the per-day check-in dates across the whole reported range in
 * ONE batched query, so each card can draw its 7-day grid without a request
 * per card.
 */
export function usePatientReportHistory(patientId: string | undefined): {
  data: WeeklyReport[];
  checkinDates: Set<string>;
  isLoading: boolean;
} {
  const [data, setData] = useState<WeeklyReport[]>([]);
  const [checkinDates, setCheckinDates] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!patientId) {
      setData([]);
      setCheckinDates(new Set());
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    (async () => {
      const { data: rows } = await supabase
        .from('weekly_reports')
        .select('*')
        .eq('patient_id', patientId)
        .order('week_start', { ascending: false });

      if (!isMounted) return;

      const reports: WeeklyReport[] = (rows ?? []).map((row) => ({
        id: row.id,
        doctorId: row.doctor_id,
        patientId: row.patient_id,
        weekStart: row.week_start,
        weekEnd: row.week_end,
        // numeric(5,2) comes back as a string from PostgREST.
        avgRiskScore: Number(row.avg_risk_score),
        band: row.band,
        compliancePercent: row.compliance_percent,
        alertCount: row.alert_count,
        zoneBreachCount: row.zone_breach_count,
      }));
      setData(reports);

      const dates = new Set<string>();
      if (reports.length > 0) {
        const rangeStart = reports.reduce((min, r) => (r.weekStart < min ? r.weekStart : min), reports[0].weekStart);
        const rangeEnd = reports.reduce((max, r) => (r.weekEnd > max ? r.weekEnd : max), reports[0].weekEnd);

        const { data: checkinRows } = await supabase
          .from('checkins')
          .select('date')
          .eq('patient_id', patientId)
          .gte('date', rangeStart)
          .lte('date', rangeEnd);

        if (!isMounted) return;
        for (const row of checkinRows ?? []) dates.add(row.date);
      }
      setCheckinDates(dates);
      setIsLoading(false);
    })();

    return () => {
      isMounted = false;
    };
  }, [patientId]);

  return { data, checkinDates, isLoading };
}
