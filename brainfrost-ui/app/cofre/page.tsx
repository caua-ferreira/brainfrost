import Link from "next/link";
import { EmptyState } from "@/components/shared/EmptyState";

export const dynamic = "force-static";

export default function Page() {
  return (
    <div className="h-full overflow-auto p-6">
      <EmptyState
        title="Painel do cofre em construção"
        description="Contagem de camadas, órfãos, links quebrados, tamanhos por tag e um gráfico de conexões por camada. Chega na Fase 5 do plano."
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
