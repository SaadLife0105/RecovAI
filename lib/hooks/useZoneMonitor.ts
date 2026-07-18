import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { haversineDistanceMeters } from '../geo';
import { useRiskZones } from './useRiskZones';

interface ZoneMonitorResult {
  currentZoneStatus: 'safe' | 'risk' | null;
  isAvailable: boolean;
  permissionDenied: boolean;
}

/**
 * Android-only foreground zone-proximity watcher — display-only, drives
 * currentZoneStatus for the UI. lib/backgroundLocationTask.ts is the sole
 * writer of zone_breaches. Never throws — a denied permission degrades to null.
 */
export function useZoneMonitor(patientId?: string): ZoneMonitorResult {
  const { data: zones } = useRiskZones(patientId);
  const [currentZoneStatus, setCurrentZoneStatus] = useState<'safe' | 'risk' | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Zone IDs the patient is currently inside. In-memory only (not persisted) —
  // a deliberate simplification for a foreground-only prototype watcher: the
  // set naturally resets whenever monitoring restarts, which is acceptable
  // because a fresh watch re-detects entries from the first position update.
  const insideRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let isMounted = true;
    let subscription: Location.LocationSubscription | undefined;

    (async () => {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!isMounted) return;
      if (!granted) {
        setPermissionDenied(true);
        return; // graceful degradation — no watcher started
      }
      setIsAvailable(true);

      // Foreground watcher only — deliberately no background location, per
      // Development Plan.md's Critical Caution on background location scope.
      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 15000, distanceInterval: 20 },
        (pos) => {
          const { latitude, longitude } = pos.coords;

          for (const zone of zones) {
            const inside = haversineDistanceMeters(latitude, longitude, zone.lat, zone.lng) <= zone.radiusM;
            const wasInside = insideRef.current.has(zone.id);

            if (inside && !wasInside) {
              // Display-only: this hook drives currentZoneStatus for the UI.
              // It no longer writes zone_breaches — lib/backgroundLocationTask.ts
              // is the sole writer, since it logs whether the app is fore- or
              // backgrounded; writing here too would double-log the same entry
              // whenever the app happens to be open.
              insideRef.current.add(zone.id);
            } else if (!inside && wasInside) {
              insideRef.current.delete(zone.id);
            }
          }

          // 'risk' wins over 'safe' when inside overlapping zones.
          let status: 'safe' | 'risk' | null = null;
          for (const zone of zones) {
            if (insideRef.current.has(zone.id)) {
              if (zone.classification === 'risk') {
                status = 'risk';
                break;
              }
              status = 'safe';
            }
          }
          if (isMounted) setCurrentZoneStatus(status);
        }
      );
    })();

    return () => {
      isMounted = false;
      subscription?.remove();
    };
    // Re-subscribe when the zone set or patient changes so the watcher always
    // compares against current zones.
  }, [zones, patientId]);

  return { currentZoneStatus, isAvailable, permissionDenied };
}
