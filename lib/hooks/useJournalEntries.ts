import { JournalEntry } from '../types';
import { JOURNAL_ENTRIES, PATIENT_ID } from '../mockData';

export function useJournalEntries(patientId: string = PATIENT_ID): { data: JournalEntry[]; isLoading: boolean; error: null } {
  return {
    data: JOURNAL_ENTRIES.filter((j) => j.patientId === patientId),
    isLoading: false,
    error: null,
  };
}
