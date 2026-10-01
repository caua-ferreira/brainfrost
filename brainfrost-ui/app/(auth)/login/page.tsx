"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSupabase } from "@/lib/supabase/client";
import { useSession } from "@/components/saas/SessionProvider";
import { GitHubBrandLogo, GitLabLogo, GoogleLogo, MicrosoftLogo } from "@/components/saas/OAuthProviderLogos";

type OAuthProvider = "google" | "github" | "azure" | "gitlab";
type AuthMode = "signin" | "signup";

const GITLAB_ENABLED = process.env.NEXT_PUBLIC_GITLAB_AUTH_ENABLED === "true";

const WELCOMES = ["Welcome", "Bem-vindo", "Bienvenido", "Benvenuto", "欢迎", "Willkommen", "स्वागत है", "Bienvenue"];

function TypewriterWelcome() {
  const [wordIdx, setWordIdx] = useState(0);
  const [text, setText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const word = WELCOMES[wordIdx];
    if (!deleting && text === word) {
      const t = setTimeout(() => setDeleting(true), 1400);
      return () => clearTimeout(t);
    }
    if (deleting && text === "") {
      setDeleting(false);
      setWordIdx((i) => (i + 1) % WELCOMES.length);
      return;
    }
    const t = setTimeout(() => {
      setText((cur) => (deleting ? cur.slice(0, -1) : word.slice(0, cur.length + 1)));
    }, deleting ? 60 : 110);
    return () => clearTimeout(t);
  }, [text, deleting, wordIdx]);

  return (
    <span className="inline-flex items-center">
      {text}
      <span className="ml-0.5 inline-block w-[3px] animate-pulse bg-abyss" style={{ height: "0.85em" }} />
    </span>
  );
}

const PROVIDERS: {
  id: OAuthProvider;
  label: string;
  scopes?: string;
  soon?: boolean;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
}[] = [
  { id: "google", label: "Google", Icon: GoogleLogo },
  { id: "github", label: "GitHub", scopes: "read:user user:email repo", Icon: GitHubBrandLogo },
  { id: "azure", label: "Microsoft", scopes: "email", Icon: MicrosoftLogo },
  { id: "gitlab", label: "GitLab", scopes: "read_user", soon: !GITLAB_ENABLED, Icon: GitLabLogo },
];

export default function LoginPage() {
  const router = useRouter();
  const { session } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<OAuthProvider | null>(null);
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    // Lê ?error direto da URL, evita useSearchParams (que força prerender bailout).
    const params = new URLSearchParams(window.location.search);
    const errParam = params.get("error");
    if (errParam) setError(errParam);
  }, []);

  useEffect(() => {
    if (session && !session.user.is_anonymous) router.replace("/painel");
  }, [session, router]);

  const signInWith = async (provider: OAuthProvider, scopes?: string) => {
    setBusy(provider);
    setError(null);
    const requestedNext = new URLSearchParams(window.location.search).get("next");
    const next = requestedNext && requestedNext.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : "/painel";
    const { error: err } = await getSupabase().auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
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

  const continueWithEmail = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || emailBusy) return;

    setEmailBusy(true);
    setEmailSent(false);
    setError(null);
    const requestedNext = new URLSearchParams(window.location.search).get("next");
    const next = requestedNext && requestedNext.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : "/painel";
    const { error: emailError } = await getSupabase().auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        shouldCreateUser: mode === "signup",
      },
    });
    setEmailBusy(false);
    if (emailError) {
      setError(
        mode === "signin" && /signups? not allowed|user not found/i.test(emailError.message)
          ? "Não encontramos uma conta com esse e-mail. Use Criar conta para começar."
          : emailError.message
      );
      return;
    }
    setEmailSent(true);
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
              className="pointer-events-none absolute left-1/2 top-[6%] -translate-x-1/2 whitespace-nowrap font-semibold uppercase tracking-[0.15em] text-abyss"
              style={{ fontSize: 40 }}
            >
              <TypewriterWelcome />
            </span>
          </div>
        </div>

        {/* direita: autenticação */}
        <div className="w-full max-w-sm rounded-3xl border border-abyss/10 bg-white p-5 shadow-[0_24px_70px_rgba(11,27,48,0.08)] sm:p-7">
          <h1 className="text-center text-[25px] font-semibold leading-tight tracking-tight text-abyss">
            {mode === "signin" ? "Que bom ter você de volta" : "Crie seu segundo cérebro"}
          </h1>
          <p className="mt-2 text-center text-[12px] leading-relaxed text-abyss/50">
            {mode === "signin" ? "Entre para continuar de onde parou." : "Comece gratuitamente, sem cadastrar cartão."}
          </p>

          <div className="mt-6 grid grid-cols-2 rounded-xl bg-abyss/[0.05] p-1">
            <button
              type="button"
              onClick={() => { setMode("signin"); setEmailSent(false); setError(null); }}
              className={`rounded-lg px-3 py-2 text-[12px] font-medium transition-all ${mode === "signin" ? "bg-white text-abyss shadow-sm" : "text-abyss/55"}`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => { setMode("signup"); setEmailSent(false); setError(null); }}
              className={`rounded-lg px-3 py-2 text-[12px] font-medium transition-all ${mode === "signup" ? "bg-white text-abyss shadow-sm" : "text-abyss/55"}`}
            >
              Criar conta
            </button>
          </div>

          <form className="mt-4" onSubmit={continueWithEmail}>
            <label htmlFor="auth-email" className="font-mono text-[9px] uppercase tracking-[0.18em] text-abyss/50">
              E-mail
            </label>
            <div className="mt-1.5 flex h-12 items-center gap-3 rounded-xl border border-abyss/15 px-3.5 transition-colors focus-within:border-abyss/40">
              <Mail className="h-4 w-4 shrink-0 text-abyss/60" strokeWidth={1.8} />
              <input
                id="auth-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => { setEmail(event.target.value); setEmailSent(false); }}
                placeholder="voce@exemplo.com"
                className="min-w-0 flex-1 bg-transparent text-[13px] text-abyss outline-none placeholder:text-abyss/30"
              />
              {emailSent && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" strokeWidth={2.2} />}
            </div>
            <Button
              type="submit"
              disabled={emailBusy || busy !== null || !email.trim()}
              className="mt-3 h-12 w-full rounded-xl bg-abyss text-[13px] font-semibold text-white hover:bg-abyss/90"
            >
              {emailBusy ? "Enviando…" : "Continuar com e-mail"}
            </Button>
          </form>

          {emailSent && (
            <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center text-[12px] leading-relaxed text-emerald-800">
              Enviamos um link seguro para <strong>{email.trim()}</strong>. Confira sua caixa de entrada.
            </p>
          )}

          <div className="my-6 flex items-center gap-3 text-[10px] uppercase tracking-widest text-abyss/35">
            <span className="h-px flex-1 bg-abyss/10" />
            ou continue com
            <span className="h-px flex-1 bg-abyss/10" />
          </div>

          <div className="flex items-center justify-center gap-3">
            {PROVIDERS.map((provider) => {
              const Icon = provider.Icon;
              const disabled = busy !== null || emailBusy || provider.soon;
              return (
                <button
                  key={provider.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => !provider.soon && signInWith(provider.id, provider.scopes)}
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-abyss/15 bg-white text-abyss transition-all hover:-translate-y-0.5 hover:border-abyss/35 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                  aria-label={provider.soon ? `${provider.label} em breve` : `Continuar com ${provider.label}`}
                  title={provider.soon ? `${provider.label} estará disponível após a integração` : `Continuar com ${provider.label}`}
                >
                  {busy === provider.id ? <span className="animate-pulse">…</span> : <Icon size={20} />}
                </button>
              );
            })}
          </div>

          <p className="mt-5 text-center text-[10px] leading-relaxed text-abyss/40">
            Ao continuar, você concorda com os <Link href="/termos" className="underline hover:text-abyss">Termos</Link> e a <Link href="/privacidade" className="underline hover:text-abyss">Política de Privacidade</Link>.
          </p>

          {error && (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-center text-[11px] leading-relaxed text-red-700">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
