"use client";

import Link from "next/link";
import CofreDashboard from "@/components/cofre/CofreDashboard";
import { EmptyState } from "@/components/shared/EmptyState";
import { useVaultSnapshot } from "@/lib/supabase/useVault";

export default function Page() {
  const { snapshot, loading, error } = useVaultSnapshot();

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-abyss">
        <div className="font-mono text-xs uppercase tracking-widest text-mute">
          carregando cofre…
        </div>
      </div>
    );
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
              className="rounded-md border border-glow/25 bg-rift/30 px-3 py-1.5 text-xs text-arctic transition-colors hover:border-glow/60"
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
