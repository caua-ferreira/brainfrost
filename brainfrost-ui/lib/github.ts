/**
 * Cliente mínimo pra GitHub REST usando o provider_token do Supabase OAuth.
 * Só read-only.
 */

const BASE = "https://api.github.com";

export interface Repo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  description: string | null;
  updated_at: string;
  language: string | null;
  default_branch: string;
  html_url: string;
  fork: boolean;
}

async function gh<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GitHub ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export async function listRepos(token: string): Promise<Repo[]> {
  return gh<Repo[]>(
    "/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator,organization_member",
    token
  );
}

interface TreeItem {
  path: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
}

interface TreeResponse {
  sha: string;
  tree: TreeItem[];
  truncated: boolean;
}

const CONTEXT_FILE_PATTERNS: RegExp[] = [
  /^README\.md$/i,
  /^CLAUDE\.md$/i,
  /^CONTEXTO\.md$/i,
  /^CONTEXT\.md$/i,
  /^AGENTS\.md$/i,
  /^\.brainfrost\/[^/]+\.md$/i,
  /^\.cursor\/rules\/[^/]+\.mdc?$/i,
  /^\.github\/copilot-instructions\.md$/i,
  /^docs\/[^/]+\.md$/i,
];

export interface ContextFile {
  path: string;
  size: number;
  text: string;
}

/**
 * Baixa até 20 arquivos de contexto de um repo, no máximo 200KB somados.
 * Retorna o conteúdo bruto — a sanitização vem depois.
 */
export async function fetchContextFiles(
  token: string,
  fullName: string,
  branch: string
): Promise<{ files: ContextFile[]; truncated: boolean }> {
  const tree = await gh<TreeResponse>(
    `/repos/${fullName}/git/trees/${branch}?recursive=1`,
    token
  );

  const candidates = tree.tree
    .filter((item) => item.type === "blob")
    .filter((item) => CONTEXT_FILE_PATTERNS.some((rx) => rx.test(item.path)))
    .sort((a, b) => (a.size ?? 0) - (b.size ?? 0));

  const files: ContextFile[] = [];
  let totalBytes = 0;
  const MAX_FILES = 20;
  const MAX_TOTAL_BYTES = 200 * 1024;

  for (const item of candidates) {
    if (files.length >= MAX_FILES) break;
    if (item.size && item.size > 60 * 1024) continue;
    if (totalBytes + (item.size ?? 0) > MAX_TOTAL_BYTES) continue;

    const rawUrl = `/repos/${fullName}/contents/${encodeURIComponent(item.path)}?ref=${branch}`;
    const meta = await gh<{ download_url: string | null; content: string; encoding: string }>(
      rawUrl,
      token
    );

    let text: string | null = null;
    if (meta.content && meta.encoding === "base64") {
      text = atob(meta.content.replace(/\n/g, ""));
    } else if (meta.download_url) {
      const rawRes = await fetch(meta.download_url);
      if (rawRes.ok) text = await rawRes.text();
    }
    if (!text) continue;

    files.push({ path: item.path, size: text.length, text });
    totalBytes += text.length;
  }

  return { files, truncated: candidates.length > files.length };
}

export function buildRawTextFromFiles(fullName: string, files: ContextFile[]): string {
  const header = `# Contexto extraído de ${fullName}\n\n`;
  const body = files
    .map((f) => `## ${f.path}\n\n${f.text.trim()}\n`)
    .join("\n---\n\n");
  return header + body;
}
