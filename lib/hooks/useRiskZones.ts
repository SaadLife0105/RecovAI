import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { RiskZone } from '../types';
import { supabase } from '../supabase';
import { useSession } from './useSession';

/** Same shape as useCheckIns — patientId defaults to the current session user. */
export function useRiskZones(patientId?: string): { data: RiskZone[]; isLoading: boolean; error: null; refetch: () => void } {
  const { session } = useSession();
  const resolvedPatientId = patientId ?? session?.user.id;

  const [data, setData] = useState<RiskZone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Refetch on focus too (see usePatients.ts) — zones added/deleted from
  // add-zone.tsx must show up when navigating back without a remount.
  const fetchZones = useCallback(async () => {
    if (!resolvedPatientId) {
      setData([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const { data: rows } = await supabase
      .from('risk_zones')
      .select('*')
      .eq('patient_id', resolvedPatientId);
    if (!isMountedRef.current) return;

    setData(
      (rows ?? []).map((row) => ({
        id: row.id,
        patientId: row.patient_id,
        doctorId: row.doctor_id,
        lat: row.lat,
        lng: row.lng,
        radiusM: row.radius_m,
        zoneType: row.zone_type,
        classification: row.classification,
        label: row.label,
      }))
    );
    setIsLoading(false);
  }, [resolvedPatientId]);

  useEffect(() => {
    fetchZones();
  }, [fetchZones]);

  useFocusEffect(
    useCallback(() => {
      fetchZones();
    }, [fetchZones])
  );

  return { data, isLoading, error: null, refetch: fetchZones };
}

/**
 * Insert a risk zone for a patient. Resolves the doctor's id from the session
 * (same pattern as saveDoctorNote); RLS's with-check enforces doctor_id = auth.uid().
 */
export async function createRiskZone(input: {
  patientId: string;
  lat: number;
  lng: number;
  radiusM: number;
  zoneType: string | null;
  classification: 'safe' | 'low_risk' | 'medium_risk' | 'high_risk';
  label: string;
}): Promise<{ error: string | null }> {
  const { data: { session } } = await supabase.auth.getSession();
  const doctorId = session?.user.id;
  if (!doctorId) return { error: 'Not signed in.' };

  const { error } = await supabase.from('risk_zones').insert({
    patient_id: input.patientId,
    doctor_id: doctorId,
    lat: input.lat,
    lng: input.lng,
    radius_m: input.radiusM,
    zone_type: input.zoneType,
    classification: input.classification,
    label: input.label,
  });

  return { error: error ? error.message : null };
}

/**
 * Update an existing zone. Same field set as createRiskZone minus patientId
 * and doctor_id — neither is reassignable by an edit, and RLS's `using` clause
 * already restricts the row to the zone's own doctor_id = auth.uid().
 */
export async function updateRiskZone(
  zoneId: string,
  input: {
    lat: number;
    lng: number;
    radiusM: number;
    zoneType: string | null;
    classification: 'safe' | 'low_risk' | 'medium_risk' | 'high_risk';
    label: string;
  }
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('risk_zones')
    .update({
      lat: input.lat,
      lng: input.lng,
      radius_m: input.radiusM,
      zone_type: input.zoneType,
      classification: input.classification,
      label: input.label,
    })
    .eq('id', zoneId);

  return { error: error ? error.message : null };
}

/** Fetch one zone by id — used by add-zone.tsx to pre-fill its edit mode. */
export async function fetchRiskZone(zoneId: string): Promise<{ data: RiskZone | null; error: string | null }> {
  const { data: row, error } = await supabase.from('risk_zones').select('*').eq('id', zoneId).maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!row) return { data: null, error: 'That zone no longer exists.' };

  return {
    data: {
      id: row.id,
      patientId: row.patient_id,
      doctorId: row.doctor_id,
      lat: row.lat,
      lng: row.lng,
      radiusM: row.radius_m,
      zoneType: row.zone_type,
      classification: row.classification,
      label: row.label,
    },
    error: null,
  };
}

/** Delete a zone by id. RLS restricts this to the zone's own doctor_id = auth.uid(). */
export async function deleteRiskZone(zoneId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('risk_zones').delete().eq('id', zoneId);
  return { error: error ? error.message : null };
}
