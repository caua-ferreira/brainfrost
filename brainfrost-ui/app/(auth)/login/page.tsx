"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getSupabase } from "@/lib/supabase/client";
import { useSession } from "@/components/saas/SessionProvider";
import { ClaudeLogo, CopilotLogo, CortexLogo, CursorLogo, GeminiLogo } from "@/components/saas/AiLogos";
import { GitHubBrandLogo, GoogleLogo, MicrosoftLogo } from "@/components/saas/OAuthProviderLogos";

type OAuthProvider = "google" | "github" | "azure";

const PROVIDERS: {
  id: OAuthProvider;
  label: string;
  hint: string;
  scopes?: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
}[] = [
  { id: "google", label: "Entrar com Google", hint: "conta pessoal", Icon: GoogleLogo },
  { id: "github", label: "Entrar com GitHub", hint: "para importar repositórios", scopes: "read:user user:email repo", Icon: GitHubBrandLogo },
  { id: "azure",  label: "Entrar com Microsoft", hint: "conta de empresa", scopes: "email", Icon: MicrosoftLogo },
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
    <div className="flex min-h-[100dvh] items-center justify-center px-4 py-8" style={{ background: "#FCFCFB" }}>
      <div className="grid w-full max-w-5xl grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-16">
        {/* esquerda: yeti hero */}
        <div className="flex justify-center md:justify-end">
          <div className="relative w-[320px] md:w-[420px]">
            <Image
              src="/mascot/yeti-sign.png"
              alt="Frostie segurando a placa de login"
              width={420}
              height={496}
              priority
              className="h-auto w-full"
            />
            <span
              className="pointer-events-none absolute left-1/2 top-[6%] -translate-x-1/2 font-semibold uppercase tracking-[0.2em] text-abyss"
              style={{ fontSize: 44 }}
            >
              Login
            </span>
          </div>
        </div>

        {/* direita: descrição + botões */}
        <div className="w-full max-w-sm">
        <h1 className="text-[22px] font-semibold leading-tight tracking-tight text-abyss">
          Seu segundo cérebro para qualquer IA.
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-abyss/60">
          Suba os seus repositórios, deixe o cofre aprender seus padrões, e leve o contexto
          para o Claude, Cursor, Copilot ou qualquer outra IA que você usar para codar.
        </p>

        <div className="mt-8 flex flex-col gap-2">
          {PROVIDERS.map((p) => (
            <Button
              key={p.id}
              variant="outline"
              disabled={busy !== null}
              className="h-11 justify-between border-abyss/15 bg-white text-abyss hover:border-abyss/40 hover:bg-abyss/5"
              onClick={() => signInWith(p.id, p.scopes)}
            >
              <span className="flex items-center gap-2.5">
                <p.Icon size={18} />
                {busy === p.id ? "…" : p.label}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-abyss/50">
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
          <span className="ml-1 font-mono text-[10px] uppercase tracking-widest text-abyss/60">
            leve o contexto pra qualquer uma
          </span>
        </div>

        {error && (
          <p className="mt-4 rounded-md border border-red-400/40 bg-red-500/10 p-3 font-mono text-[11px] text-red-300">
            {error}
          </p>
        )}

        <div className="mt-8 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-abyss/50">
          <button
            onClick={signInAnon}
            disabled={busy !== null}
            className="underline underline-offset-4 hover:text-abyss disabled:opacity-40"
          >
            entrar em modo demo
          </button>
          <span>oauth via supabase</span>
        </div>
        </div>
      </div>
    </div>
  );
}
