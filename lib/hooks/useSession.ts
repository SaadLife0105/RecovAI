import { useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import type { UserRole } from '../types';

interface SessionState {
  session: Session | null;
  role: UserRole | null;
  isLoading: boolean;
}

async function resolveRole(userId: string): Promise<UserRole | null> {
  const { data } = await supabase.from('profiles').select('role').eq('id', userId).single();
  return (data?.role as UserRole) ?? null;
}

/** Tracks the current auth session and the signed-in user's role (from `profiles`). */
export function useSession(): SessionState {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (!isMounted) return;
      setSession(initialSession);
      setRole(initialSession ? await resolveRole(initialSession.user.id) : null);
      setIsLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!isMounted) return;
      setSession(newSession);
      setRole(newSession ? await resolveRole(newSession.user.id) : null);
    });

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return { session, role, isLoading };
}
