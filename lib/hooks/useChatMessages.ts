import { useCallback, useEffect, useState } from 'react';
import { ChatMessage } from '../types';
import { supabase } from '../supabase';
import { toDeviceLocalIsoString } from '../formatDate';

/**
 * Real chat history for one conversation, oldest-first (created_at asc).
 * `conversationId` undefined/null means no conversation is loaded yet (a
 * brand-new chat that hasn't sent its first message) — returns empty data
 * without querying. Maps chat_messages rows to the ChatMessage shape: role
 * 'user' → 'patient', role 'assistant' → 'assistant'. Timestamps display in
 * the viewer's own device-local time (project display convention — see
 * formatDate.ts), while created_at stays genuine UTC in the DB.
 */
export function useChatMessages(conversationId: string | undefined | null): {
  data: ChatMessage[];
  isLoading: boolean;
  error: null;
  refetch: () => Promise<void>;
} {
  const [data, setData] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!conversationId) {
      setData([]);
      setIsLoading(false);
      return;
    }

    const { data: rows } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    setData(
      (rows ?? []).map((row) => ({
        id: row.id,
        patientId: row.patient_id,
        sender: row.role === 'assistant' ? 'assistant' : 'patient',
        text: row.content,
        createdAt: toDeviceLocalIsoString(row.created_at),
      }))
    );
    setIsLoading(false);
  }, [conversationId]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    refetch().finally(() => {
      if (!isMounted) return;
    });
    return () => {
      isMounted = false;
    };
  }, [refetch]);

  return { data, isLoading, error: null, refetch };
}
