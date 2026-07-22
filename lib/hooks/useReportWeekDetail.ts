import { useCallback, useState } from 'react';
import { supabase } from '../supabase';
import { WeeklyReport } from '../types';
import { getMauritiusStartOfDayIso, addDaysToDateString } from '../mauritiusTime';

export interface WeekAlert {
  id: string;
  type: string;
  urgency: string;
  createdAt: string;
}

export interface WeekZoneBreach {
  id: string;
  detectedAt: string;
  label: string;
  classification: string;
}

export interface ReportWeekDetail {
  alerts: WeekAlert[];
  zoneBreaches: WeekZoneBreach[];
  isLoading: boolean;
  error: string | null;
  aiSummary: string | null;
  isSummaryLoading: boolean;
  summaryError: string | null;
}

/**
 * The expanded contents of ONE weekly report card: that week's itemised
 * alerts and zone breaches (direct queries — no Edge Function, no LLM), plus
 * the AI week summary (generate-weekly-report-summary, which caches its own
 * result on the row so a second call is free).
 *
 * Lazy on purpose. loadDetail is called the first time a card expands, never
 * on mount for a whole history — a patient with a year of reports would
 * otherwise fire a year of queries and a year of Haiku calls to render a
 * screen the doctor may only scan.
 *
 * Results are cached per reportId, so collapsing and re-expanding the same
 * week is free. One hook rather than three because the accordion needs all
 * three states to move together under one reportId key.
 */
export function useReportWeekDetail(): {
  getDetail: (reportId: string) => ReportWeekDetail | undefined;
  loadDetail: (report: WeeklyReport) => void;
} {
  const [cache, setCache] = useState<Map<string, ReportWeekDetail>>(new Map());

  const update = useCallback((reportId: string, patch: Partial<ReportWeekDetail>) => {
    setCache((prev) => {
      const next = new Map(prev);
      const current = next.get(reportId);
      if (!current) return prev;
      next.set(reportId, { ...current, ...patch });
      return next;
    });
  }, []);

  const loadDetail = useCallback(
    (report: WeeklyReport) => {
      // Already requested — don't refetch or re-invoke on re-expansion.
      if (cache.has(report.id)) return;

      setCache((prev) => {
        if (prev.has(report.id)) return prev;
        const next = new Map(prev);
        next.set(report.id, {
          alerts: [],
          zoneBreaches: [],
          isLoading: true,
          error: null,
          aiSummary: null,
          isSummaryLoading: true,
          summaryError: null,
        });
        return next;
      });

      // Half-open [weekStart 00:00, weekEnd+1 00:00) in real UTC instants, for
      // the timestamptz columns — the same bounds the Edge Function uses.
      // UTC-midnight of a date string is still that same Mauritius day (+4h),
      // so the existing helper resolves the right instant.
      const rangeStartIso = getMauritiusStartOfDayIso(new Date(`${report.weekStart}T00:00:00Z`));
      const rangeEndIso = getMauritiusStartOfDayIso(
        new Date(`${addDaysToDateString(report.weekEnd, 1)}T00:00:00Z`)
      );

      // Itemised lists — plain RLS-scoped queries, no LLM anywhere near them.
      (async () => {
        const [alertsRes, breachesRes] = await Promise.all([
          supabase
            .from('alerts')
            .select('id, type, urgency, created_at')
            .eq('patient_id', report.patientId)
            .gte('created_at', rangeStartIso)
            .lt('created_at', rangeEndIso)
            .order('created_at', { ascending: false }),
          supabase
            .from('zone_breaches')
            .select('id, detected_at, risk_zones (label, classification)')
            .eq('patient_id', report.patientId)
            .gte('detected_at', rangeStartIso)
            .lt('detected_at', rangeEndIso)
            .order('detected_at', { ascending: false }),
        ]);

        if (alertsRes.error || breachesRes.error) {
          update(report.id, {
            isLoading: false,
            error: "Couldn't load this week's details",
          });
          return;
        }

        update(report.id, {
          isLoading: false,
          alerts: (alertsRes.data ?? []).map((row) => ({
            id: row.id,
            type: row.type,
            urgency: row.urgency,
            createdAt: row.created_at,
          })),
          zoneBreaches: (breachesRes.data ?? []).map((row) => {
            // PostgREST types the embedded row as an array; at runtime a
            // to-one join comes back as a single object.
            const zone = row.risk_zones as unknown as { label: string; classification: string } | null;
            return {
              id: row.id,
              detectedAt: row.detected_at,
              label: zone?.label ?? 'Unnamed zone',
              classification: zone?.classification ?? 'risk',
            };
          }),
        });
      })();

      // AI summary — separate track, so a slow Haiku call never holds up the
      // itemised lists above.
      (async () => {
        const { data, error } = await supabase.functions.invoke('generate-weekly-report-summary', {
          body: { reportId: report.id },
        });
        if (error || !data?.summary) {
          update(report.id, {
            isSummaryLoading: false,
            summaryError: "Couldn't generate a summary for this week",
          });
          return;
        }
        update(report.id, { isSummaryLoading: false, aiSummary: data.summary as string });
      })();
    },
    [cache, update]
  );

  const getDetail = useCallback((reportId: string) => cache.get(reportId), [cache]);

  return { getDetail, loadDetail };
}
