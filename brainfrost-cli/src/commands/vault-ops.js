import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig, writeRc, VAULT_DIR } from "../config.js";
import { readVault, vaultStats, slugify, estimateTokens } from "../vault.js";
import { PRESETS, resolveProvider } from "../providers.js";
import { pull, commitAndPush, lastCommit, isRepo } from "../git.js";
import { c, say, flake, ok, warn } from "../ui.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const SEED = path.resolve(here, "../../templates");
const META_FILE = "_meta.json";

/**
 * Extrai as env vars referenciadas em headers/url de um provider HTTP
 * (padrão `${NOME_DA_VAR}`). O dashboard usa isso para mostrar quais
 * chaves cada provider precisa e se elas estão presentes no ambiente
 * de quem rodou o `bfrost sync`.
 */
function envVarsOf(provider) {
  const scan = JSON.stringify({ url: provider.url ?? "", headers: provider.headers ?? {} });
  const names = new Set();
  for (const match of scan.matchAll(/\$\{([A-Z0-9_]+)\}/g)) names.add(match[1]);
  return [...names].map((name) => ({ name, present: Boolean(process.env[name]) }));
}

/**
 * O meta é lido pela UI para a tela /config; nunca contém valor de
 * chave (só o nome da variável e se estava setada no momento).
 * Regenerado em todo `bfrost sync` e `bfrost config` — snapshot da
 * config vigente naquela máquina.
 */
function writeMeta(config) {
  const names = [...new Set([...Object.keys(PRESETS), ...Object.keys(config.providers || {})])];
  const providers = names.map((name) => {
    const provider = resolveProvider(name, config);
    return {
      name,
      kind: provider.kind,
      about: provider.about ?? null,
      model: provider.model ?? null,
      cmd: provider.cmd ?? null,
      url: provider.url ?? null,
      envVars: envVarsOf(provider),
      custom: Boolean(config.providers?.[name]),
    };
  });

  const meta = {
    schema: 1,
    updatedAt: new Date().toISOString(),
    activeProvider: config.provider,
    model: config.model ?? null,
    header: config.header,
    autoPull: config.autoPull,
    autoPush: config.autoPush,
    providers,
  };

  const target = path.join(config.vault, META_FILE);
  fs.writeFileSync(target, JSON.stringify(meta, null, 2) + "\n", "utf8");
  return target;
}

export function listCmd() {
  const config = loadConfig();
  const notes = readVault(config.vault);
  const stats = vaultStats(notes);

  flake(`cofre em ${c.white(config.vault)}`);
  say("");
  const width = Math.max(...notes.map((n) => n.slug.length), 8);
  for (const note of notes) {
    const bar = "▁▂▃▄▅▆▇█"[Math.min(note.degree, 7)];
    say(
      `  ${c.ice(bar)} ${c.white(note.slug.padEnd(width))} ${c.dim(
        `${note.degree} conexões · ~${estimateTokens(note.chars)} tokens`
      )}`
    );
  }
  say("");
  say(
    c.dim(
      `  ${stats.notes} camadas · ${stats.edges} conexões · ~${estimateTokens(stats.chars).toLocaleString("pt-BR")} tokens no total`
    )
  );
  if (stats.orphans.length) warn(`sem nenhuma conexão: ${stats.orphans.join(", ")}`);
  if (stats.broken.length) warn(`links apontando para o vazio: ${stats.broken.join(", ")}`);
  const commit = lastCommit(config.repo);
  if (commit) say(c.dim(`  último commit: ${commit}`));
}

export function showCmd(positional) {
  const config = loadConfig();
  const wanted = slugify(positional[0] || "");
  if (!wanted) throw new Error("Diga qual camada. Exemplo: bfrost show padroes_arquitetura");
  const notes = readVault(config.vault);
  const note = notes.find((n) => n.slug === wanted);
  if (!note) {
    throw new Error(`Camada "${wanted}" não existe. Rode bfrost list para ver o que tem.`);
  }
  say(c.ice(`❄  ${note.title}`));
  say(c.dim(`   ${note.file} · ${note.degree} conexões · atualizada em ${note.updatedAt.slice(0, 10)}`));
  say("");
  say(note.body);
  if (note.backlinks.length) {
    say("");
    say(c.dim(`   Citada por: ${note.backlinks.join(", ")}`));
  }
}

export function syncCmd() {
  const config = loadConfig();
  if (!isRepo(config.repo)) {
    throw new Error(`${config.repo} não é um repositório Git. Rode git init e configure o remote.`);
  }
  const pulled = pull(config.repo);
  if (pulled.ok) ok("puxado do remoto.");
  else if (pulled.skipped) warn(`pull pulado: ${pulled.skipped}`);
  else warn(`pull falhou: ${pulled.error.split("\n")[0]}`);

  // Snapshot da config vigente para o dashboard /config da UI ler no build.
  writeMeta(config);
  ok(`meta atualizado em ${config.vault}/${META_FILE}.`);

  const pushed = commitAndPush(config.repo, "❄️ Sincronização do BrainFrost");
  if (pushed.nothing) ok("nada pendente, já estava em dia.");
  else if (pushed.pushed) ok("enviado ao GitHub.");
  else if (pushed.error) warn(`push falhou: ${pushed.error.split("\n")[0]}`);
}

export function initCmd(_positional, flags) {
  const root = path.resolve(flags.dir && flags.dir !== true ? String(flags.dir) : process.cwd());
  const vault = path.join(root, VAULT_DIR);

  if (fs.existsSync(vault)) {
    warn(`já existe um cofre em ${vault}. Nada foi tocado.`);
    return;
  }

  fs.mkdirSync(vault, { recursive: true });
  const seeds = fs.existsSync(SEED) ? fs.readdirSync(SEED).filter((f) => f.endsWith(".md")) : [];
  for (const file of seeds) {
    fs.copyFileSync(path.join(SEED, file), path.join(vault, file));
  }
  if (seeds.length === 0) {
    fs.writeFileSync(
      path.join(vault, "index.md"),
      "---\ntitle: Índice do Cofre\ntags: [meta]\nlayer: core\n---\n\n# Índice do Cofre\n\nPrimeira camada. Ligue outras com [[log_aprendizados]].\n",
      "utf8"
    );
    fs.writeFileSync(
      path.join(vault, "log_aprendizados.md"),
      "---\ntitle: Log de aprendizados\ntags: [log]\nlayer: growth\n---\n\n# Log de aprendizados\n\n<!-- bfrost:learn-anchor -->\n",
      "utf8"
    );
  }

  flake(`cofre criado em ${c.white(vault)}`);
  say(c.dim("   próximo passo: git init, git remote add origin ... e bfrost learn"));
}

export function metaCmd() {
  const config = loadConfig();
  const target = writeMeta(config);
  flake(`meta regenerado em ${c.white(target)}`);
  say(c.dim("   commite para o dashboard /config atualizar no próximo deploy."));
}

export function providersCmd() {
  const config = loadConfig();
  flake("provedores disponíveis");
  say("");
  const names = [...new Set([...Object.keys(PRESETS), ...Object.keys(config.providers || {})])];
  const width = Math.max(...names.map((n) => n.length));
  for (const name of names) {
    const provider = resolveProvider(name, config);
    const active = name === config.provider;
    const marker = active ? c.ice("›") : " ";
    const kind = provider.kind === "http" ? "http" : provider.kind === "cmd" ? "cmd " : "print";
    say(
      `  ${marker} ${c.white(name.padEnd(width))} ${c.dim(kind)}  ${c.dim(provider.about || provider.cmd || provider.url || "")}`
    );
  }
  say("");
  say(c.dim(`  em uso: ${config.provider} · troque com bfrost config --provider <nome>`));
  say(c.dim(`  provedor próprio: edite "providers" em ${config.rcFile}`));
}

export function configCmd(_positional, flags) {
  if (flags.vault && flags.vault !== true) {
    const resolved = path.resolve(String(flags.vault));
    if (!fs.existsSync(resolved)) throw new Error(`${resolved} não existe.`);
    const saved = writeRc({ vault: resolved });
    ok(`cofre fixado em ${resolved}`);
    say(c.dim(`   gravado em ${saved.file}`));
    writeMeta(loadConfig());
    return;
  }
  if (flags.provider && flags.provider !== true) {
    const config = loadConfig();
    resolveProvider(String(flags.provider), config);
    const saved = writeRc({ provider: String(flags.provider) });
    ok(`provedor padrão: ${flags.provider}`);
    say(c.dim(`   gravado em ${saved.file}`));
    writeMeta(loadConfig());
    return;
  }
  if (flags.model && flags.model !== true) {
    const saved = writeRc({ model: String(flags.model) });
    ok(`modelo padrão: ${flags.model}`);
    say(c.dim(`   gravado em ${saved.file}`));
    writeMeta(loadConfig());
    return;
  }
  const config = loadConfig();
  flake("configuração atual");
  say(c.dim(`   cofre:   ${config.vault}`));
  say(c.dim(`   repo:    ${config.repo}`));
  say(c.dim(`   provedor: ${config.provider}${config.model ? ` (${config.model})` : ""}`));
  say(c.dim(`   rc:      ${config.rcFile}`));
}
