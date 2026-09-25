"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "./SessionProvider";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { session, loading } = useSession();

  useEffect(() => {
    if (!loading && !session) router.replace("/login");
  }, [loading, session, router]);

  if (loading || !session) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-abyss">
        <div className="text-xs font-mono uppercase tracking-widest text-mute">carregando…</div>
      </div>
    );
  }

  return <>{children}</>;
}
