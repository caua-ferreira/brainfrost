"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Snowflake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSupabase } from "@/lib/supabase/client";
import { useSession } from "@/components/saas/SessionProvider";

type MockProvider = "google" | "github" | "microsoft";

const PROVIDERS: {
  id: MockProvider;
  label: string;
  hint: string;
  meta: { display_name: string; avatar_initials: string };
}[] = [
  { id: "google",    label: "Entrar com Google",    hint: "conta pessoal",          meta: { display_name: "Cauã Ferreira", avatar_initials: "CF" } },
  { id: "github",    label: "Entrar com GitHub",    hint: "para importar repositórios", meta: { display_name: "caua-ferreira", avatar_initials: "CF" } },
  { id: "microsoft", label: "Entrar com Microsoft", hint: "conta de empresa",       meta: { display_name: "Cauã Ferreira", avatar_initials: "CF" } },
];

export default function LoginPage() {
  const router = useRouter();
  const { session } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) router.replace("/painel");
  }, [session, router]);

  const enterAs = async (provider: MockProvider, meta: { display_name: string; avatar_initials: string }) => {
    setBusy(true);
    setError(null);
    const supabase = getSupabase();
    const { error: err } = await supabase.auth.signInAnonymously({
      options: { data: { mock_provider: provider, ...meta } },
    });
    setBusy(false);
    if (err) {
      setError(
        err.message.includes("anonymous")
          ? "Anonymous sign-in ainda não está habilitado no Supabase. Habilite em Auth → Providers."
          : err.message
      );
      return;
    }
    router.replace("/painel");
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-abyss px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2">
          <Snowflake className="h-6 w-6 text-glow" strokeWidth={1.8} />
          <span className="text-lg font-semibold tracking-tight text-arctic">BrainFrost</span>
        </div>

        <h1 className="text-[22px] font-semibold leading-tight tracking-tight text-arctic">
          Seu segundo cérebro para qualquer IA.
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-mute">
          Suba os seus repositórios, deixe o cofre aprender seus padrões, e leve o contexto
          para o Claude, Cursor, Copilot ou qualquer outra IA que você usar para codar.
        </p>

        <div className="mt-8 flex flex-col gap-2">
          {PROVIDERS.map((p) => (
            <Button
              key={p.id}
              variant="outline"
              disabled={busy}
              className="h-11 justify-between border-glow/20 text-arctic hover:border-glow/60 hover:bg-rift/30"
              onClick={() => enterAs(p.id, p.meta)}
            >
              <span>{p.label}</span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-mute">
                {p.hint}
              </span>
            </Button>
          ))}
        </div>

        {error && (
          <p className="mt-4 rounded-md border border-red-400/40 bg-red-500/10 p-3 font-mono text-[11px] text-red-300">
            {error}
          </p>
        )}

        <p className="mt-8 font-mono text-[10px] uppercase tracking-widest text-mute/70">
          demo — anon sign-in do supabase
        </p>
      </div>
    </div>
  );
}
