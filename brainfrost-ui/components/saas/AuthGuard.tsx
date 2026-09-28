"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "./SessionProvider";
import { LoadingScreen } from "@/components/shared/LoadingScreen";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { session, loading } = useSession();

  useEffect(() => {
    if (!loading && !session) router.replace("/");
  }, [loading, session, router]);

  if (loading || !session) {
    return <LoadingScreen fullScreen message="abrindo seu cérebro" />;
  }

  return <>{children}</>;
}
