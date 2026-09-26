import fs from "node:fs";
import path from "node:path";
import { loadConfig } from "../config.js";
import { writeRc } from "../config.js";
import { ok, fail, say, c } from "../ui.js";

/**
 * `bfrost pull`
 *
 * Baixa as camadas do cofre online (Supabase) e escreve cada uma como
 * `.brainfrost/<slug>.md` com frontmatter. Depois `bfrost inject` funciona
 * exatamente como antes, sem saber que a fonte mudou.
 */
export default async function pull() {
  let config;
  try {
    config = loadConfig();
  } catch (e) {
    if (!/Cofre não encontrado/.test(e.message)) throw e;
    const here = path.join(process.cwd(), ".brainfrost");
    fs.mkdirSync(here, { recursive: true });
    say(c.dim(`   criei ${c.white(here)} pra receber as camadas do cofre online.`));
    config = loadConfig();
  }
  const remote = config.remote;
  if (!remote || !remote.accessToken) {
    fail(`Nenhuma sessão remota. Rode ${c.white("bfrost login")} primeiro.`);
    process.exit(1);
  }

  say(`${c.ice("❄")}  puxando do cofre online…`);

  let { accessToken, refreshToken } = remote;

  const notes = await tryFetchNotes(remote.url, remote.anonKey, accessToken).catch(async (err) => {
    if (err.status !== 401) throw err;
    say(c.dim("   sessão expirada, renovando…"));
    const refreshed = await refresh(remote.url, remote.anonKey, refreshToken);
    accessToken = refreshed.access_token;
    refreshToken = refreshed.refresh_token;
    writeRc({
      remote: { ...remote, accessToken, refreshToken, updatedAt: new Date().toISOString() },
    });
    return tryFetchNotes(remote.url, remote.anonKey, accessToken);
  });

  if (!Array.isArray(notes) || notes.length === 0) {
    say(c.dim("   nada no cofre — cofre online está vazio."));
    return;
  }

  if (!fs.existsSync(config.vault)) fs.mkdirSync(config.vault, { recursive: true });

  let written = 0;
  for (const note of notes) {
    const filename = `${sanitizeSlug(note.slug)}.md`;
    const file = path.join(config.vault, filename);
    fs.writeFileSync(file, renderNote(note), "utf8");
    written += 1;
  }

  ok(`${written} camadas escritas em ${c.white(config.vault)}.`);
  say(c.dim(`   próximo passo: bfrost inject   (leva o cofre pro CLAUDE.md deste repo)`));
}

async function tryFetchNotes(url, anonKey, accessToken) {
  const res = await fetch(
    `${url}/rest/v1/vault_notes?select=slug,title,body,category,layer,tags,updated_at&order=updated_at.desc`,
    {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    }
  );
  if (!res.ok) {
    const err = new Error(`Supabase respondeu ${res.status}`);
    err.status = res.status;
    err.body = await res.text().catch(() => "");
    throw err;
  }
  return res.json();
}

async function refresh(url, anonKey, refreshToken) {
  const res = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: anonKey },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Falha ao renovar sessão (${res.status}). Rode 'bfrost login' de novo.\n${body}`
    );
  }
  return res.json();
}

function sanitizeSlug(slug) {
  return String(slug)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "camada";
}

function renderNote(note) {
  const tags = Array.isArray(note.tags) && note.tags.length ? note.tags.join(", ") : null;
  const front = ["---"];
  front.push(`title: ${escapeYaml(note.title)}`);
  if (tags) front.push(`tags: [${tags}]`);
  front.push(`layer: ${note.layer || "growth"}`);
  if (note.category) front.push(`category: ${note.category}`);
  front.push("---");
  return `${front.join("\n")}\n\n${note.body.trim()}\n`;
}

function escapeYaml(value) {
  const text = String(value ?? "");
  return /[:{}[\],&*#?|<>=!%@`\-]/.test(text) ? JSON.stringify(text) : text;
}
