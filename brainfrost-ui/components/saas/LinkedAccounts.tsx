"use client";

import { useEffect, useState } from "react";
import { Check, Unlink } from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";
import { useSession } from "./SessionProvider";
import { GitHubBrandLogo, GoogleLogo, MicrosoftLogo } from "./OAuthProviderLogos";

type Provider = "google" | "github" | "azure";

const PROVIDERS: {
  id: Provider;
  label: string;
  hint: string;
  scopes?: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
}[] = [
  { id: "google", label: "Google", hint: "e-mail pessoal", Icon: GoogleLogo },
  { id: "github", label: "GitHub", hint: "importar repositórios privados", scopes: "read:user user:email repo", Icon: GitHubBrandLogo },
  { id: "azure", label: "Microsoft", hint: "conta Microsoft / Azure AD", scopes: "email", Icon: MicrosoftLogo },
];

export function LinkedAccounts() {
  const { session } = useSession();
  const [busy, setBusy] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [identities, setIdentities] = useState(session?.user.identities ?? []);

  useEffect(() => {
    let active = true;
    if (!session) {
      setIdentities([]);
      return () => {
        active = false;
      };
    }

    getSupabase()
      .auth.getUserIdentities()
      .then(({ data, error: identitiesError }) => {
        if (active && !identitiesError) setIdentities(data?.identities ?? []);
      });

    return () => {
      active = false;
    };
  }, [session?.user.id]);

  if (!session) return null;

  const linked = new Set(identities.map((i) => i.provider));

  const link = async (provider: Provider) => {
    setBusy(provider);
    setError(null);
    const opts: { scopes?: string; redirectTo: string } = {
      redirectTo: `${window.location.origin}/auth/callback?next=/config`,
    };
    const scopes = PROVIDERS.find((p) => p.id === provider)?.scopes;
    if (scopes) opts.scopes = scopes;
    const { error: err } = await getSupabase().auth.linkIdentity({ provider, options: opts });
    setBusy(null);
    if (err) {
      setError(
        err.message.includes("manual linking") || err.message.includes("not enabled")
          ? "Vinculação manual desabilitada no Supabase — ative em Auth → Providers."
          : err.message
      );
    }
  };

  const unlink = async (provider: Provider) => {
    if (linked.size <= 1) {
      setError("Você precisa de pelo menos uma conta conectada.");
      return;
    }
    if (!confirm(`Desvincular ${provider}? Você não poderá mais entrar por essa conta.`)) return;
    setBusy(provider);
    setError(null);
    const identity = identities.find((i) => i.provider === provider);
    if (!identity) return;
    const { error: err } = await getSupabase().auth.unlinkIdentity(identity);
    setBusy(null);
    if (err) {
      setError(err.message);
    } else {
      setIdentities((current) => current.filter((item) => item.identity_id !== identity.identity_id));
    }
  };

  return (
    <section className="mt-12 border-t border-slate-200 pt-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-slate-500">
        Contas conectadas
      </p>
      <p className="mt-2 max-w-lg text-[13px] text-slate-500">
        Conecte mais de uma conta pra entrar por qualquer uma delas. Todas ligam ao
        mesmo cérebro.
      </p>

      <div className="mt-5 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
        {PROVIDERS.map((p) => {
          const isLinked = linked.has(p.id);
          const isBusy = busy === p.id;
          const Icon = p.Icon;
          return (
            <div key={p.id} className="flex items-center justify-between gap-4 p-4">
              <div className="flex min-w-0 items-center gap-3">
                <Icon size={22} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-semibold text-slate-900">
                      {p.label}
                    </span>
                    {isLinked && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-emerald-700">
                        <Check className="h-3 w-3" strokeWidth={2.5} /> vinculado
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                    {p.hint}
                  </p>
                </div>
              </div>
              {isLinked ? (
                <button
                  onClick={() => unlink(p.id)}
                  disabled={isBusy || linked.size <= 1}
                  className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 px-4 py-1.5 text-[12px] font-medium text-red-500 transition-colors hover:border-red-500 hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  title={linked.size <= 1 ? "Você precisa de pelo menos uma conta" : "Desvincular"}
                >
                  <Unlink className="h-3 w-3" strokeWidth={2} />
                  {isBusy ? "…" : "Desvincular"}
                </button>
              ) : (
                <button
                  onClick={() => link(p.id)}
                  disabled={isBusy}
                  className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-[12px] font-medium text-slate-900 transition-colors hover:bg-slate-50 disabled:opacity-40"
                >
                  {isBusy ? "…" : "Conectar"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <p className="mt-3 rounded-md border border-red-400/40 bg-red-50 p-3 font-mono text-[11px] text-red-600">
          {error}
        </p>
      )}
    </section>
  );
}
