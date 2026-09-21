import Link from "next/link";
import { EmptyState } from "@/components/shared/EmptyState";

export const dynamic = "force-static";

export default function Page() {
  return (
    <div className="h-full overflow-auto p-6">
      <EmptyState
        title="Tabela de camadas em construção"
        description="Aqui vai virar uma listagem filtrável por tag e camada, com busca full-text no corpo dos aprendizados. Chega na Fase 4 do plano."
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
