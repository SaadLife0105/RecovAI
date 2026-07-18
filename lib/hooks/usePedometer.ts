import { useEffect, useState } from 'react';
import { initialize, requestPermission, aggregateRecord } from 'react-native-health-connect';
import { getMauritiusStartOfDayIso } from '../mauritiusTime';

interface PedometerResult {
  steps: number;
  isAvailable: boolean;
  permissionDenied: boolean;
}

const REFRESH_INTERVAL_MS = 60_000;

/**
 * Android-only "steps today" counter via Health Connect. Never throws — an
 * unavailable provider or denied permission degrades to steps: 0.
 */
export function usePedometer(): PedometerResult {
  const [steps, setSteps] = useState(0);
  const [isAvailable, setIsAvailable] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let interval: ReturnType<typeof setInterval> | undefined;

    const fetchToday = async () => {
      try {
        const startTime = getMauritiusStartOfDayIso();
        const endTime = new Date().toISOString();
        console.log('HC query window:', startTime, 'to', endTime);
        const result = await aggregateRecord({
          recordType: 'Steps',
          timeRangeFilter: {
            operator: 'between',
            startTime,
            endTime,
          },
        });
        console.log('HC raw result:', JSON.stringify(result));
        if (isMounted) setSteps(result.COUNT_TOTAL);
      } catch {
        // transient read failure — keep showing the last known total
      }
    };

    (async () => {
      try {
        const available = await initialize();
        console.log('HC available:', available);
        if (!isMounted) return;
        if (!available) {
          setIsAvailable(false);
          return;
        }
        setIsAvailable(true);

        const granted = await requestPermission([{ accessType: 'read', recordType: 'Steps' }]);
        console.log('HC granted:', JSON.stringify(granted));
        if (!isMounted) return;
        if (!granted.some((p) => p.recordType === 'Steps')) {
          setPermissionDenied(true);
          return;
        }

        await fetchToday();
        if (!isMounted) return;
        interval = setInterval(fetchToday, REFRESH_INTERVAL_MS);
      } catch {
        if (isMounted) setIsAvailable(false);
      }
    })();

    return () => {
      isMounted = false;
      if (interval) clearInterval(interval);
    };
  }, []);

  return { steps, isAvailable, permissionDenied };
}
