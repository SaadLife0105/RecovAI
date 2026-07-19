import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { haversineDistanceMeters } from './geo';

// IMPORTANT: this module must be imported somewhere that always loads at app
// startup (see app/_layout.tsx's first import) so TaskManager.defineTask
// below runs on EVERY launch — including a fresh background-only launch by
// the OS with no React tree mounted. defineTask must be at module global
// scope, per Expo's TaskManager docs, not inside a component or hook.

export const BACKGROUND_ZONE_TASK = 'recovai-background-zone-monitor';

const INSIDE_ZONE_IDS_KEY = 'backgroundZoneMonitor:insideZoneIds';

TaskManager.defineTask(BACKGROUND_ZONE_TASK, async ({ data, error }) => {
  if (error) {
    console.warn('Background zone task error:', error.message);
    return;
  }
  const { locations } = data as { locations: Location.LocationObject[] };
  const latest = locations[locations.length - 1];
  if (!latest) return;

  // Headless JS context — no React state. Read the current patient from the
  // Supabase session directly.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const patientId = session?.user?.id;
  if (!patientId) return;

  const { data: zones } = await supabase.from('risk_zones').select('*').eq('patient_id', patientId);
  if (!zones) return;

  // Debounce state persisted to AsyncStorage — this task can't see the
  // foreground hook's in-memory Set (different execution context), so it
  // keeps its own persisted "currently inside" state.
  const stored = await AsyncStorage.getItem(INSIDE_ZONE_IDS_KEY);
  const insideSet = new Set<string>(stored ? JSON.parse(stored) : []);

  for (const zone of zones) {
    // Skip zones where the GPS reading's own uncertainty is looser than the
    // zone's radius (see useZoneMonitor.ts for the full reasoning) — avoids
    // recording a breach (or a missed one) based on a low-confidence fix.
    if (latest.coords.accuracy !== null && latest.coords.accuracy > zone.radius_m) continue;

    const inside =
      haversineDistanceMeters(latest.coords.latitude, latest.coords.longitude, zone.lat, zone.lng) <= zone.radius_m;
    const wasInside = insideSet.has(zone.id);

    if (inside && !wasInside) {
      // insideSet is only updated AFTER a successful insert — adding it
      // beforehand meant a single failed insert permanently "poisoned" the
      // debounce state as already-inside, silently blocking every retry
      // until a genuine exit+re-entry.
      const { error: insertError } = await supabase
        .from('zone_breaches')
        .insert({ patient_id: patientId, zone_id: zone.id });
      if (insertError) {
        console.warn('Background zone_breaches insert failed:', insertError.message);
      } else {
        insideSet.add(zone.id);
      }
    } else if (!inside && wasInside) {
      insideSet.delete(zone.id);
    }
  }

  await AsyncStorage.setItem(INSIDE_ZONE_IDS_KEY, JSON.stringify([...insideSet]));
});

export async function registerBackgroundLocationTaskAsync(): Promise<boolean> {
  const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
  if (bgStatus !== 'granted') return false;

  // Unconditional stop-then-start: a registered-but-not-started task (a
  // zombie left behind by a crashed prior attempt) would otherwise get
  // skipped forever by a simple "already registered" check. stopLocationUpdatesAsync
  // throws harmlessly if nothing was actually running.
  try {
    await Location.stopLocationUpdatesAsync(BACKGROUND_ZONE_TASK);
  } catch {
    // nothing was running — expected on a clean first start
  }

  await Location.startLocationUpdatesAsync(BACKGROUND_ZONE_TASK, {
    // High, not Balanced — see useZoneMonitor.ts's comment for why: Balanced's
    // ~100m target is larger than the smallest zone radius this app allows
    // (50m), which would make breach detection unreliable for small zones.
    // This is a real, ongoing battery cost since this task runs in the
    // background regardless of whether the app is open — accepted
    // deliberately in exchange for breach records that are actually
    // trustworthy at 50m, per Sa'ad's explicit call.
    accuracy: Location.Accuracy.High,
    timeInterval: 60000,
    distanceInterval: 30,
    showsBackgroundLocationIndicator: false,
    foregroundService: {
      notificationTitle: 'RecovAI',
      notificationBody: 'Monitoring your location for your recovery plan.',
    },
  });

  return true;
}
