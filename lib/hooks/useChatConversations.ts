import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useSession } from './useSession';

export interface ChatConversation {
  id: string;
  title: string | null;
  lastMessageAt: string;
}

/** The signed-in patient's chat conversations, most-recently-active first — for the history/browse screen. */
export function useChatConversations(): { data: ChatConversation[]; isLoading: boolean; error: null } {
  const { session } = useSession();
  const patientId = session?.user.id;

  const [data, setData] = useState<ChatConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!patientId) {
      setData([]);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    supabase
      .from('chat_conversations')
      .select('id, title, last_message_at')
      .eq('patient_id', patientId)
      .order('last_message_at', { ascending: false })
      .then(({ data: rows }) => {
        if (!isMounted) return;
        setData(
          (rows ?? []).map((row) => ({
            id: row.id,
            title: row.title,
            lastMessageAt: row.last_message_at,
          }))
        );
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [patientId]);

  return { data, isLoading, error: null };
}
