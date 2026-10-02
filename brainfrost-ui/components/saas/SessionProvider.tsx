"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";

interface Ctx {
  session: Session | null;
  loading: boolean;
}

const SessionContext = createContext<Ctx>({ session: null, loading: true });

export const useIsDemo = () => {
  const { session } = useContext(SessionContext);
  return session?.user?.is_anonymous === true;
};

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Ctx>({ session: null, loading: true });

  useEffect(() => {
    const supabase = getSupabase();
    // O evento INITIAL_SESSION já hidrata a sessão persistida. Manter um
    // getSession paralelo cria uma corrida em que um resultado nulo antigo
    // pode sobrescrever o login OAuth recém-concluído e exibir a landing.
    const { data: sub } = supabase.auth.onAuthStateChange((_, session) => {
      setState({ session, loading: false });
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return <SessionContext.Provider value={state}>{children}</SessionContext.Provider>;
}

export const useSession = () => useContext(SessionContext);
