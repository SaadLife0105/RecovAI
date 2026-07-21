import { useCallback, useState } from 'react';
import { supabase } from '../supabase';

interface SendResult {
  reply: string;
  crisisFlag: boolean;
  conversationId: string;
}

/**
 * Sends a patient message to the deployed `rag-chat` Edge Function.
 * supabase.functions.invoke auto-attaches the caller's auth + apikey headers
 * from the current session — no manual header wiring. Pass `conversationId`
 * to continue an existing chat, or omit it (undefined) to start a new one —
 * rag-chat creates the conversation row itself and returns its id. On
 * success returns { reply, crisisFlag, conversationId } (the caller drives
 * the crisis banner off crisisFlag, and captures conversationId the first
 * time it's assigned); on failure returns null and exposes a human-readable
 * `error`.
 */
export function useSendChatMessage(): {
  sendMessage: (message: string, conversationId?: string) => Promise<SendResult | null>;
  isSending: boolean;
  error: string | null;
} {
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (message: string, conversationId?: string): Promise<SendResult | null> => {
    setIsSending(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('rag-chat', {
        body: { message, conversationId },
      });

      if (invokeError) {
        // FunctionsHttpError carries the raw Response on `.context`, so we can
        // read the status code to distinguish rate-limiting from other failures.
        const status: number | undefined = (invokeError as { context?: { status?: number } }).context?.status;
        setError(
          status === 429
            ? "You're sending messages quickly, please wait a moment"
            : "Couldn't send — check your connection and try again"
        );
        return null;
      }

      return {
        reply: data.reply as string,
        crisisFlag: Boolean(data.crisisFlag),
        conversationId: data.conversationId as string,
      };
    } catch {
      setError("Couldn't send — check your connection and try again");
      return null;
    } finally {
      setIsSending(false);
    }
  }, []);

  return { sendMessage, isSending, error };
}
