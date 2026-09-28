"use client";

import Link from "next/link";
import ChatRoom from "@/components/chat/ChatRoom";
import { EmptyState } from "@/components/shared/EmptyState";
import { useVaultSnapshot } from "@/lib/supabase/useVault";
import { LoadingScreen } from "@/components/shared/LoadingScreen";

export default function Page() {
  const { snapshot, loading, error } = useVaultSnapshot();

  if (loading) {
    return <LoadingScreen message="carregando cérebro" />;
  }

  if (error) {
    return (
      <div className="h-full overflow-auto p-6">
        <EmptyState
          title="Não deu para ler o cérebro"
          description={error}
          action={
            <Link
              href="/"
              className="rounded-md border border-primary/25 bg-primary/5 px-3 py-1.5 text-xs text-foreground transition-colors hover:border-primary/60"
            >
              voltar ao cérebro
            </Link>
          }
        />
      </div>
    );
  }

  if (!snapshot || snapshot.notes.length === 0) {
    return (
      <div className="h-full overflow-auto p-6">
        <EmptyState
          title="Cérebro vazio"
          description="O chat precisa de camadas para injetar como contexto. Adicione algumas em /importar → /curadoria."
        />
      </div>
    );
  }

  return <ChatRoom notes={snapshot.notes} />;
}
