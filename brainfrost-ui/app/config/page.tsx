import Link from "next/link";
import { EmptyState } from "@/components/shared/EmptyState";

export const dynamic = "force-static";

export default function Page() {
  return (
    <div className="h-full overflow-auto p-6">
      <EmptyState
        title="Config em construção"
        description="Vai renderizar o ~/.brainfrostrc (só leitura) e listar os provedores disponíveis com status da variável de ambiente. A UI não escreve nada — todo comando continua no bfrost config."
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
