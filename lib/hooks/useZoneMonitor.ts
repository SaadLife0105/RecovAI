import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { haversineDistanceMeters } from '../geo';
import { useRiskZones } from './useRiskZones';

type ZoneClassification = 'safe' | 'low_risk' | 'medium_risk' | 'high_risk';

interface ZoneMonitorResult {
  currentZoneStatus: ZoneClassification | null;
  isAvailable: boolean;
  permissionDenied: boolean;
}

// Most dangerous zone wins when inside overlapping zones — explicit priority
// order rather than relying on enum declaration order.
const ZONE_PRIORITY: Record<ZoneClassification, number> = {
  safe: 0,
  low_risk: 1,
  medium_risk: 2,
  high_risk: 3,
};

/**
 * Android-only foreground zone-proximity watcher — display-only, drives
 * currentZoneStatus for the UI. lib/backgroundLocationTask.ts is the sole
 * writer of zone_breaches. Never throws — a denied permission degrades to null.
 */
export function useZoneMonitor(patientId?: string): ZoneMonitorResult {
  const { data: zones } = useRiskZones(patientId);
  const [currentZoneStatus, setCurrentZoneStatus] = useState<ZoneClassification | null>(null);
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
      // High accuracy (not Balanced): Balanced targets ~100m (Android's own
      // "city block" tier, often WiFi/cell-based rather than GPS), which is
      // larger than the smallest zone radius (50m) this app allows — a zone
      // smaller than the position noise itself can't be reliably detected.
      // High targets ~10m and actually uses GPS. This hook is foreground-only
      // already, so the extra power draw only accrues while the app is open,
      // not as a 24/7 background cost.
      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 15000, distanceInterval: 20 },
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;

          for (const zone of zones) {
            // Skip zones where the GPS reading's own reported uncertainty is
            // looser than the zone's radius — a low-confidence position isn't
            // a reliable basis for an in/out call on a small zone. Keep
            // whatever membership state we already had rather than guess.
            if (accuracy !== null && accuracy > zone.radiusM) continue;

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

          // Most dangerous zone wins when inside overlapping zones.
          let status: ZoneClassification | null = null;
          for (const zone of zones) {
            if (insideRef.current.has(zone.id)) {
              if (status === null || ZONE_PRIORITY[zone.classification] > ZONE_PRIORITY[status]) {
                status = zone.classification;
              }
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
