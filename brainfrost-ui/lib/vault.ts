import fs from "node:fs";
import path from "node:path";
import type { GraphData, Note, VaultSnapshot } from "./types";

const WIKILINK = /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g;

/**
 * Onde o cofre pode estar, em ordem de prioridade.
 * Na Vercel, defina a Root Directory como `brainfrost-ui` e mantenha ligada a opção
 * "Include source files outside of the Root Directory" — assim `../.brainfrost` existe no build.
 */
function candidatePaths(): string[] {
  const fromEnv = process.env.BRAINFROST_VAULT;
  const cwd = process.cwd();
  return [
    fromEnv ? path.resolve(cwd, fromEnv) : null,
    path.resolve(cwd, "../.brainfrost"),
    path.resolve(cwd, ".brainfrost"),
    path.resolve(cwd, "content"),
  ].filter(Boolean) as string[];
}

export function resolveVaultDir(): string {
  for (const candidate of candidatePaths()) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) return candidate;
  }
  throw new Error(
    [
      "Cofre não encontrado. Procurei em:",
      ...candidatePaths().map((p) => `  - ${p}`),
      "",
      "Aponte o caminho na variável BRAINFROST_VAULT ou copie a pasta .brainfrost para dentro de brainfrost-ui/content.",
    ].join("\n")
  );
}

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\.md$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type Frontmatter = Record<string, string | string[]>;

function parseFrontmatter(raw: string): { data: Frontmatter; body: string } {
  if (!raw.startsWith("---")) return { data: {}, body: raw };
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { data: {}, body: raw };

  const head = raw.slice(3, end).trim();
  const body = raw.slice(end + 4).replace(/^\r?\n/, "");
  const data: Frontmatter = {};

  for (const line of head.split("\n")) {
    const pair = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!pair) continue;
    const [, key, valueRaw] = pair;
    const value = valueRaw.trim();
    if (value.startsWith("[") && value.endsWith("]")) {
      data[key] = value
        .slice(1, -1)
        .split(",")
        .map((item) => item.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    } else {
      data[key] = value.replace(/^["']|["']$/g, "");
    }
  }
  return { data, body };
}

/** Converte `[[slug|rótulo]]` num link que o painel de leitura sabe interceptar. */
export function linkifyWikiLinks(body: string): string {
  return body.replace(WIKILINK, (_match, target: string, label?: string) => {
    const slug = slugify(target);
    return `[${label ?? target.trim()}](brainfrost:${slug})`;
  });
}

function extractLinks(body: string): string[] {
  const found = new Set<string>();
  for (const match of body.matchAll(WIKILINK)) found.add(slugify(match[1]));
  return [...found];
}

function titleFrom(data: Frontmatter, body: string, slug: string): string {
  if (typeof data.title === "string" && data.title) return data.title;
  const heading = body.match(/^#\s+(.+)$/m);
  return heading ? heading[1].trim() : slug.replace(/-/g, " ");
}

export function readVault(): VaultSnapshot {
  const dir = resolveVaultDir();
  const files = fs.readdirSync(dir).filter((name) => name.endsWith(".md")).sort();

  const notes: Note[] = files.map((file) => {
    const raw = fs.readFileSync(path.join(dir, file), "utf8");
    const { data, body } = parseFrontmatter(raw);
    const slug = slugify(file);
    const tags = Array.isArray(data.tags) ? data.tags : data.tags ? [data.tags as string] : [];
    return {
      slug,
      file,
      title: titleFrom(data, body, slug),
      tags,
      layer: (data.layer as string) === "core" ? "core" : "growth",
      content: linkifyWikiLinks(body.trim()),
      raw: body.trim(),
      excerpt: body
        .replace(/^#.*$/gm, "")
        .replace(WIKILINK, "$1")
        .replace(/[*_`>#-]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 150),
      links: extractLinks(body),
      backlinks: [],
      broken: [],
      updatedAt: fs.statSync(path.join(dir, file)).mtime.toISOString(),
      words: body.split(/\s+/).filter(Boolean).length,
    };
  });

  const known = new Set(notes.map((n) => n.slug));
  for (const note of notes) {
    note.broken = note.links.filter((slug) => !known.has(slug));
    note.links = note.links.filter((slug) => known.has(slug) && slug !== note.slug);
  }
  for (const note of notes) {
    note.backlinks = notes.filter((other) => other.links.includes(note.slug)).map((o) => o.slug);
  }

  const seen = new Set<string>();
  const graph: GraphData = {
    nodes: notes.map((note) => ({
      id: note.slug,
      title: note.title,
      layer: note.layer,
      degree: note.links.length + note.backlinks.length,
      words: note.words,
      updatedAt: note.updatedAt,
    })),
    links: [],
  };

  for (const note of notes) {
    for (const target of note.links) {
      const key = [note.slug, target].sort().join("::");
      if (seen.has(key)) continue;
      seen.add(key);
      graph.links.push({ source: note.slug, target });
    }
  }

  const updated = notes
    .map((n) => n.updatedAt)
    .sort()
    .at(-1);

  return {
    dir,
    notes,
    graph,
    stats: {
      notes: notes.length,
      edges: graph.links.length,
      words: notes.reduce((sum, n) => sum + n.words, 0),
      orphans: graph.nodes.filter((n) => n.degree === 0).length,
      broken: notes.flatMap((n) => n.broken.map((b) => `${n.slug} → ${b}`)),
      lastUpdate: updated ?? new Date().toISOString(),
    },
  };
}
