"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileArchive, FileText, FolderOpen, GitBranch, Globe2, Lock, Search, ShieldCheck, Type } from "lucide-react";
import { useSaas } from "@/lib/saas-mock";
import { palette } from "@/lib/saas-theme";
import { getSupabase } from "@/lib/supabase/client";
import { useSession } from "@/components/saas/SessionProvider";
import { useBilling } from "@/components/saas/BillingProvider";
import { buildRawTextFromFiles, type Repo } from "@/lib/github";
import { LOCAL_FILE_ACCEPT, readLocalTextFiles, readZipTextFiles } from "@/lib/import-files";
import { announceNavigation } from "@/components/shared/NavigationLoader";
import { DEFAULT_WEBLLM_MODEL, WEBLLM_MODELS } from "@/lib/webllm";
import { GitHubBrandLogo, GitLabLogo } from "@/components/saas/OAuthProviderLogos";

const SANITIZED = [
  ".env*", "*.pem", "*.key", "id_rsa*", "credentials.json",
  "service-account*.json", "PRIVATE KEY", "sk-*", "ghp_*", "AKIA*",
  "binários", "PII em seeds",
];

const GITLAB_AUTH_ENABLED = process.env.NEXT_PUBLIC_GITLAB_AUTH_ENABLED === "true";

type Tab = "text" | "files" | "repositories" | "url";
type AnalysisProvider = "managed" | "webllm" | "claude" | "gemini";
type ImportSource = "text" | "files" | "zip" | "github" | "url" | "gitlab" | "google_drive";
type RemoteSource = Extract<ImportSource, "url" | "gitlab" | "google_drive">;

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

async function createImport(input: {
  source: ImportSource;
  label: string;
  file_count: number;
  raw_text: string;
}, signal?: AbortSignal) {
  const response = await fetch("/api/imports", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
    signal,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.id) {
    throw new Error(body.error ?? "Não foi possível criar o import.");
  }
  return body.id as string;
}

function analysisUrl(id: string, provider: AnalysisProvider) {
  return `/analisando/${id}?provider=${provider}`;
}

function isCancelled(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

export default function ImportarPage() {
  const theme = useSaas((s) => s.theme);
  const c = palette(theme);
  const webLlmModel = useSaas((s) => s.config.webLlmModel ?? DEFAULT_WEBLLM_MODEL);
  const [tab, setTab] = useState<Tab>("text");
  const [analysisProvider, setAnalysisProvider] = useState<AnalysisProvider>("managed");
  const [storedProviders, setStoredProviders] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/config/llm-key")
      .then((response) => response.ok ? response.json() : { credentials: [] })
      .then((payload) => setStoredProviders((payload.credentials ?? []).map((item: { provider: string }) => item.provider)))
      .catch(() => setStoredProviders([]));
  }, []);

  const localModel = WEBLLM_MODELS.find((model) => model.id === webLlmModel)?.label ?? "modelo local";
  const providerControl = (
    <AnalysisProviderSelect
      c={c}
      value={analysisProvider}
      onChange={setAnalysisProvider}
      storedProviders={storedProviders}
      localModel={localModel}
    />
  );

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

        <div className="mt-10 grid grid-cols-2 border-b sm:grid-cols-4" style={{ borderColor: c.borderSoft }}>
          <TabTrigger c={c} icon={<Type className="h-3.5 w-3.5" strokeWidth={2} />} active={tab === "text"} onClick={() => setTab("text")}>
            Colar texto
          </TabTrigger>
          <TabTrigger c={c} icon={<FileText className="h-3.5 w-3.5" strokeWidth={2} />} active={tab === "files"} onClick={() => setTab("files")}>
            Arquivos
          </TabTrigger>
          <TabTrigger c={c} icon={<GitBranch className="h-3.5 w-3.5" strokeWidth={2} />} active={tab === "repositories"} onClick={() => setTab("repositories")}>
            Repositórios
          </TabTrigger>
          <TabTrigger c={c} icon={<Globe2 className="h-3.5 w-3.5" strokeWidth={2} />} active={tab === "url"} onClick={() => setTab("url")}>
            URL pública
          </TabTrigger>
        </div>

        <div className="mt-6">
          {tab === "text" && <TextPanel c={c} analysisProvider={analysisProvider} providerControl={providerControl} />}
          {tab === "files" && <FilesGroupPanel c={c} analysisProvider={analysisProvider} providerControl={providerControl} />}
          {tab === "repositories" && <RepositoriesPanel c={c} analysisProvider={analysisProvider} providerControl={providerControl} />}
          {tab === "url" && <RemoteSourcePanel source="url" c={c} analysisProvider={analysisProvider} providerControl={providerControl} />}
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

function AnalysisProviderSelect({
  c,
  value,
  onChange,
  storedProviders,
  localModel,
}: {
  c: ReturnType<typeof palette>;
  value: AnalysisProvider;
  onChange: (provider: AnalysisProvider) => void;
  storedProviders: string[];
  localModel: string;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as AnalysisProvider)}
      className="h-10 max-w-[190px] min-w-0 rounded-md border bg-transparent px-2.5 text-[11px] outline-none focus:ring-2"
      style={{ borderColor: c.borderSoft, color: c.text, background: c.bgSoft }}
      aria-label="Escolher IA para análise"
      title="Escolher IA para análise"
    >
      <option value="managed">BrainFrost Cloud</option>
      <option value="webllm">Local · {localModel}</option>
      <option value="claude" disabled={!storedProviders.includes("claude")}>
        Claude{!storedProviders.includes("claude") ? " · configurar" : ""}
      </option>
      <option value="gemini" disabled={!storedProviders.includes("gemini")}>
        Gemini{!storedProviders.includes("gemini") ? " · configurar" : ""}
      </option>
    </select>
  );
}

type ImportPanelProps = {
  c: ReturnType<typeof palette>;
  analysisProvider: AnalysisProvider;
  providerControl: React.ReactNode;
};

function FilesGroupPanel(props: ImportPanelProps) {
  const [kind, setKind] = useState<"regular" | "zip">("regular");
  return (
    <div>
      <SourceChoices
        c={props.c}
        value={kind}
        onChange={setKind}
        options={[
          { id: "regular", label: "Arquivos e pastas", description: "Markdown, texto, código e configurações.", icon: FileText },
          { id: "zip", label: "Arquivo ZIP", description: "Um repositório ou conjunto de documentos compactado.", icon: FileArchive },
        ]}
      />
      <div className="mt-3">
        {kind === "regular" ? <FilesPanel {...props} /> : <ZipPanel {...props} />}
      </div>
    </div>
  );
}

function FilesPanel({ c, analysisProvider, providerControl }: ImportPanelProps) {
  const router = useRouter();
  const filesInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const taskRef = useRef<AbortController | null>(null);
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
    const controller = new AbortController();
    taskRef.current = controller;
    setBusy(true);
    try {
      const contextFiles = await readLocalTextFiles(files);
      controller.signal.throwIfAborted();
      if (contextFiles.length === 0) {
        throw new Error("Nenhum arquivo de texto compatível foi encontrado.");
      }
      const rawText = buildRawTextFromFiles("arquivos locais", contextFiles);
      const id = await createImport({
        source: "files",
        label: `Arquivos locais · ${contextFiles.length} arquivos`,
        file_count: contextFiles.length,
        raw_text: rawText,
      }, controller.signal);
      announceNavigation();
      router.push(analysisUrl(id, analysisProvider));
    } catch (error) {
      if (!isCancelled(error)) alert(error instanceof Error ? error.message : "Não foi possível ler os arquivos.");
    } finally {
      if (taskRef.current === controller) setBusy(false);
    }
  };

  const cancel = () => {
    if (!window.confirm("Cancelar esta importação? Nenhum conteúdo será enviado para análise.")) return;
    taskRef.current?.abort();
    setBusy(false);
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

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span className="font-mono text-[11px]" style={{ color: c.dim }}>
          {files.length > 0 ? `${formatFileSize(totalSize)} selecionados` : "até 200 arquivos e 1 MB de texto compatível"}
        </span>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          {providerControl}
          {busy && <button type="button" onClick={cancel} className="rounded-full border px-4 py-2.5 text-[13px] font-medium" style={{ borderColor: c.border, color: c.dim }}>Cancelar</button>}
          <button
            disabled={files.length === 0 || busy}
            className="rounded-full px-6 py-2.5 text-[13px] font-medium transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: c.accent, color: c.onAccent }}
            onClick={submit}
          >
            {busy ? "lendo…" : "Analisar"}
          </button>
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

function SourceChoices<T extends string>({
  c,
  value,
  onChange,
  options,
}: {
  c: ReturnType<typeof palette>;
  value: T;
  onChange: (value: T) => void;
  options: Array<{
    id: T;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    disabled?: boolean;
  }>;
}) {
  return (
    <div className={`grid gap-2 ${options.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
      {options.map((option) => {
        const Icon = option.icon;
        const active = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            disabled={option.disabled}
            onClick={() => onChange(option.id)}
            className="rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-55"
            style={{
              borderColor: active ? c.accent : c.borderSoft,
              background: active ? `${c.accent}10` : c.bgSoft,
              color: c.text,
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <Icon className="h-4 w-4" />
              {option.disabled && <span className="font-mono text-[8px] uppercase tracking-wider" style={{ color: c.dim }}>em breve</span>}
            </div>
            <p className="mt-2 text-[13px] font-semibold">{option.label}</p>
            <p className="mt-1 text-[10px] leading-relaxed" style={{ color: c.dim }}>{option.description}</p>
          </button>
        );
      })}
    </div>
  );
}

function TextPanel({ c, analysisProvider, providerControl }: ImportPanelProps) {
  const router = useRouter();
  const taskRef = useRef<AbortController | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const disabled = text.trim().length < 20 || busy;

  const submit = async () => {
    const controller = new AbortController();
    taskRef.current = controller;
    setBusy(true);
    try {
      const id = await createImport({
        source: "text",
        label: `Texto colado · ${text.length} caracteres`,
        file_count: 1,
        raw_text: text,
      }, controller.signal);
      announceNavigation();
      router.push(analysisUrl(id, analysisProvider));
    } catch (error) {
      if (!isCancelled(error)) alert(error instanceof Error ? error.message : "Não foi possível criar o import.");
    } finally {
      if (taskRef.current === controller) setBusy(false);
    }
  };

  const cancel = () => {
    if (!window.confirm("Cancelar esta importação? O texto continuará aqui para você editar.")) return;
    taskRef.current?.abort();
    setBusy(false);
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
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span className="font-mono text-[11px]" style={{ color: c.dim }}>
          {text.length.toLocaleString("pt-BR")} caracteres
        </span>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          {providerControl}
          {busy && <button type="button" onClick={cancel} className="rounded-full border px-4 py-2.5 text-[13px] font-medium" style={{ borderColor: c.border, color: c.dim }}>Cancelar</button>}
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
    </div>
  );
}

function ZipPanel({ c, analysisProvider, providerControl }: ImportPanelProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const taskRef = useRef<AbortController | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const submit = async () => {
    if (!file || busy) return;
    const controller = new AbortController();
    taskRef.current = controller;
    setBusy(true);
    setStatus("lendo arquivos do ZIP…");
    try {
      const contextFiles = await readZipTextFiles(file);
      controller.signal.throwIfAborted();
      const rawText = buildRawTextFromFiles(file.name, contextFiles);
      setStatus(`criando import com ${contextFiles.length} arquivos…`);
      const id = await createImport({
        source: "zip",
        label: file.name,
        file_count: contextFiles.length,
        raw_text: rawText,
      }, controller.signal);
      announceNavigation();
      router.push(analysisUrl(id, analysisProvider));
    } catch (error) {
      if (!isCancelled(error)) alert(error instanceof Error ? error.message : "Não foi possível ler o ZIP.");
    } finally {
      if (taskRef.current === controller) {
        setBusy(false);
        setStatus(null);
      }
    }
  };

  const cancel = () => {
    if (!window.confirm("Cancelar a leitura deste ZIP? O arquivo continuará selecionado para você tentar novamente.")) return;
    taskRef.current?.abort();
    setBusy(false);
    setStatus(null);
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

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        {status && <p className="mr-auto self-center font-mono text-[11px]" style={{ color: c.dim }}>{status}</p>}
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          {providerControl}
          {busy && <button type="button" onClick={cancel} className="rounded-full border px-4 py-2.5 text-[13px] font-medium" style={{ borderColor: c.border, color: c.dim }}>Cancelar</button>}
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
    </div>
  );
}

const REMOTE_SOURCES: Array<{
  id: RemoteSource;
  label: string;
  description: string;
  placeholder: string;
  pro: boolean;
}> = [
  {
    id: "url",
    label: "URL pública",
    description: "Artigos, documentação e páginas técnicas públicas.",
    placeholder: "https://exemplo.com/documentacao",
    pro: false,
  },
  {
    id: "gitlab",
    label: "GitLab",
    description: "README, AGENTS, CONTEXTO e docs de projetos públicos.",
    placeholder: "https://gitlab.com/grupo/projeto",
    pro: true,
  },
];

function RemoteSourcePanel({ source, c, analysisProvider, providerControl }: ImportPanelProps & { source: Extract<RemoteSource, "url" | "gitlab"> }) {
  const router = useRouter();
  const { isPro } = useBilling();
  const taskRef = useRef<AbortController | null>(null);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const selected = REMOTE_SOURCES.find((item) => item.id === source)!;
  const locked = selected.pro && !isPro;

  const submit = async () => {
    if (!url.trim() || busy || locked) return;
    const controller = new AbortController();
    taskRef.current = controller;
    setBusy(true);
    setStatus(source === "gitlab" ? "lendo arquivos do projeto…" : "lendo conteúdo público…");
    try {
      const remoteResponse = await fetch("/api/import-source", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source, url: url.trim() }),
        signal: controller.signal,
      });
      const remote = await remoteResponse.json().catch(() => ({})) as {
        label?: string;
        rawText?: string;
        fileCount?: number;
        error?: string;
      };
      if (!remoteResponse.ok || !remote.rawText || !remote.label) {
        throw new Error(remote.error ?? "Não foi possível ler essa fonte.");
      }
      setStatus("criando importação…");
      const id = await createImport({
        source,
        label: remote.label,
        file_count: remote.fileCount ?? 1,
        raw_text: remote.rawText,
      }, controller.signal);
      announceNavigation();
      router.push(analysisUrl(id, analysisProvider));
    } catch (error) {
      if (!isCancelled(error)) alert(error instanceof Error ? error.message : "Não foi possível importar essa fonte.");
    } finally {
      if (taskRef.current === controller) {
        setBusy(false);
        setStatus(null);
      }
    }
  };

  const cancel = () => {
    if (!window.confirm("Cancelar a leitura desta fonte?")) return;
    taskRef.current?.abort();
    setBusy(false);
    setStatus(null);
  };

  return (
    <div className="rounded-2xl border p-5" style={{ background: c.card, borderColor: c.border }}>
      {locked ? (
        <div className="rounded-xl border p-5 text-center" style={{ borderColor: c.borderSoft, background: c.bgSoft }}>
          <Lock className="mx-auto h-6 w-6" strokeWidth={1.6} style={{ color: c.accent }} />
          <p className="mt-2 text-[13px] font-semibold" style={{ color: c.text }}>{selected.label} é uma integração Pro</p>
          <p className="mt-1 text-[11px]" style={{ color: c.dim }}>O plano Free continua com texto, arquivos, ZIP e URL pública.</p>
          <button type="button" onClick={() => router.push("/assinatura")} className="mt-3 rounded-full px-5 py-2 text-[12px] font-medium" style={{ background: c.accent, color: c.onAccent }}>
            Ver plano Pro
          </button>
        </div>
      ) : (
        <div>
          <label htmlFor="remote-source-url" className="font-mono text-[10px] uppercase tracking-[0.25em]" style={{ color: c.dim }}>
            link da fonte
          </label>
          <div className="mt-2 flex items-center gap-2 rounded-xl border px-3" style={{ borderColor: c.borderSoft, background: c.bgSoft }}>
            <Globe2 className="h-4 w-4 shrink-0" strokeWidth={1.8} style={{ color: c.dim }} />
            <input
              id="remote-source-url"
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void submit();
                }
              }}
              placeholder={selected.placeholder}
              className="h-12 min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:opacity-45"
              style={{ color: c.text }}
            />
          </div>
          <p className="mt-2 text-[10px] leading-relaxed" style={{ color: c.dim }}>
            {source === "url" && "A página precisa estar acessível sem login. Endereços internos e arquivos binários são bloqueados."}
            {source === "gitlab" && "Nesta primeira etapa, o projeto precisa ser público. Projetos privados entrarão pela conexão OAuth."}
          </p>
        </div>
      )}

      {!locked && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="font-mono text-[11px]" style={{ color: c.dim }}>{status ?? "até 1 MB de texto por fonte"}</span>
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            {providerControl}
            {busy && <button type="button" onClick={cancel} className="rounded-full border px-4 py-2.5 text-[13px] font-medium" style={{ borderColor: c.border, color: c.dim }}>Cancelar</button>}
            <button
              type="button"
              disabled={!url.trim() || busy}
              onClick={submit}
              className="rounded-full px-6 py-2.5 text-[13px] font-medium transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40"
              style={{ background: c.accent, color: c.onAccent }}
            >
              {busy ? "lendo…" : "Analisar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RepositoriesPanel(props: ImportPanelProps) {
  const [source, setSource] = useState<"github" | "gitlab" | "bitbucket">("github");
  return (
    <div>
      <SourceChoices
        c={props.c}
        value={source}
        onChange={setSource}
        options={[
          { id: "github", label: "GitHub", description: "Conecte sua conta e escolha um repositório.", icon: GitHubBrandLogo },
          { id: "gitlab", label: "GitLab", description: "Conecte sua conta e escolha um projeto.", icon: GitLabLogo, disabled: !GITLAB_AUTH_ENABLED },
          { id: "bitbucket", label: "Bitbucket", description: "Conexão de repositórios em preparação.", icon: GitBranch, disabled: true },
        ]}
      />
      <div className="mt-3">
        {source === "github" && <RepositoryProviderPanel provider="github" {...props} />}
        {source === "gitlab" && <RepositoryProviderPanel provider="gitlab" {...props} />}
      </div>
    </div>
  );
}

function RepositoryProviderPanel({ provider, c, analysisProvider, providerControl }: ImportPanelProps & { provider: "github" | "gitlab" }) {
  const router = useRouter();
  const taskRef = useRef<AbortController | null>(null);
  const { session } = useSession();
  const { isPro } = useBilling();
  const label = provider === "github" ? "GitHub" : "GitLab";
  const scopes = provider === "github" ? "read:user user:email repo" : "read_user read_api";
  const identityLinked = Boolean(session?.user.identities?.some((identity) => identity.provider === provider));

  const [repos, setRepos] = useState<Repo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState<Repo | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [repositoryAccess, setRepositoryAccess] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    setRepos(null);
    setError(null);
    setLoading(true);
    fetch("/api/oauth/connections", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : { connections: [] })
      .then((payload) => {
        if (!active) return;
        const connected = Boolean(payload.connections?.find((item: { provider: string; repositoryAccess: boolean }) => item.provider === provider)?.repositoryAccess);
        setRepositoryAccess(connected);
        if (!connected) return null;
        return fetch(`/api/repositories?provider=${provider}`, { cache: "no-store" });
      })
      .then(async (response) => {
        if (!response || !active) return;
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          if (payload.code === "CONNECTION_REQUIRED" || payload.code === "CONNECTION_EXPIRED") {
            setRepositoryAccess(false);
          }
          throw new Error(payload.error ?? `Erro ao listar repositórios do ${label}.`);
        }
        setRepos(payload.repositories ?? []);
      })
      .catch((cause) => active && setError(cause instanceof Error ? cause.message : "Erro ao listar repositórios."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [provider, label]);

  const reconnect = async () => {
    const options = {
      redirectTo: `${window.location.origin}/auth/callback?next=/importar&repository_provider=${provider}`,
      scopes,
    };
    if (identityLinked) await getSupabase().auth.signInWithOAuth({ provider, options });
    else await getSupabase().auth.linkIdentity({ provider, options });
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
    if (!chosen) return;
    const controller = new AbortController();
    taskRef.current = controller;
    setBusy(true);
    setStatus("Baixando arquivos de contexto…");
    try {
      const response = await fetch("/api/repositories/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider, id: chosen.id, fullName: chosen.full_name, branch: chosen.default_branch }),
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.id) throw new Error(payload.error ?? "Não foi possível importar o repositório.");
      const id = payload.id as string;
      setBusy(false);
      setStatus(null);
      announceNavigation();
      router.push(analysisUrl(id, analysisProvider));
    } catch (e) {
      setBusy(false);
      setStatus(null);
      if (!isCancelled(e)) alert(e instanceof Error ? e.message : "Erro ao importar.");
    }
  };

  const cancel = () => {
    if (!window.confirm(`Cancelar esta importação do ${label}? Nenhuma sugestão será criada.`)) return;
    taskRef.current?.abort();
    setBusy(false);
    setStatus(null);
  };

  if (!isPro) {
    return (
      <div className="rounded-2xl border p-6 text-center" style={{ background: c.card, borderColor: c.border }}>
        <Lock className="mx-auto h-8 w-8" strokeWidth={1.6} style={{ color: c.accent }} />
        <p className="mt-3 text-[14px]" style={{ color: c.text }}>
          Importação pelo {label} é um recurso Pro.
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

  if (repositoryAccess === false) {
    return (
      <div className="rounded-2xl border p-6 text-center" style={{ background: c.card, borderColor: c.border }}>
        <GitBranch className="mx-auto h-8 w-8" strokeWidth={1.6} style={{ color: c.accent }} />
        <p className="mt-3 text-[14px]" style={{ color: c.text }}>
          Autorize o {label} para listar seus repositórios.
        </p>
        <p className="mt-2 max-w-sm mx-auto text-[12px]" style={{ color: c.dim }}>
          Sua conta de login pode continuar a mesma. A autorização de repositórios fica criptografada
          no BrainFrost e é usada somente para leitura.
        </p>
        <button
          onClick={reconnect}
          className="mt-4 rounded-full px-5 py-2 text-[13px] font-medium"
          style={{ background: c.accent, color: c.onAccent }}
        >
          {identityLinked ? `Autorizar repositórios do ${label}` : `Conectar ${label}`}
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

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px]" style={{ color: c.dim }}>
          {status ??
            (chosen
              ? `Vamos ler README, CLAUDE.md, CONTEXTO.md, .cursor/rules e docs/*.md (até 200 arquivos e 1 MB de texto)`
              : "Escolha um repo à esquerda.")}
        </p>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {providerControl}
          {busy && <button type="button" onClick={cancel} className="rounded-full border px-4 py-2.5 text-[13px] font-medium" style={{ borderColor: c.border, color: c.dim }}>Cancelar</button>}
          <button
            disabled={!chosen || busy}
            className="rounded-full px-6 py-2.5 text-[13px] font-medium transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: c.accent, color: c.onAccent }}
            onClick={submit}
          >
            {busy ? "…" : "Analisar"}
          </button>
        </div>
      </div>
    </div>
  );
}
