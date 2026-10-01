"use client";

import { Suspense } from "react";
import BrainFrostShell from "@/components/BrainFrostShell";
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
          title="Cérebro vazio"
          description="Ensine algo ao cérebro e revise os aprendizados sugeridos para criar as primeiras memórias."
        />
      </div>
    );
  }

  return (
    <Suspense fallback={<LoadingScreen message="abrindo cérebro" />}>
      <BrainFrostShell snapshot={snapshot} />
    </Suspense>
  );
}
