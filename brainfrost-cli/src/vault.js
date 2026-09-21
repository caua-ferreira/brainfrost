import fs from "node:fs";
import path from "node:path";

export const WIKILINK = /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g;

export function slugify(input) {
  return String(input)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\.md$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Frontmatter YAML simples: chave, string, lista inline e lista com hífen. */
export function parseFrontmatter(raw) {
  if (!raw.startsWith("---")) return { data: {}, body: raw };
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { data: {}, body: raw };

  const head = raw.slice(3, end).trim();
  const body = raw.slice(end + 4).replace(/^\r?\n/, "");
  const data = {};
  let currentKey = null;

  for (const line of head.split("\n")) {
    const listItem = line.match(/^\s*-\s+(.*)$/);
    if (listItem && currentKey) {
      data[currentKey] = [...(Array.isArray(data[currentKey]) ? data[currentKey] : []), clean(listItem[1])];
      continue;
    }
    const pair = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!pair) continue;
    const [, key, valueRaw] = pair;
    currentKey = key;
    const value = valueRaw.trim();
    if (value === "") {
      data[key] = [];
    } else if (value.startsWith("[") && value.endsWith("]")) {
      data[key] = value
        .slice(1, -1)
        .split(",")
        .map(clean)
        .filter(Boolean);
    } else {
      data[key] = clean(value);
    }
  }
  return { data, body };
}

function clean(value) {
  return String(value).trim().replace(/^["']|["']$/g, "");
}

export function extractLinks(body) {
  const found = new Set();
  for (const match of body.matchAll(WIKILINK)) {
    found.add(slugify(match[1]));
  }
  return [...found];
}

function titleFrom(data, body, slug) {
  if (data.title) return data.title;
  const heading = body.match(/^#\s+(.+)$/m);
  if (heading) return heading[1].trim();
  return slug.replace(/-/g, " ");
}

export function readVault(vaultDir) {
  if (!fs.existsSync(vaultDir)) {
    throw new Error(`Cofre inexistente em ${vaultDir}. Rode: bfrost init`);
  }

  const notes = fs
    .readdirSync(vaultDir)
    .filter((name) => name.endsWith(".md"))
    .sort()
    .map((name) => {
      const file = path.join(vaultDir, name);
      const raw = fs.readFileSync(file, "utf8");
      const { data, body } = parseFrontmatter(raw);
      const slug = slugify(name);
      const stat = fs.statSync(file);
      return {
        slug,
        file: name,
        path: file,
        title: titleFrom(data, body, slug),
        tags: Array.isArray(data.tags) ? data.tags : data.tags ? [data.tags] : [],
        layer: data.layer || "growth",
        body: body.trim(),
        links: extractLinks(body),
        chars: body.length,
        updatedAt: stat.mtime.toISOString(),
      };
    });

  const known = new Set(notes.map((n) => n.slug));
  for (const note of notes) {
    note.broken = note.links.filter((l) => !known.has(l));
    note.links = note.links.filter((l) => known.has(l) && l !== note.slug);
  }
  for (const note of notes) {
    note.backlinks = notes.filter((n) => n.links.includes(note.slug)).map((n) => n.slug);
    note.degree = note.links.length + note.backlinks.length;
  }

  return notes;
}

export function vaultStats(notes) {
  const edges = new Set();
  for (const note of notes) {
    for (const link of note.links) {
      edges.add([note.slug, link].sort().join("::"));
    }
  }
  return {
    notes: notes.length,
    edges: edges.size,
    chars: notes.reduce((sum, n) => sum + n.chars, 0),
    orphans: notes.filter((n) => n.degree === 0).map((n) => n.slug),
    broken: notes.flatMap((n) => n.broken.map((b) => `${n.slug} → ${b}`)),
  };
}

export const estimateTokens = (chars) => Math.ceil(chars / 4);
