"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Snowflake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSupabase } from "@/lib/supabase/client";
import { useSession } from "@/components/saas/SessionProvider";
import { ClaudeLogo, CopilotLogo, CortexLogo, CursorLogo, GeminiLogo } from "@/components/saas/AiLogos";

type OAuthProvider = "google" | "github" | "azure";

const PROVIDERS: {
  id: OAuthProvider;
  label: string;
  hint: string;
  scopes?: string;
}[] = [
  { id: "google", label: "Entrar com Google", hint: "conta pessoal" },
  { id: "github", label: "Entrar com GitHub", hint: "para importar repositórios", scopes: "read:user user:email repo" },
  { id: "azure",  label: "Entrar com Microsoft", hint: "conta de empresa", scopes: "email" },
];

export default function LoginPage() {
  const router = useRouter();
  const { session } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<OAuthProvider | "anon" | null>(null);

  useEffect(() => {
    // Lê ?error direto da URL, evita useSearchParams (que força prerender bailout).
    const params = new URLSearchParams(window.location.search);
    const errParam = params.get("error");
    if (errParam) setError(errParam);
  }, []);

  useEffect(() => {
    if (session) router.replace("/painel");
  }, [session, router]);

  const signInWith = async (provider: OAuthProvider, scopes?: string) => {
    setBusy(provider);
    setError(null);
    const { error: err } = await getSupabase().auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes,
      },
    });
    if (err) {
      setBusy(null);
      setError(
        err.message.includes("provider") || err.message.includes("not enabled")
          ? `${provider}: OAuth não habilitado no Supabase — configure em Auth → Providers.`
          : err.message
      );
    }
    // Se der certo, o browser redireciona pro provedor; nada mais a fazer.
  };

  const signInAnon = async () => {
    setBusy("anon");
    setError(null);
    const { error: err } = await getSupabase().auth.signInAnonymously({
      options: { data: { display_name: "Convidado", avatar_initials: "??", mock_provider: "anonymous" } },
    });
    setBusy(null);
    if (err) {
      setError(err.message);
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
              disabled={busy !== null}
              className="h-11 justify-between border-glow/20 text-arctic hover:border-glow/60 hover:bg-rift/30"
              onClick={() => signInWith(p.id, p.scopes)}
            >
              <span>{busy === p.id ? "…" : p.label}</span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-mute">
                {p.hint}
              </span>
            </Button>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 opacity-60">
          <ClaudeLogo size={16} />
          <CursorLogo size={16} />
          <CopilotLogo size={16} />
          <CortexLogo size={16} />
          <GeminiLogo size={16} />
          <span className="ml-1 font-mono text-[10px] uppercase tracking-widest text-mute">
            leve o contexto pra qualquer uma
          </span>
        </div>

        {error && (
          <p className="mt-4 rounded-md border border-red-400/40 bg-red-500/10 p-3 font-mono text-[11px] text-red-300">
            {error}
          </p>
        )}

        <div className="mt-8 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-mute/70">
          <button
            onClick={signInAnon}
            disabled={busy !== null}
            className="underline underline-offset-4 hover:text-arctic disabled:opacity-40"
          >
            entrar em modo demo
          </button>
          <span>oauth via supabase</span>
        </div>
      </div>
    </div>
  );
}
