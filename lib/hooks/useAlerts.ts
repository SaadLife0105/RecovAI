import { useEffect, useRef, useState } from 'react';
import { Alert } from '../types';
import { supabase } from '../supabase';
import { useSession } from './useSession';

function rowToAlert(row: {
  id: string;
  patient_id: string;
  doctor_id: string;
  type: string;
  urgency: string;
  xai_explanation: string | null;
  read: boolean;
  created_at: string;
}): Alert {
  return {
    id: row.id,
    patientId: row.patient_id,
    doctorId: row.doctor_id,
    type: row.type,
    urgency: row.urgency as Alert['urgency'],
    xaiExplanation: row.xai_explanation,
    read: row.read,
    createdAt: row.created_at,
  };
}

/**
 * Doctor's alert inbox, backed by the `alerts` table — LIVE. A mount-only
 * fetch meant an already-open Alerts screen never showed an alert created by
 * a background process (generate-xai, risk-agent, the missed-check-in cron)
 * until the screen was navigated away from and back — confirmed directly
 * 2026-07-22. Fixed with a genuine Realtime subscription (migration 0015
 * adds `alerts` to the realtime publication) rather than polling: new/updated
 * rows for this doctor arrive the moment they're written, RLS-scoped the
 * same as any other read.
 */
export function useAlerts(doctorId?: string): { data: Alert[]; isLoading: boolean; error: null } {
  const { session } = useSession();
  const resolvedDoctorId = doctorId ?? session?.user.id;

  const [data, setData] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Realtime callbacks close over whatever `data` was at subscribe time, not
  // whatever it is by the time an event fires — a ref sidesteps that so
  // insert/update handlers always merge into the CURRENT list.
  const dataRef = useRef<Alert[]>([]);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    if (!resolvedDoctorId) {
      setData([]);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    supabase
      .from('alerts')
      .select('*')
      .eq('doctor_id', resolvedDoctorId)
      .order('created_at', { ascending: false })
      .then(({ data: rows }) => {
        if (!isMounted) return;
        const alerts = (rows ?? []).map(rowToAlert);
        dataRef.current = alerts;
        setData(alerts);
        setIsLoading(false);
      });

    // Live updates for this doctor's own alerts only — filtered server-side,
    // same boundary "alerts: doctor full access to own" already enforces on
    // an ordinary select.
    const channel = supabase
      .channel(`alerts:doctor:${resolvedDoctorId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alerts', filter: `doctor_id=eq.${resolvedDoctorId}` },
        (payload) => {
          if (!isMounted) return;
          const incoming = rowToAlert(payload.new as Parameters<typeof rowToAlert>[0]);
          // Guard against a duplicate delivery (Realtime's own reconnect
          // behaviour can redeliver) rather than trusting each event fires
          // exactly once.
          if (dataRef.current.some((a) => a.id === incoming.id)) return;
          const next = [incoming, ...dataRef.current].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          dataRef.current = next;
          setData(next);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'alerts', filter: `doctor_id=eq.${resolvedDoctorId}` },
        (payload) => {
          if (!isMounted) return;
          const updated = rowToAlert(payload.new as Parameters<typeof rowToAlert>[0]);
          const next = dataRef.current.map((a) => (a.id === updated.id ? updated : a));
          dataRef.current = next;
          setData(next);
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [resolvedDoctorId]);

  return { data, isLoading, error: null };
}
