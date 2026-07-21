import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
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
  // deliberately survives an active→background→active cycle (a ref on a
  // component that never unmounts), so a brief phone-lock doesn't flicker the
  // check-in screen's zone display to "—" and back. It resets only on a
  // genuine unmount (e.g. logout) or when `zones`/`patientId` change, which
  // triggers a fresh watch that re-detects entries from the first new fix.
  const insideRef = useRef<Set<string>>(new Set());

  // "Foreground-only" was previously only true of the comment, not the code:
  // React Native does NOT unmount components when the app is backgrounded, so
  // the watcher stayed subscribed and the native side kept delivering position
  // callbacks into a runtime that was no longer hosted — an on-device crash on
  // 2026-07-21 ("IllegalArgumentException: The module wasn't created! You
  // can't access the hosting runtime"). Tracking AppState makes the
  // subscription's real lifecycle match what this hook already claimed.
  const [appState, setAppState] = useState(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', setAppState);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    let isMounted = true;
    let subscription: Location.LocationSubscription | undefined;

    // Not foregrounded: subscribe to nothing. The cleanup below has already
    // run for the previous ('active') pass by the time this executes, so the
    // old subscription is gone and no new one replaces it.
    if (appState !== 'active') return;

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

      // The cleanup below can fire while the two awaits above are still in
      // flight (backgrounding mid-permission-prompt is the realistic case) —
      // at that point `subscription` is still undefined, so cleanup has
      // nothing to remove and this one would survive into the background
      // unreferenced. That is exactly the dangling-callback shape that
      // crashed the app, so tear it down here instead.
      if (!isMounted) {
        subscription.remove();
        subscription = undefined;
      }
    })();

    return () => {
      isMounted = false;
      subscription?.remove();
    };
    // Re-subscribe when the zone set or patient changes so the watcher always
    // compares against current zones — and when the app foregrounds/
    // backgrounds, which tears the watcher down and rebuilds it rather than
    // leaving it running where it can't be serviced.
  }, [zones, patientId, appState]);

  return { currentZoneStatus, isAvailable, permissionDenied };
}
