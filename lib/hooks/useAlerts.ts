import { Alert } from '../types';
import { ALERTS, DOCTOR_ID } from '../mockData';

export function useAlerts(doctorId: string = DOCTOR_ID): { data: Alert[]; isLoading: boolean; error: null } {
  return {
    data: ALERTS.filter((a) => a.doctorId === doctorId),
    isLoading: false,
    error: null,
  };
}
