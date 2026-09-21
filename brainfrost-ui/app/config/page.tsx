import Link from "next/link";
import ConfigDashboard from "@/components/config/ConfigDashboard";
import { EmptyState } from "@/components/shared/EmptyState";
import { readMeta } from "@/lib/meta";

export const dynamic = "force-static";

export default function Page() {
  const meta = readMeta();

  if (!meta) {
    return (
      <div className="h-full overflow-auto p-6">
        <EmptyState
          title="Nenhum snapshot da config ainda"
          description="Rode bfrost meta no terminal, commite o .brainfrost/_meta.json e o próximo deploy vai encher esta tela."
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

  return <ConfigDashboard meta={meta} />;
}
