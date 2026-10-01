"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileArchive, FileText, FolderOpen, GitBranch, Lock, Search, ShieldCheck, Type } from "lucide-react";
import { useSaas } from "@/lib/saas-mock";
import { palette } from "@/lib/saas-theme";
import { getSupabase } from "@/lib/supabase/client";
import { useSession } from "@/components/saas/SessionProvider";
import { useBilling } from "@/components/saas/BillingProvider";
import { buildRawTextFromFiles, fetchContextFiles, listRepos, type Repo } from "@/lib/github";
import { LOCAL_FILE_ACCEPT, readLocalTextFiles, readZipTextFiles } from "@/lib/import-files";
import { announceNavigation } from "@/components/shared/NavigationLoader";

const SANITIZED = [
  ".env*", "*.pem", "*.key", "id_rsa*", "credentials.json",
  "service-account*.json", "PRIVATE KEY", "sk-*", "ghp_*", "AKIA*",
  "binários", "PII em seeds",
];

type Tab = "text" | "files" | "zip" | "github";

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

async function createImport(input: {
  source: "text" | "files" | "zip" | "github";
  label: string;
  file_count: number;
  raw_text: string;
}) {
  const response = await fetch("/api/imports", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.id) {
    throw new Error(body.error ?? "Não foi possível criar o import.");
  }
  return body.id as string;
}

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
          Deixa o cérebro
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
          no cérebro sem sua aprovação.
        </p>

        <div className="mt-10 flex gap-2 border-b" style={{ borderColor: c.borderSoft }}>
          <TabTrigger c={c} icon={<Type className="h-3.5 w-3.5" strokeWidth={2} />} active={tab === "text"} onClick={() => setTab("text")}>
            Colar texto
          </TabTrigger>
          <TabTrigger c={c} icon={<FileText className="h-3.5 w-3.5" strokeWidth={2} />} active={tab === "files"} onClick={() => setTab("files")}>
            Arquivos
          </TabTrigger>
          <TabTrigger c={c} icon={<FileArchive className="h-3.5 w-3.5" strokeWidth={2} />} active={tab === "zip"} onClick={() => setTab("zip")}>
            Arquivo ZIP
          </TabTrigger>
          <TabTrigger c={c} icon={<GitBranch className="h-3.5 w-3.5" strokeWidth={2} />} active={tab === "github"} onClick={() => setTab("github")}>
            GitHub
          </TabTrigger>
        </div>

        <div className="mt-6">
          {tab === "text" && <TextPanel c={c} />}
          {tab === "files" && <FilesPanel c={c} />}
          {tab === "zip" && <ZipPanel c={c} />}
          {tab === "github" && <GitHubPanel c={c} />}
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

function FilesPanel({ c }: { c: ReturnType<typeof palette> }) {
  const router = useRouter();
  const filesInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    folderInputRef.current?.setAttribute("webkitdirectory", "");
    folderInputRef.current?.setAttribute("directory", "");
  }, []);

  const chooseFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(Array.from(event.target.files ?? []));
  };

  const submit = async () => {
    if (files.length === 0 || busy) return;
    setBusy(true);
    try {
      const contextFiles = await readLocalTextFiles(files);
      if (contextFiles.length === 0) {
        throw new Error("Nenhum arquivo de texto compatível foi encontrado.");
      }
      const rawText = buildRawTextFromFiles("arquivos locais", contextFiles);
      const id = await createImport({
        source: "files",
        label: `Arquivos locais · ${contextFiles.length} arquivos`,
        file_count: contextFiles.length,
        raw_text: rawText,
      });
      announceNavigation();
      router.push(`/analisando/${id}`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Não foi possível ler os arquivos.");
    } finally {
      setBusy(false);
    }
  };

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);

  return (
    <div className="rounded-2xl border p-5" style={{ background: c.card, borderColor: c.border }}>
      <div
        className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center"
        style={{ background: c.bgSoft, borderColor: c.border }}
      >
        <FolderOpen className="h-10 w-10" strokeWidth={1.4} style={{ color: c.accent }} />
        <p className="text-[15px]" style={{ color: c.text }}>
          {files.length > 0 ? `${files.length} arquivo(s) selecionado(s)` : "Escolha arquivos ou uma pasta"}
        </p>
        <p className="max-w-md font-mono text-[11px] leading-relaxed" style={{ color: c.dim }}>
          Markdown, texto, código e arquivos de configuração. Ignoramos binários, segredos,
          node_modules e arquivos acima do limite.
        </p>
        <input
          ref={filesInputRef}
          type="file"
          multiple
          accept={LOCAL_FILE_ACCEPT}
          className="hidden"
          onChange={chooseFiles}
        />
        <input
          ref={folderInputRef}
          type="file"
          multiple
          accept={LOCAL_FILE_ACCEPT}
          className="hidden"
          onChange={chooseFiles}
        />
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            className="rounded-full border px-5 py-2 text-[12px] font-medium transition-colors"
            style={{ borderColor: c.border, color: c.text }}
            onClick={() => filesInputRef.current?.click()}
          >
            Escolher arquivos
          </button>
          <button
            type="button"
            className="rounded-full border px-5 py-2 text-[12px] font-medium transition-colors"
            style={{ borderColor: c.border, color: c.text }}
            onClick={() => folderInputRef.current?.click()}
          >
            Escolher pasta
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="font-mono text-[11px]" style={{ color: c.dim }}>
          {files.length > 0 ? `${(totalSize / 1024).toFixed(1)} KB selecionados` : "até 50 arquivos e 200 KB de texto"}
        </span>
        <button
          disabled={files.length === 0 || busy}
          className="rounded-full px-6 py-2.5 text-[13px] font-medium transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: c.accent, color: c.onAccent }}
          onClick={submit}
        >
          {busy ? "lendo…" : "Importar & analisar"}
        </button>
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
    try {
      const id = await createImport({
        source: "text",
        label: `Texto colado · ${text.length} caracteres`,
        file_count: 1,
        raw_text: text,
      });
      announceNavigation();
      router.push(`/analisando/${id}`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Não foi possível criar o import.");
    } finally {
      setBusy(false);
    }
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
  const [status, setStatus] = useState<string | null>(null);

  const submit = async () => {
    if (!file || busy) return;
    setBusy(true);
    setStatus("lendo arquivos do ZIP…");
    try {
      const contextFiles = await readZipTextFiles(file);
      const rawText = buildRawTextFromFiles(file.name, contextFiles);
      setStatus(`criando import com ${contextFiles.length} arquivos…`);
      const id = await createImport({
        source: "zip",
        label: file.name,
        file_count: contextFiles.length,
        raw_text: rawText,
      });
      announceNavigation();
      router.push(`/analisando/${id}`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Não foi possível ler o ZIP.");
    } finally {
      setBusy(false);
      setStatus(null);
    }
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
            ? formatFileSize(file.size)
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
        {status && <p className="mr-auto self-center font-mono text-[11px]" style={{ color: c.dim }}>{status}</p>}
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

function GitHubPanel({ c }: { c: ReturnType<typeof palette> }) {
  const router = useRouter();
  const { session } = useSession();
  const { isPro } = useBilling();
  const providerToken = session?.provider_token ?? null;

  const [repos, setRepos] = useState<Repo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState<Repo | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!providerToken) return;
    setLoading(true);
    listRepos(providerToken)
      .then((list) => setRepos(list))
      .catch((e) => setError(e instanceof Error ? e.message : "erro ao listar repos"))
      .finally(() => setLoading(false));
  }, [providerToken]);

  const reconnect = async () => {
    await getSupabase().auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/importar`,
        scopes: "read:user user:email repo",
      },
    });
  };

  const filtered = useMemo(() => {
    if (!repos) return [];
    const q = query.trim().toLowerCase();
    if (!q) return repos;
    return repos.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.full_name.toLowerCase().includes(q) ||
        (r.description ?? "").toLowerCase().includes(q)
    );
  }, [repos, query]);

  const submit = async () => {
    if (!chosen || !providerToken) return;
    setBusy(true);
    setStatus("Baixando arquivos de contexto…");
    try {
      const { files } = await fetchContextFiles(providerToken, chosen.full_name, chosen.default_branch);
      if (files.length === 0) {
        setBusy(false);
        setStatus(null);
        alert(
          `Nenhum arquivo de contexto encontrado (README.md, CLAUDE.md, CONTEXTO.md, docs/*.md…). Escolha outro repo.`
        );
        return;
      }
      setStatus(`Criando import com ${files.length} arquivos…`);
      const rawText = buildRawTextFromFiles(chosen.full_name, files);
      const id = await createImport({
        source: "github",
        label: chosen.full_name,
        file_count: files.length,
        raw_text: rawText,
      });
      setBusy(false);
      setStatus(null);
      announceNavigation();
      router.push(`/analisando/${id}`);
    } catch (e) {
      setBusy(false);
      setStatus(null);
      alert(e instanceof Error ? e.message : "Erro ao importar.");
    }
  };

  if (!isPro) {
    return (
      <div className="rounded-2xl border p-6 text-center" style={{ background: c.card, borderColor: c.border }}>
        <Lock className="mx-auto h-8 w-8" strokeWidth={1.6} style={{ color: c.accent }} />
        <p className="mt-3 text-[14px]" style={{ color: c.text }}>
          Importação pelo GitHub é um recurso Pro.
        </p>
        <p className="mx-auto mt-2 max-w-sm text-[12px]" style={{ color: c.dim }}>
          Faça upgrade para importar repositórios privados ou públicos diretamente para o cérebro.
        </p>
        <button
          onClick={() => router.push("/assinatura")}
          className="mt-4 rounded-full px-5 py-2 text-[13px] font-medium"
          style={{ background: c.accent, color: c.onAccent }}
        >
          Ver plano Pro
        </button>
      </div>
    );
  }

  if (!providerToken) {
    return (
      <div className="rounded-2xl border p-6 text-center" style={{ background: c.card, borderColor: c.border }}>
        <GitBranch className="mx-auto h-8 w-8" strokeWidth={1.6} style={{ color: c.accent }} />
        <p className="mt-3 text-[14px]" style={{ color: c.text }}>
          Precisa autorizar o GitHub para listar seus repositórios.
        </p>
        <p className="mt-2 max-w-sm mx-auto text-[12px]" style={{ color: c.dim }}>
          Faz login (ou reconecta) via GitHub. Vamos pedir escopo <code>repo</code> pra ler arquivos
          de contexto — nada é escrito no seu repo.
        </p>
        <button
          onClick={reconnect}
          className="mt-4 rounded-full px-5 py-2 text-[13px] font-medium"
          style={{ background: c.accent, color: c.onAccent }}
        >
          Conectar GitHub
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border p-5" style={{ background: c.card, borderColor: c.border }}>
      <div className="flex items-center gap-2 rounded-xl border px-3" style={{ background: c.bgSoft, borderColor: c.borderSoft }}>
        <Search className="h-4 w-4" strokeWidth={2} style={{ color: c.dim }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="filtrar repositórios…"
          className="h-11 flex-1 bg-transparent text-[13px] outline-none placeholder:opacity-50"
          style={{ color: c.text }}
        />
        {repos && (
          <span className="font-mono text-[11px]" style={{ color: c.dim }}>
            {filtered.length}/{repos.length}
          </span>
        )}
      </div>

      {loading && (
        <p className="mt-6 text-center font-mono text-[11px] uppercase tracking-widest" style={{ color: c.dim }}>
          buscando seus repositórios…
        </p>
      )}
      {error && (
        <div className="mt-4 rounded-md border border-red-400/40 bg-red-500/10 p-3 font-mono text-[11px] text-red-300">
          {error}
        </div>
      )}

      {repos && !loading && (
        <ul className="mt-4 max-h-[360px] divide-y overflow-y-auto rounded-lg border" style={{ borderColor: c.borderSoft }}>
          {filtered.map((r) => {
            const active = chosen?.id === r.id;
            return (
              <li key={r.id}>
                <button
                  onClick={() => setChosen(r)}
                  className="flex w-full items-start justify-between gap-4 px-4 py-3 text-left transition-colors"
                  style={{ background: active ? `${c.accent}12` : "transparent" }}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[14px] font-medium" style={{ color: c.text }}>
                        {r.full_name}
                      </span>
                      {r.private && <Lock className="h-3 w-3" strokeWidth={2} style={{ color: c.dim }} />}
                      {r.fork && (
                        <span className="rounded-full border px-1.5 py-0 font-mono text-[9px] uppercase tracking-widest" style={{ borderColor: c.borderSoft, color: c.dim }}>
                          fork
                        </span>
                      )}
                    </div>
                    {r.description && (
                      <p className="mt-0.5 truncate text-[12px]" style={{ color: c.dim }}>
                        {r.description}
                      </p>
                    )}
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-widest" style={{ color: c.dim }}>
                      {r.language ?? "—"} · {r.default_branch} · atualizado {new Date(r.updated_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
          {filtered.length === 0 && (
            <li className="p-6 text-center font-mono text-[11px] uppercase tracking-widest" style={{ color: c.dim }}>
              nada com esse filtro
            </li>
          )}
        </ul>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-[11px]" style={{ color: c.dim }}>
          {status ??
            (chosen
              ? `Vamos ler README, CLAUDE.md, CONTEXTO.md, .cursor/rules, docs/*.md (até 20 arquivos, 200 KB total)`
              : "Escolha um repo à esquerda.")}
        </p>
        <button
          disabled={!chosen || busy}
          className="rounded-full px-6 py-2.5 text-[13px] font-medium transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: c.accent, color: c.onAccent }}
          onClick={submit}
        >
          {busy ? "…" : "Importar & analisar"}
        </button>
      </div>
    </div>
  );
}
