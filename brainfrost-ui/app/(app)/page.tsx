"use client";

import { Suspense } from "react";
import BrainFrostShell from "@/components/BrainFrostShell";
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
          description="Sua sessão pode ter expirado ou o Supabase está indisponível."
          action={
            <pre className="max-w-2xl overflow-x-auto rounded-lg border border-glow/15 bg-abyss/80 p-4 text-left font-mono text-xs leading-relaxed text-mute">
              {error}
            </pre>
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
          description="Sobe um repositório em /importar e aceita as sugestões em /curadoria pra começar a preencher o cofre e ver o grafo."
        />
      </div>
    );
  }

  return (
    <Suspense fallback={null}>
      <BrainFrostShell snapshot={snapshot} />
    </Suspense>
  );
}
