"use client";

import Link from "next/link";
import CofreDashboard from "@/components/cofre/CofreDashboard";
import { EmptyState } from "@/components/shared/EmptyState";
import { useVaultSnapshot } from "@/lib/supabase/useVault";
import { LoadingScreen } from "@/components/shared/LoadingScreen";

export default function Page() {
  const { snapshot, loading, error } = useVaultSnapshot();

  if (loading) {
    return <LoadingScreen message="carregando cofre" />;
  }

  if (error) {
    return (
      <div className="h-full overflow-auto p-6">
        <EmptyState
          title="Não deu para ler o cofre"
          description={error}
          action={
            <Link
              href="/"
              className="rounded-md border border-primary/25 bg-primary/5 px-3 py-1.5 text-xs text-foreground transition-colors hover:border-primary/60"
            >
              voltar ao grafo
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
          title="Cofre vazio"
          description="Sobe um repositório em /importar e aceita as sugestões em /curadoria."
        />
      </div>
    );
  }

  return <CofreDashboard notes={snapshot.notes} stats={snapshot.stats} />;
}
