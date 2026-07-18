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
  const storageKey = 'backgroundZoneMonitor:insideZoneIds';
  const stored = await AsyncStorage.getItem(storageKey);
  const insideSet = new Set<string>(stored ? JSON.parse(stored) : []);

  for (const zone of zones) {
    const inside =
      haversineDistanceMeters(latest.coords.latitude, latest.coords.longitude, zone.lat, zone.lng) <= zone.radius_m;
    const wasInside = insideSet.has(zone.id);

    if (inside && !wasInside) {
      insideSet.add(zone.id);
      const { error: insertError } = await supabase
        .from('zone_breaches')
        .insert({ patient_id: patientId, zone_id: zone.id });
      if (insertError) console.warn('Background zone_breaches insert failed:', insertError.message);
    } else if (!inside && wasInside) {
      insideSet.delete(zone.id);
    }
  }

  await AsyncStorage.setItem(storageKey, JSON.stringify([...insideSet]));
});

export async function registerBackgroundLocationTaskAsync(): Promise<boolean> {
  const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
  if (bgStatus !== 'granted') return false;

  const alreadyRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_ZONE_TASK);
  if (alreadyRegistered) return true;

  await Location.startLocationUpdatesAsync(BACKGROUND_ZONE_TASK, {
    accuracy: Location.Accuracy.Balanced,
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
