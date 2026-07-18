import { createContext, useContext, ReactNode } from 'react';
import { usePedometer } from '../hooks/usePedometer';
import { useZoneMonitor } from '../hooks/useZoneMonitor';

interface PassiveData {
  steps: number;
  stepsAvailable: boolean;
  stepsPermissionDenied: boolean;
  currentZoneStatus: 'safe' | 'risk' | null;
  zoneAvailable: boolean;
  zonePermissionDenied: boolean;
}

const PassiveDataContext = createContext<PassiveData | null>(null);

/**
 * Calls the passive-sensor hooks exactly ONCE, app-wide, for the signed-in
 * patient. Screens read the result via usePassiveData() instead of calling
 * the hooks directly — per-screen calls created independent, disconnected
 * sensor subscriptions.
 */
export function PassiveDataProvider({ patientId, children }: { patientId?: string; children: ReactNode }) {
  const pedometer = usePedometer();
  const zone = useZoneMonitor(patientId);

  const value: PassiveData = {
    steps: pedometer.steps,
    stepsAvailable: pedometer.isAvailable,
    stepsPermissionDenied: pedometer.permissionDenied,
    currentZoneStatus: zone.currentZoneStatus,
    zoneAvailable: zone.isAvailable,
    zonePermissionDenied: zone.permissionDenied,
  };

  return <PassiveDataContext.Provider value={value}>{children}</PassiveDataContext.Provider>;
}

export function usePassiveData(): PassiveData {
  const ctx = useContext(PassiveDataContext);
  if (!ctx) throw new Error('usePassiveData must be used within a PassiveDataProvider');
  return ctx;
}
