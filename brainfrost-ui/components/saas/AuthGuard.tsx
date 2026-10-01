"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "./SessionProvider";
import { LoadingScreen } from "@/components/shared/LoadingScreen";
import { getSupabase } from "@/lib/supabase/client";
import { userNeedsName } from "@/lib/user-profile";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { session, loading } = useSession();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace("/");
      return;
    }
    if (session.user.is_anonymous) {
      getSupabase().auth.signOut().finally(() => router.replace("/login?error=anonymous_not_allowed"));
      return;
    }
    if (userNeedsName(session.user) && pathname !== "/perfil") {
      router.replace("/perfil?onboarding=1");
    }
  }, [loading, session, pathname, router]);

  if (loading || !session || session.user.is_anonymous || (userNeedsName(session.user) && pathname !== "/perfil")) {
    return <LoadingScreen fullScreen message="abrindo seu cérebro" />;
  }

  return <>{children}</>;
}
