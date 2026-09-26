"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  Cpu,
  FileCode2,
  GitBranch,
  Layers,
  Snowflake,
  Sparkles,
  Zap,
} from "lucide-react";
import {
  ChatGPTLogo,
  ClaudeLogo,
  CopilotLogo,
  CortexLogo,
  CursorLogo,
  GeminiLogo,
} from "@/components/saas/AiLogos";
import { useSession } from "@/components/saas/SessionProvider";

// Paleta clara pra landing — light-first, com hero dark pra impacto.
const LIGHT = {
  bg: "#F7FAFD",
  fg: "#0B1B30",
  dim: "#5A6B85",
  accent: "#0EA5CF",
  aurora: "#0FB39A",
  border: "#DFE8F2",
  card: "#FFFFFF",
} as const;

const DARK = {
  bg: "#050E1A",
  fg: "#EBF7FF",
  dim: "#8199B0",
  accent: "#5CE6FF",
  aurora: "#99FFDD",
  border: "rgba(92,230,255,0.15)",
} as const;

type Plan = "monthly" | "annual";

export default function LandingPage() {
  const router = useRouter();
  const { session, loading } = useSession();
  const [year, setYear] = useState<number | null>(null);
  const [plan, setPlan] = useState<Plan>("annual");
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  // Autenticado → vai direto pro painel.
  useEffect(() => {
    if (!loading && session) router.replace("/painel");
  }, [loading, session, router]);

  const subscribe = async () => {
    if (!session) {
      router.push(`/login?next=${encodeURIComponent(`/?plan=${plan}&checkout=1`)}`);
      return;
    }
    setChecking(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const json = await res.json();
      if (!res.ok || !json.url) {
        alert(json.error ?? "Não consegui abrir o checkout.");
        return;
      }
      window.location.href = json.url;
    } finally {
      setChecking(false);
    }
  };

  // Autocontinuar checkout depois do login (?plan=annual&checkout=1)
  useEffect(() => {
    if (loading || !session) return;
    const q = new URLSearchParams(window.location.search);
    if (q.get("checkout") !== "1") return;
    const p = q.get("plan");
    if (p === "monthly" || p === "annual") {
      setPlan(p);
      subscribe();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, session]);

  return (
    <div className="min-h-[100dvh]" style={{ background: LIGHT.bg, color: LIGHT.fg }}>
      {/* Nav */}
      <header
        className="sticky top-0 z-40 border-b backdrop-blur-md"
        style={{ background: `${LIGHT.bg}dd`, borderColor: LIGHT.border }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Snowflake className="h-6 w-6" strokeWidth={1.8} style={{ color: LIGHT.accent }} />
            <span className="text-[15px] font-semibold tracking-tight">BrainFrost</span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="#pricing"
              className="hidden text-[13px] font-medium hover:opacity-70 md:inline"
              style={{ color: LIGHT.dim }}
            >
              Preços
            </a>
            <a
              href="#faq"
              className="hidden text-[13px] font-medium hover:opacity-70 md:inline"
              style={{ color: LIGHT.dim }}
            >
              FAQ
            </a>
            <Link
              href="/login"
              className="rounded-full border px-4 py-2 text-[13px] font-medium hover:brightness-95"
              style={{ borderColor: LIGHT.border, color: LIGHT.fg }}
            >
              Entrar
            </Link>
            <Link
              href="/login"
              className="hidden rounded-full px-4 py-2 text-[13px] font-medium sm:inline-flex sm:items-center sm:gap-1.5"
              style={{ background: LIGHT.fg, color: LIGHT.bg }}
            >
              Começar grátis
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.4} />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero — dark pra impacto */}
      <section
        className="relative overflow-hidden"
        style={{ background: DARK.bg, color: DARK.fg }}
      >
        <div
          className="pointer-events-none absolute -right-32 -top-32 h-[560px] w-[560px] rounded-full blur-3xl"
          style={{ background: DARK.accent, opacity: 0.15 }}
        />
        <div
          className="pointer-events-none absolute -bottom-40 -left-24 h-[520px] w-[520px] rounded-full blur-3xl"
          style={{ background: DARK.aurora, opacity: 0.12 }}
        />

        <div className="relative mx-auto max-w-4xl px-6 py-24 md:py-32">
          <div
            className="mb-6 inline-flex items-center gap-2 rounded-full border px-3 py-1"
            style={{ borderColor: DARK.border, color: DARK.dim }}
          >
            <span
              className="h-2 w-2 animate-pulse rounded-full"
              style={{ background: DARK.aurora }}
            />
            <span className="font-mono text-[11px] uppercase tracking-widest">
              Beta gratuito — por tempo limitado
            </span>
          </div>

          <h1 className="text-[44px] font-semibold leading-[1.02] tracking-tight md:text-[68px]">
            Seu contexto de trabalho
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: `linear-gradient(to right, ${DARK.accent}, ${DARK.aurora})` }}
            >
              vai com você
              <br />
              pra qualquer IA.
            </span>
          </h1>

          <p
            className="mt-8 max-w-2xl text-[17px] leading-relaxed md:text-[19px]"
            style={{ color: DARK.dim }}
          >
            O BrainFrost é um segundo cérebro para desenvolvedores. Ele aprende como você escreve
            seus códigos, seus padrões, suas decisões de arquitetura e devolve isso empacotado no formato
            que <span style={{ color: DARK.fg }}>Claude Code</span>,{" "}
            <span style={{ color: DARK.fg }}>Cursor</span>,{" "}
            <span style={{ color: DARK.fg }}>GitHub Copilot</span> e outras IAs entendem.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/login"
              className="group inline-flex items-center gap-2 rounded-full px-6 py-3 text-[15px] font-medium transition-transform hover:scale-[1.02]"
              style={{ background: DARK.accent, color: DARK.bg }}
            >
              Teste agora — é grátis
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.5} />
            </Link>
            <a
              href="#como-funciona"
              className="text-[14px] font-medium hover:opacity-80"
              style={{ color: DARK.dim }}
            >
              Como funciona ↓
            </a>
          </div>

          <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-3">
            <p
              className="font-mono text-[10px] uppercase tracking-[0.28em]"
              style={{ color: DARK.dim }}
            >
              funciona com:
            </p>
            {[
              { Icon: ClaudeLogo, label: "Claude" },
              { Icon: CursorLogo, label: "Cursor" },
              { Icon: CopilotLogo, label: "Copilot" },
              { Icon: CortexLogo, label: "Cortex" },
              { Icon: GeminiLogo, label: "Gemini" },
              { Icon: ChatGPTLogo, label: "ChatGPT" },
            ].map(({ Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-1.5 opacity-70"
                style={{ color: DARK.dim }}
              >
                <Icon size={16} />
                <span className="text-[12px] font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="mx-auto max-w-5xl px-6 py-24">
        <p
          className="font-bold text-[12px] uppercase tracking-[0.1em]"
          style={{ color: LIGHT.accent }}
        >
          Como funciona
        </p>
        <h2 className="mt-3 text-[32px] font-semibold leading-tight tracking-tight md:text-[42px]">
          Você trabalha e ele aprende sobre você.
        </h2>
        <p className="mt-4 max-w-2xl text-[16px]" style={{ color: LIGHT.dim }}>
          Três etapas simples. Nada de configurar prompts do zero toda vez
          que abrir uma IA nova.
        </p>

        <div className="mt-14 grid gap-8 md:grid-cols-3">
          <Step
            n={1}
            Icon={GitBranch}
            title="Aceita quase qualquer coisa"
            body="Você pode colar um trecho de código ou escolher um repo do seu GitHub ou até carregar um ZIP. 
            O extrator lê READMEs, CLAUDE.md, docs e comentários, nunca segredos e senhas."
          />
          <Step
            n={2}
            Icon={Sparkles}
            title="A IA extrai seus padrões"
            body="Roda no seu navegador (grátis) ou com sua chave Claude/Gemini. Devolve regras técnicas: como você escreve, como commita, o que evita e o que lembra."
          />
          <Step
            n={3}
            Icon={Layers}
            title="Você aprova e o cérebro cresce"
            body="Cada sugestão vira uma camada. Você aceita, edita ou rejeita. O cérebro é seu, você controla o que ele aprende e decide o que incluir."
          />
        </div>
      </section>

      {/* Diferenciais */}
      <section className="border-y" style={{ background: LIGHT.card, borderColor: LIGHT.border }}>
        <div className="mx-auto max-w-5xl px-6 py-24">
          <p
            className="font-bold text-[12px] uppercase tracking-[0.1em]"
            style={{ color: LIGHT.accent }}
          >
            Por que isso importa
          </p>
          <h2 className="mt-3 text-[32px] font-semibold leading-tight tracking-tight md:text-[42px]">
            Toda IA nova começa do zero...
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: `linear-gradient(to right, ${LIGHT.accent}, ${LIGHT.aurora})` }}
            >
              A sua começa te conhecendo!
            </span>
          </h2>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <Feature
              Icon={Cpu}
              title="Grátis pra sempre com LLM local"
              body="Rodamos Llama 3.2 ou Qwen 2.5 direto no navegador. Zero rede, zero chave, zero custo."
            />
            <Feature
              Icon={Zap}
              title="Claude / Gemini se quiser turbo"
              body="Você cola sua chave uma vez, ela fica criptografada antes de entrar no banco. Nem a gente vê. Análises em ~5s no Sonnet 4.6."
            />
            <Feature
              Icon={FileCode2}
              title="Export pra qualquer IA"
              body="Um clique e o cérebro vira um markdown que qualquer IA entende. Claude, Gemini, Copilot, ChatGPT, Cursor, Cortex… e até o seu próprio LLM local."
            />
            <Feature
              Icon={GitBranch}
              title="CLI que injeta no repo"
              body="Três comandos, ele puxa suas informações e coloca no CLAUDE.md do repo em qualquer máquina. Low-Code."
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-5xl px-6 py-24">
        <div className="text-center">
          <p
            className="font-bold text-[12px] uppercase tracking-[0.1em]"
            style={{ color: LIGHT.accent }}
          >
            Preços
          </p>
          <h2 className="mt-3 text-[32px] font-semibold leading-tight tracking-tight md:text-[42px]">
            Escolha seu plano:
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[16px]" style={{ color: LIGHT.dim }}>
            Estamos em beta gratuito.
            Depois do lançamento oficial, o Pro vai custar <br /> R$ 10/mês — quem
            entrar agora <span style={{ color: LIGHT.fg }}>garante 1 ano grátis</span>.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {/* Free */}
          <div
            className="rounded-3xl border p-8"
            style={{ background: LIGHT.card, borderColor: LIGHT.border }}
          >
            <p className="font-mono text-[12px] uppercase tracking-[0.1em]" style={{ color: LIGHT.dim }}>
              Free
            </p>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-[42px] font-bold">R$0</span>
              <span style={{ color: LIGHT.dim }}>/pra sempre</span>
            </div>
            <p className="mt-3 text-[14px]" style={{ color: LIGHT.dim }}>
              Pra experimentar sem cadastrar cartão
            </p>

            <ul className="mt-8 space-y-3 text-[14px]">
              <Tick label="LLM local (WebLLM) ilimitada" />
              <Tick label="Até 3 importações por mês" />
              <Tick label="Até 50 camadas no cérebro" />
              <Tick label="Export pra qualquer IA" />
              <Tick label="CLI bfrost" />
            </ul>
            <br />

            <Link
              href="/login"
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-full border px-6 py-3 text-[14px] font-medium hover:brightness-95"
              style={{ borderColor: LIGHT.border, color: LIGHT.fg }}
            >
              Começar grátis
            </Link>
          </div>

          {/* Pro — destaque */}
          <div
            className="relative rounded-3xl border-2 p-8 shadow-xl"
            style={{
              background: `linear-gradient(160deg, ${LIGHT.card} 0%, #ECF9FE 100%)`,
              borderColor: LIGHT.accent,
              boxShadow: `0 40px 80px -40px ${LIGHT.accent}80`,
            }}
          >
            <div className="absolute -top-3 right-6 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-white" style={{ background: LIGHT.accent }}>
              RECOMENDADO
            </div>
            <p className="font-mono text-[12px] uppercase tracking-[0.1em]" style={{ color: LIGHT.accent }}>
              Pro
            </p>

            <div
              className="mt-3 inline-flex rounded-full border p-1"
              style={{ borderColor: LIGHT.border, background: LIGHT.bg }}
            >
              {(["monthly", "annual"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPlan(p)}
                  className="rounded-full px-4 py-1.5 text-[12px] font-medium transition-colors"
                  style={{
                    background: plan === p ? LIGHT.fg : "transparent",
                    color: plan === p ? LIGHT.bg : LIGHT.dim,
                  }}
                >
                  {p === "monthly" ? "Mensal" : "Anual · 2 meses grátis"}
                </button>
              ))}
            </div>

            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-[42px] font-bold">
                {plan === "monthly" ? "R$10" : "R$100"}
              </span>
              <span style={{ color: LIGHT.dim }}>
                {plan === "monthly" ? "/mês" : "/ano"}
              </span>
            </div>
            <p className="mt-3 text-[14px]" style={{ color: LIGHT.dim }}>
              {plan === "monthly"
                ? "R$10/mês, cancela quando quiser."
                : "R$100/ano — pague 10, use 12."}
            </p>

            <ul className="mt-8 space-y-3 text-[14px]">
              <Tick label="Tudo do Free +" bold />
              <Tick label="Claude, Gemini e local, todos" />
              <Tick label="Importações ilimitadas" />
              <Tick label="Camadas ilimitadas" />
              <Tick label="Import direto do GitHub (public + private)" />
              <Tick label="Reprocessar sugestão com outra LLM" />
            </ul>

            <button
              onClick={subscribe}
              disabled={checking}
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-[14px] font-medium hover:scale-[1.02] disabled:opacity-60 disabled:hover:scale-100"
              style={{ background: LIGHT.fg, color: LIGHT.bg }}
            >
              {checking ? "Abrindo checkout…" : `Assinar ${plan === "monthly" ? "mensal" : "anual"}`}
              <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
            </button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section
        id="faq"
        className="border-t"
        style={{ background: LIGHT.card, borderColor: LIGHT.border }}
      >
        <div className="mx-auto max-w-3xl px-6 py-24">
          <p
            className="font-bold text-[12px] uppercase tracking-[0.1em]"
            style={{ color: LIGHT.accent }}
          >
            Perguntas comuns
          </p>
          <h2 className="mt-3 text-[32px] font-semibold leading-tight tracking-tight md:text-[42px]">
            Antes de entrar…
          </h2>

          <div className="mt-10 space-y-1">
            <Faq q="Vocês veem meu código?">
              Não. Quando você usa a LLM local, nada sai do seu navegador — 100% offline depois do download do modelo. Quando você usa Claude/Gemini, o texto vai direto pra Anthropic/Google usando sua chave; o BrainFrost só orquestra.
            </Faq>
            <Faq q="Vocês guardam a minha chave?">
              Guardamos criptografada com AES-256-GCM. A chave-mestra fica em variável de ambiente do servidor; a chave dele só é usada quando você dispara uma análise. Nunca aparece no cliente.
            </Faq>
            <Faq q="E se eu não confiar em rodar LLM no navegador?">
              Sem problema. Você entra com Claude ou Gemini com sua chave e o LLM local vira só um botão que você nunca clica. O cérebro funciona igual.
            </Faq>
            <Faq q="Serve pra empresas?">
              Ainda não. No beta o foco é dev solo. Multi-tenant, org, RBAC e SSO vem depois — se quiser priorizar, manda um email.
            </Faq>
            <Faq q="Como funciona o preço vitalício?">
              Quem cadastrar no beta grátis não paga quando o plano Pro sair. Simples assim. Vai continuar sendo o que você tá vendo e muito mais por R$0.
            </Faq>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section
        className="relative overflow-hidden"
        style={{ background: DARK.bg, color: DARK.fg }}
      >
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full blur-3xl"
          style={{ background: DARK.accent, opacity: 0.15 }}
        />
        <div
          className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full blur-3xl"
          style={{ background: DARK.aurora, opacity: 0.12 }}
        />

        <div className="relative mx-auto max-w-4xl px-6 py-24 text-center md:py-32">
          <h2 className="text-[36px] font-semibold leading-tight tracking-tight md:text-[54px]">
            Leva menos de 30 segundos.
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: `linear-gradient(to right, ${DARK.accent}, ${DARK.aurora})` }}
            >
              Vai perder o beta gratis?
            </span>
          </h2>
          <Link
            href="/login"
            className="mt-10 inline-flex items-center gap-2 rounded-full px-8 py-4 text-[16px] font-semibold hover:scale-[1.02]"
            style={{ background: DARK.accent, color: DARK.bg }}
          >
            Entrar com Google
            <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
          </Link>
          <p className="mt-4 font-mono text-[11px] uppercase tracking-widest" style={{ color: DARK.dim }}>
            sem cartão · sem configuração · offline funciona · exporta pra qualquer IA
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t" style={{ background: LIGHT.card, borderColor: LIGHT.border }}>
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 py-8 md:flex-row md:gap-4">
          <div className="flex items-center gap-2 text-[13px]" style={{ color: LIGHT.dim }}>
            <Snowflake className="h-4 w-4" strokeWidth={1.8} style={{ color: LIGHT.accent }} />
            <span>BrainFrost {year ?? ""}</span>
          </div>
          
          <div className="text-center text-[10px] md:text-left" style={{ color: LIGHT.dim }}>
            desenvolvido por um dev cansado. se encontrar um problema,{" "}
            <a
              href="https://github.com/caua-ferreira/brainfrost/issues/new"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:opacity-80"
              style={{ color: LIGHT.accent }}
            >
              abra uma issue
            </a>
          </div>

          <div className="flex items-center gap-6 text-[13px]" style={{ color: LIGHT.dim }}>
            <a href="https://github.com/caua-ferreira/brainfrost" target="_blank" rel="noreferrer" className="hover:opacity-70">
              GitHub
            </a>
            <Link href="/login" className="hover:opacity-70">
              Entrar
            </Link>
            <a href="mailto:caua.fer@gmail.com" className="hover:opacity-70">
              Contato
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Step({
  n,
  Icon,
  title,
  body,
}: {
  n: number;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  body: string;
}) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full font-mono text-[11px]"
          style={{ background: `${LIGHT.accent}18`, color: LIGHT.accent }}
        >
          0{n}
        </span>
        <Icon className="h-5 w-5" strokeWidth={1.8} />
      </div>
      <h3 className="text-[17px] font-semibold leading-tight">{title}</h3>
      <p className="mt-2 text-[14px] leading-relaxed" style={{ color: LIGHT.dim }}>
        {body}
      </p>
    </div>
  );
}

function Feature({
  Icon,
  title,
  body,
}: {
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  body: string;
}) {
  return (
    <div
      className="rounded-2xl border p-6"
      style={{ background: LIGHT.bg, borderColor: LIGHT.border }}
    >
      <div
        className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl"
        style={{ background: `${LIGHT.accent}15`, color: LIGHT.accent }}
      >
        <Icon className="h-5 w-5" strokeWidth={2} />
      </div>
      <h3 className="text-[16px] font-semibold">{title}</h3>
      <p className="mt-2 text-[14px] leading-relaxed" style={{ color: LIGHT.dim }}>
        {body}
      </p>
    </div>
  );
}

import React from "react"; // Adicione o import do React se ainda não tiver

function Tick({ label, bold }: { label: React.ReactNode; bold?: boolean }) {
  return (
    <li className="flex items-start gap-2.5">
      <Check className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.4} style={{ color: LIGHT.accent }} />
      <span className={bold ? "font-semibold" : ""}>{label}</span>
    </li>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b py-4" style={{ borderColor: LIGHT.border }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 text-left"
      >
        <span className="text-[15px] font-medium md:text-[16px]">{q}</span>
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[16px] transition-transform"
          style={{
            background: `${LIGHT.accent}12`,
            color: LIGHT.accent,
            transform: open ? "rotate(45deg)" : "rotate(0deg)",
          }}
        >
          +
        </span>
      </button>
      {open && (
        <p className="mt-3 text-[14px] leading-relaxed" style={{ color: LIGHT.dim }}>
          {children}
        </p>
      )}
    </div>
  );
}
