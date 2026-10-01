import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { buildRawTextFromFiles, type ContextFile } from "./github";

export type RemoteImportSource = "url" | "gitlab" | "google_drive";

const MAX_REMOTE_BYTES = 220 * 1024;
const MAX_FILE_BYTES = 60 * 1024;
const MAX_FILES = 20;
const MAX_REDIRECTS = 4;

const CONTEXT_FILE_PATTERNS = [
  /^README\.md$/i,
  /^CLAUDE\.md$/i,
  /^CONTEXTO\.md$/i,
  /^CONTEXT\.md$/i,
  /^AGENTS\.md$/i,
  /^\.brainfrost\/[^/]+\.md$/i,
  /^\.cursor\/rules\/[^/]+\.mdc?$/i,
  /^\.gitlab\/[^/]+\.md$/i,
  /^docs\/[^/]+\.md$/i,
];

export interface RemoteImportResult {
  label: string;
  rawText: string;
  fileCount: number;
}

function isPrivateIpv4(address: string) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return true;
  const [a, b] = parts;
  return a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224;
}

export function isUnsafeAddress(address: string) {
  if (isIP(address) === 4) return isPrivateIpv4(address);
  if (isIP(address) === 6) {
    const normalized = address.toLowerCase();
    if (normalized.startsWith("::ffff:")) {
      const mapped = normalized.slice("::ffff:".length);
      return isIP(mapped) !== 4 || isPrivateIpv4(mapped);
    }
    return normalized === "::" || normalized === "::1" || normalized.startsWith("fc") ||
      normalized.startsWith("fd") || normalized.startsWith("fe8") || normalized.startsWith("fe9") ||
      normalized.startsWith("fea") || normalized.startsWith("feb");
  }
  return true;
}

export function parsePublicUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error("Informe uma URL completa, começando com https://.");
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("Apenas URLs públicas HTTP ou HTTPS são aceitas.");
  }
  return url;
}

async function assertPublicDestination(url: URL) {
  if (["localhost", "localhost.localdomain"].includes(url.hostname.toLowerCase())) {
    throw new Error("Endereços locais ou privados não podem ser importados.");
  }
  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  if (addresses.length === 0 || addresses.some(({ address }) => isUnsafeAddress(address))) {
    throw new Error("A URL aponta para uma rede local ou privada e foi bloqueada.");
  }
}

async function readLimitedBody(response: Response, limit = MAX_REMOTE_BYTES) {
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (declared > limit) throw new Error("O conteúdo remoto excede o limite de 220 KB.");
  if (!response.body) return "";

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      throw new Error("O conteúdo remoto excede o limite de 220 KB.");
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(merged);
}

async function safeFetch(input: string | URL, init: RequestInit = {}, redirects = 0): Promise<Response> {
  const url = typeof input === "string" ? parsePublicUrl(input) : input;
  await assertPublicDestination(url);
  const response = await fetch(url, {
    ...init,
    redirect: "manual",
    headers: {
      "User-Agent": "BrainFrost-Importer/1.0",
      Accept: "text/html,text/plain,text/markdown,application/json,application/xml;q=0.9,*/*;q=0.2",
      ...init.headers,
    },
    signal: init.signal ?? AbortSignal.timeout(15_000),
  });
  if ([301, 302, 303, 307, 308].includes(response.status)) {
    if (redirects >= MAX_REDIRECTS) throw new Error("A URL possui redirecionamentos demais.");
    const location = response.headers.get("location");
    if (!location) throw new Error("O servidor devolveu um redirecionamento inválido.");
    return safeFetch(new URL(location, url), init, redirects + 1);
  }
  return response;
}

function decodeEntities(value: string) {
  const named: Record<string, string> = {
    amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—",
  };
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
    if (entity.startsWith("#")) {
      const hex = entity[1]?.toLowerCase() === "x";
      const point = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(point) && point >= 0 && point <= 0x10ffff ? String.fromCodePoint(point) : match;
    }
    return named[entity.toLowerCase()] ?? match;
  });
}

export function htmlToReadableText(html: string) {
  const title = decodeEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "");
  const body = html
    .replace(/<(script|style|noscript|svg|template)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--([\s\S]*?)-->/g, " ")
    .replace(/<\/?(p|div|section|article|main|header|footer|h[1-6]|li|ul|ol|br|tr|blockquote)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  const text = decodeEntities(body)
    .replace(/[\t\f\v ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { title, text };
}

async function fetchReadableDocument(url: URL) {
  const response = await safeFetch(url);
  if (!response.ok) throw new Error(`A fonte respondeu com HTTP ${response.status}.`);
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (/application\/pdf|image\/|audio\/|video\//.test(contentType)) {
    throw new Error("Esse formato não pode ser lido por URL. Baixe o arquivo e use a importação local.");
  }
  const body = await readLimitedBody(response);
  if (!body.trim()) throw new Error("A fonte não devolveu conteúdo legível.");
  if (contentType.includes("text/html") || /^\s*<!doctype html|^\s*<html/i.test(body)) {
    const parsed = htmlToReadableText(body);
    if (parsed.text.length < 40) throw new Error("A página não expõe texto público suficiente para análise.");
    return parsed;
  }
  return { title: "", text: body.trim() };
}

export function normalizePublicDocumentUrl(url: URL) {
  if (url.hostname.toLowerCase() !== "github.com") return url;
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 5 || parts[2] !== "blob") return url;
  const [owner, repo, , ref, ...fileParts] = parts;
  if (!owner || !repo || !ref || fileParts.length === 0) return url;
  return new URL(
    `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(ref)}/${fileParts.map(encodeURIComponent).join("/")}`
  );
}

async function importPublicUrl(value: string): Promise<RemoteImportResult> {
  const sourceUrl = parsePublicUrl(value);
  const fetchUrl = normalizePublicDocumentUrl(sourceUrl);
  const { title, text } = await fetchReadableDocument(fetchUrl);
  return {
    label: title || sourceUrl.pathname.split("/").filter(Boolean).at(-1) || sourceUrl.hostname,
    rawText: `# Conteúdo importado de ${sourceUrl.toString()}\n\n${text}`,
    fileCount: 1,
  };
}

export function parseGitLabProject(value: string) {
  const url = parsePublicUrl(value);
  if (url.hostname.toLowerCase() !== "gitlab.com") throw new Error("Use uma URL de projeto do gitlab.com.");
  const marker = url.pathname.indexOf("/-/");
  const pathname = (marker >= 0 ? url.pathname.slice(0, marker) : url.pathname).replace(/^\/+|\/+$/g, "");
  const projectPath = pathname.replace(/\.git$/i, "");
  if (!projectPath.includes("/")) throw new Error("Informe a URL completa do projeto no GitLab.");
  return projectPath;
}

async function gitLabJson<T>(path: string): Promise<T> {
  const response = await safeFetch(`https://gitlab.com/api/v4${path}`, {
    headers: { Accept: "application/json" },
  });
  if (response.status === 404) throw new Error("Projeto não encontrado ou privado. Nesta etapa, use um projeto público.");
  if (!response.ok) throw new Error(`GitLab respondeu com HTTP ${response.status}.`);
  return JSON.parse(await readLimitedBody(response, 500 * 1024)) as T;
}

async function gitLabTree(encodedProject: string, ref: string, path?: string) {
  const query = new URLSearchParams({ per_page: "100", ref });
  if (path) query.set("path", path);
  const response = await safeFetch(`https://gitlab.com/api/v4/projects/${encodedProject}/repository/tree?${query.toString()}`, {
    headers: { Accept: "application/json" },
  });
  if (response.status === 404) return [] as Array<{ path: string; type: string }>;
  if (!response.ok) throw new Error(`GitLab respondeu com HTTP ${response.status}.`);
  return JSON.parse(await readLimitedBody(response, 500 * 1024)) as Array<{ path: string; type: string }>;
}

async function importGitLab(value: string): Promise<RemoteImportResult> {
  const projectPath = parseGitLabProject(value);
  const encodedProject = encodeURIComponent(projectPath);
  const project = await gitLabJson<{ name_with_namespace: string; default_branch: string | null }>(`/projects/${encodedProject}`);
  if (!project.default_branch) throw new Error("O projeto não possui branch padrão para importar.");
  const trees = await Promise.all([
    gitLabTree(encodedProject, project.default_branch),
    gitLabTree(encodedProject, project.default_branch, "docs"),
    gitLabTree(encodedProject, project.default_branch, ".brainfrost"),
    gitLabTree(encodedProject, project.default_branch, ".cursor/rules"),
    gitLabTree(encodedProject, project.default_branch, ".gitlab"),
  ]);
  const candidates = trees.flat()
    .filter((item) => item.type === "blob" && CONTEXT_FILE_PATTERNS.some((pattern) => pattern.test(item.path)))
    .filter((item, index, all) => all.findIndex((candidate) => candidate.path === item.path) === index)
    .slice(0, MAX_FILES);
  if (candidates.length === 0) throw new Error("Nenhum README, AGENTS, CONTEXTO ou arquivo em docs/ foi encontrado.");

  const files: ContextFile[] = [];
  let total = 0;
  for (const item of candidates) {
    const response = await safeFetch(
      `https://gitlab.com/api/v4/projects/${encodedProject}/repository/files/${encodeURIComponent(item.path)}/raw?ref=${encodeURIComponent(project.default_branch)}`,
      { headers: { Accept: "text/plain" } }
    );
    if (!response.ok) continue;
    const text = await readLimitedBody(response, MAX_FILE_BYTES);
    if (!text.trim() || total + text.length > 200 * 1024) continue;
    files.push({ path: item.path, size: text.length, text });
    total += text.length;
  }
  if (files.length === 0) throw new Error("Os arquivos encontrados não puderam ser lidos.");
  return {
    label: project.name_with_namespace,
    rawText: buildRawTextFromFiles(project.name_with_namespace, files),
    fileCount: files.length,
  };
}

export function googleExportUrl(value: string) {
  const url = parsePublicUrl(value);
  const hostname = url.hostname.toLowerCase();
  if (!["docs.google.com", "drive.google.com"].includes(hostname)) {
    throw new Error("Use um link do Google Docs ou Google Drive.");
  }
  const id = url.pathname.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1] ?? url.searchParams.get("id");
  if (!id) throw new Error("Não foi possível identificar o arquivo nesse link do Google.");
  if (hostname === "docs.google.com" && url.pathname.startsWith("/document/")) {
    return new URL(`https://docs.google.com/document/d/${id}/export?format=txt`);
  }
  if (hostname === "docs.google.com" && url.pathname.startsWith("/spreadsheets/")) {
    return new URL(`https://docs.google.com/spreadsheets/d/${id}/export?format=csv`);
  }
  return new URL(`https://drive.google.com/uc?export=download&id=${id}`);
}

async function importGoogleDrive(value: string): Promise<RemoteImportResult> {
  const sourceUrl = parsePublicUrl(value);
  const exportUrl = googleExportUrl(value);
  const { title, text } = await fetchReadableDocument(exportUrl);
  if (/sign in|request access|acesso negado|solicitar acesso/i.test(text.slice(0, 1200))) {
    throw new Error("O arquivo não está público. Compartilhe como “qualquer pessoa com o link” e tente novamente.");
  }
  return {
    label: title || `Google Drive · ${sourceUrl.pathname.split("/").filter(Boolean).at(-1) ?? "documento"}`,
    rawText: `# Documento importado do Google Drive\n\nFonte: ${sourceUrl.toString()}\n\n${text}`,
    fileCount: 1,
  };
}

export async function importRemoteSource(source: RemoteImportSource, url: string) {
  if (source === "gitlab") return importGitLab(url);
  if (source === "google_drive") return importGoogleDrive(url);
  return importPublicUrl(url);
}
