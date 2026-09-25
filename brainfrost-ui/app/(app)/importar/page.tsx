"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileArchive, GitBranch, ShieldCheck, Type } from "lucide-react";
import { useSaas } from "@/lib/saas-mock";
import { palette } from "@/lib/saas-theme";
import { getSupabase } from "@/lib/supabase/client";

const SANITIZED = [
  ".env*", "*.pem", "*.key", "id_rsa*", "credentials.json",
  "service-account*.json", "PRIVATE KEY", "sk-*", "ghp_*", "AKIA*",
  "binários", "PII em seeds",
];

type Tab = "text" | "zip" | "github";

export default function ImportarPage() {
  const theme = useSaas((s) => s.theme);
  const c = palette(theme);
  const [tab, setTab] = useState<Tab>("text");

  return (
    <div className="relative h-full overflow-y-auto overflow-x-hidden" style={{ background: c.bg }}>
      <div
        className="pointer-events-none absolute -right-32 top-0 h-[520px] w-[520px] rounded-full blur-3xl"
        style={{ background: c.accent, opacity: 0.10 }}
      />
      <div
        className="pointer-events-none absolute -left-32 top-72 h-[520px] w-[520px] rounded-full blur-3xl"
        style={{ background: c.aurora, opacity: 0.07 }}
      />

      <div className="relative mx-auto max-w-3xl px-6 py-16 md:py-20">
        <h1
          className="text-[42px] font-semibold leading-[1.02] tracking-tight md:text-[56px]"
          style={{ color: c.text }}
        >
          Deixa o cofre
          <br />
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: `linear-gradient(to right, ${c.accent}, ${c.aurora})` }}
          >
            aprender contigo.
          </span>
        </h1>
        <p className="mt-6 max-w-lg text-[15px] leading-relaxed" style={{ color: c.dim }}>
          Suba um repositório ou um trecho. O extrator lê e propõe padrões — nada entra
          no cofre sem sua aprovação.
        </p>

        <div className="mt-10 flex gap-2 border-b" style={{ borderColor: c.borderSoft }}>
          <TabTrigger c={c} icon={<Type className="h-3.5 w-3.5" strokeWidth={2} />} active={tab === "text"} onClick={() => setTab("text")}>
            Colar texto
          </TabTrigger>
          <TabTrigger c={c} icon={<FileArchive className="h-3.5 w-3.5" strokeWidth={2} />} active={tab === "zip"} onClick={() => setTab("zip")}>
            Arquivo ZIP
          </TabTrigger>
          <TabTrigger c={c} icon={<GitBranch className="h-3.5 w-3.5" strokeWidth={2} />} disabled>
            GitHub · em breve
          </TabTrigger>
        </div>

        <div className="mt-6">
          {tab === "text" && <TextPanel c={c} />}
          {tab === "zip" && <ZipPanel c={c} />}
        </div>

        <div className="mt-16 border-t pt-8" style={{ borderColor: c.borderSoft }}>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" strokeWidth={1.8} style={{ color: c.aurora }} />
            <p className="font-mono text-[11px] uppercase tracking-[0.3em]" style={{ color: c.dim }}>
              O que o extrator nunca guarda
            </p>
          </div>
          <div className="mt-5 flex flex-wrap gap-1.5">
            {SANITIZED.map((s) => (
              <span
                key={s}
                className="rounded-full border px-2.5 py-0.5 font-mono text-[10px]"
                style={{ borderColor: c.borderSoft, color: c.dim }}
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TabTrigger({
  c,
  icon,
  active,
  disabled,
  onClick,
  children,
}: {
  c: ReturnType<typeof palette>;
  icon: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="relative flex items-center gap-2 px-4 pb-3 pt-2 text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40"
      style={{ color: active ? c.text : c.dim }}
    >
      {icon}
      {children}
      {active && (
        <span
          className="absolute inset-x-2 -bottom-[1px] h-0.5 rounded-t"
          style={{ background: c.accent }}
        />
      )}
    </button>
  );
}

function TextPanel({ c }: { c: ReturnType<typeof palette> }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const disabled = text.trim().length < 20 || busy;

  const submit = async () => {
    setBusy(true);
    const { data, error } = await getSupabase()
      .from("imports")
      .insert({
        source: "text",
        label: `Texto colado · ${text.length} caracteres`,
        file_count: 1,
        raw_text: text,
      })
      .select("id")
      .single();
    setBusy(false);
    if (error || !data) {
      alert(error?.message ?? "Não foi possível criar o import.");
      return;
    }
    router.push(`/analisando/${data.id}`);
  };

  return (
    <div className="rounded-2xl border p-5" style={{ background: c.card, borderColor: c.border }}>
      <label className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: c.dim }}>
        Conteúdo
      </label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Cole aqui um markdown, um CONTEXTO.md, ou um pedaço de código com comentários que descrevem regras…"
        className="mt-3 w-full resize-y rounded-xl border p-3 font-mono text-[13px] leading-relaxed outline-none placeholder:opacity-50 focus:ring-2"
        style={{
          minHeight: 240,
          background: c.bgSoft,
          borderColor: c.borderSoft,
          color: c.text,
        }}
      />
      <div className="mt-4 flex items-center justify-between">
        <span className="font-mono text-[11px]" style={{ color: c.dim }}>
          {text.length.toLocaleString("pt-BR")} caracteres
        </span>
        <button
          disabled={disabled}
          className="rounded-full px-6 py-2.5 text-[13px] font-medium transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: c.accent, color: c.onAccent }}
          onClick={submit}
        >
          {busy ? "…" : "Analisar"}
        </button>
      </div>
    </div>
  );
}

function ZipPanel({ c }: { c: ReturnType<typeof palette> }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!file) return;
    setBusy(true);
    const { data, error } = await getSupabase()
      .from("imports")
      .insert({
        source: "zip",
        label: file.name,
        file_count: Math.max(1, Math.round(file.size / 4096)),
      })
      .select("id")
      .single();
    setBusy(false);
    if (error || !data) {
      alert(error?.message ?? "Não foi possível criar o import.");
      return;
    }
    router.push(`/analisando/${data.id}`);
  };

  return (
    <div className="rounded-2xl border p-5" style={{ background: c.card, borderColor: c.border }}>
      <div
        className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-14 text-center"
        style={{ background: c.bgSoft, borderColor: c.border }}
      >
        <FileArchive className="h-10 w-10" strokeWidth={1.4} style={{ color: c.accent }} />
        <p className="text-[15px]" style={{ color: c.text }}>
          {file ? file.name : "Solte um .zip do repositório aqui"}
        </p>
        <p className="max-w-sm font-mono text-[11px]" style={{ color: c.dim }}>
          {file
            ? `${(file.size / 1024 / 1024).toFixed(2)} MB`
            : "ou clique para escolher — segredos e binários são descartados antes de qualquer análise"}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".zip"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <button
          className="mt-3 rounded-full border px-5 py-2 text-[12px] font-medium transition-colors"
          style={{ borderColor: c.border, color: c.text }}
          onClick={() => inputRef.current?.click()}
        >
          {file ? "Trocar arquivo" : "Escolher arquivo"}
        </button>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          disabled={!file || busy}
          className="rounded-full px-6 py-2.5 text-[13px] font-medium transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: c.accent, color: c.onAccent }}
          onClick={submit}
        >
          {busy ? "…" : "Analisar"}
        </button>
      </div>
    </div>
  );
}
