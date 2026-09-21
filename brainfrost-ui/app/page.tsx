import BrainFrostShell from "@/components/BrainFrostShell";
import { EmptyState } from "@/components/shared/EmptyState";
import { readVault } from "@/lib/vault";

// O cofre é lido no build. Cada push do `bfrost learn` dispara um deploy novo na Vercel.
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
          description="Na Vercel, deixe a Root Directory em brainfrost-ui e mantenha ligada a opção que inclui arquivos fora dela. Rodando local, use npm run vault para ver onde o build está procurando."
          action={
            <pre className="max-w-2xl overflow-x-auto rounded-lg border border-glow/15 bg-abyss/80 p-4 text-left font-mono text-xs leading-relaxed text-mute">
              {error instanceof Error ? error.message : String(error)}
            </pre>
          }
        />
      </div>
    );
  }

  return <BrainFrostShell snapshot={snapshot} />;
}
