import { MAX_IMPORT_FILES, MAX_IMPORT_FILE_BYTES, MAX_IMPORT_TOTAL_BYTES } from "./import-limits";
import type { ContextFile, Repo } from "./github";

const BASE = "https://gitlab.com/api/v4";

async function gl<T>(path: string, token: string): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`GitLab ${response.status}: ${body.slice(0, 200)}`);
  }
  return response.json() as Promise<T>;
}

type GitLabProject = {
  id: number;
  name: string;
  path_with_namespace: string;
  visibility: string;
  description: string | null;
  last_activity_at: string;
  default_branch: string | null;
  web_url: string;
  forked_from_project?: unknown;
};

export async function listGitLabRepos(token: string): Promise<Repo[]> {
  const projects = await gl<GitLabProject[]>("/projects?membership=true&order_by=last_activity_at&sort=desc&per_page=100", token);
  return projects
    .filter((project) => project.default_branch)
    .map((project) => ({
      id: project.id,
      name: project.name,
      full_name: project.path_with_namespace,
      private: project.visibility !== "public",
      description: project.description,
      updated_at: project.last_activity_at,
      language: null,
      default_branch: project.default_branch!,
      html_url: project.web_url,
      fork: Boolean(project.forked_from_project),
    }));
}

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

export async function fetchGitLabContextFiles(token: string, projectId: number, branch: string) {
  const tree = await gl<Array<{ path: string; type: string }>>(
    `/projects/${projectId}/repository/tree?recursive=true&per_page=100&ref=${encodeURIComponent(branch)}`,
    token
  );
  const candidates = tree
    .filter((item) => item.type === "blob" && CONTEXT_FILE_PATTERNS.some((pattern) => pattern.test(item.path)))
    .slice(0, MAX_IMPORT_FILES);
  const files: ContextFile[] = [];
  let totalBytes = 0;

  for (const item of candidates) {
    const response = await fetch(
      `${BASE}/projects/${projectId}/repository/files/${encodeURIComponent(item.path)}/raw?ref=${encodeURIComponent(branch)}`,
      { headers: { Authorization: `Bearer ${token}`, Accept: "text/plain" }, signal: AbortSignal.timeout(20_000) }
    );
    if (!response.ok) continue;
    const declared = Number(response.headers.get("content-length") ?? 0);
    if (declared > MAX_IMPORT_FILE_BYTES || totalBytes + declared > MAX_IMPORT_TOTAL_BYTES) continue;
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > MAX_IMPORT_FILE_BYTES || totalBytes + bytes.byteLength > MAX_IMPORT_TOTAL_BYTES) continue;
    const text = new TextDecoder().decode(bytes);
    if (!text.trim()) continue;
    files.push({ path: item.path, size: bytes.byteLength, text });
    totalBytes += bytes.byteLength;
  }

  return { files, truncated: candidates.length > files.length };
}
