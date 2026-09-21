import Link from "next/link";
import CamadasBrowser from "@/components/camadas/CamadasBrowser";
import { EmptyState } from "@/components/shared/EmptyState";
import { readVault } from "@/lib/vault";

export const dynamic = "force-static";

export default function Page() {
  let snapshot;
  try {
    snapshot = readVault();
  } catch (error) {
    return (
      <div className="h-full overflow-auto p-6">
        <EmptyState
          title="Cofre não encontrado"
          description={error instanceof Error ? error.message : String(error)}
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

  return <CamadasBrowser notes={snapshot.notes} />;
}
