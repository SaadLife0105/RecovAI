import { ChatMessage } from '../types';
import { CHAT_MESSAGES, PATIENT_ID } from '../mockData';

export function useChatMessages(patientId: string = PATIENT_ID): { data: ChatMessage[]; isLoading: boolean; error: null } {
  return {
    data: CHAT_MESSAGES.filter((m) => m.patientId === patientId),
    isLoading: false,
    error: null,
  };
}
