import BrainFrostShell from "@/components/BrainFrostShell";
import { readVault } from "@/lib/vault";

// O cofre é lido no build. Cada push do `bfrost learn` dispara um deploy novo na Vercel.
export const dynamic = "force-static";

export default function Page() {
  let snapshot;
  try {
    snapshot = readVault();
  } catch (error) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-5 px-6 py-16">
        <p className="font-mono text-sm text-glow">❄ cofre não encontrado</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          O BrainFrost subiu, mas não achou nenhuma camada para mostrar.
        </h1>
        <pre className="pane overflow-x-auto rounded-lg p-4 font-mono text-xs leading-relaxed text-mute">
          {error instanceof Error ? error.message : String(error)}
        </pre>
        <p className="max-w-[60ch] text-sm leading-relaxed text-mute">
          Na Vercel, deixe a Root Directory em <code className="text-arctic">brainfrost-ui</code> e mantenha
          ligada a opção que inclui arquivos fora dela. Rodando local, use{" "}
          <code className="text-arctic">npm run vault</code> para ver onde o build está procurando.
        </p>
      </main>
    );
  }

  return <BrainFrostShell snapshot={snapshot} />;
}
