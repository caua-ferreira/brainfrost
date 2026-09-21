import fs from "node:fs";
import path from "node:path";
import { loadConfig } from "../config.js";
import { slugify } from "../vault.js";
import { pull, commitAndPush } from "../git.js";
import { c, say, flake, ok, warn, list } from "../ui.js";

const ANCHOR = "<!-- bfrost:learn-anchor -->";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function entry({ title, content, tags, links }) {
  const lines = [`## ${today()} — ${title}`, "", content.trim()];
  if (links?.length) {
    lines.push("", `Relacionado: ${links.map((l) => `[[${slugify(l)}]]`).join(", ")}`);
  }
  if (tags?.length) {
    lines.push("", `Tags: ${tags.map((t) => `\`${t}\``).join(", ")}`);
  }
  return lines.join("\n") + "\n";
}

function newNote({ title, content, tags, links }) {
  const front = [
    "---",
    `title: ${title}`,
    `tags: [${(tags || []).join(", ")}]`,
    "layer: growth",
    "---",
    "",
    `# ${title}`,
    "",
    content.trim(),
    "",
  ];
  if (links?.length) {
    front.push(`Relacionado: ${links.map((l) => `[[${slugify(l)}]]`).join(", ")}`, "");
  }
  return front.join("\n");
}

export default function learn(positional, flags) {
  const [title, ...rest] = positional;
  const content = rest.join(" ").trim();

  if (!title || !content) {
    throw new Error(
      'Faltou título ou conteúdo.\nExemplo: bfrost learn "MERGE na Gold" "Sempre com chave explícita." --tags snowflake --links padroes_arquitetura'
    );
  }

  const config = loadConfig();
  const tags = list(flags.tags) || [];
  const links = list(flags.links) || [];

  if (config.autoPull && !flags.noPull && !flags.offline) {
    const result = pull(config.repo);
    if (result.ok === false) {
      warn(`git pull falhou: ${result.error.split("\n")[0]}`);
      warn("resolva antes de gravar para não criar conflito no log.");
    }
  }

  let target;
  let mode;

  if (flags.file && flags.file !== true) {
    const name = String(flags.file).endsWith(".md") ? String(flags.file) : `${slugify(flags.file)}.md`;
    target = path.join(config.vault, name);
    if (fs.existsSync(target)) {
      fs.appendFileSync(target, "\n" + entry({ title, content, tags, links }), "utf8");
      mode = "anexado";
    } else {
      fs.writeFileSync(target, newNote({ title, content, tags, links }), "utf8");
      mode = "camada nova";
    }
  } else {
    target = path.join(config.vault, "log_aprendizados.md");
    const block = entry({ title, content, tags, links });
    if (!fs.existsSync(target)) {
      fs.writeFileSync(
        target,
        `---\ntitle: Log de aprendizados\ntags: [log]\nlayer: growth\n---\n\n# Log de aprendizados\n\n${ANCHOR}\n\n${block}`,
        "utf8"
      );
      mode = "log criado";
    } else {
      const raw = fs.readFileSync(target, "utf8");
      const next = raw.includes(ANCHOR)
        ? raw.replace(ANCHOR, `${ANCHOR}\n\n${block.trimEnd()}`)
        : raw.trimEnd() + "\n\n" + block;
      fs.writeFileSync(target, next, "utf8");
      mode = "anexado ao log";
    }
  }

  flake(`${mode}: ${c.white(path.basename(target))}`);
  say(c.dim(`   ${title}`));

  if (flags.noPush || config.autoPush === false) {
    warn("nada foi enviado ao Git (--no-push).");
    return;
  }

  const result = commitAndPush(config.repo, `❄️ Novo aprendizado no BrainFrost: ${title}`);
  if (result.skipped && !result.committed) warn(`Git pulado: ${result.skipped}`);
  else if (result.nothing) warn("nada mudou no repositório.");
  else if (result.pushed) ok("enviado ao GitHub. A Vercel vai reconstruir o grafo.");
  else if (result.skipped) ok(`commit feito. Sem push: ${result.skipped}.`);
  else if (result.error) warn(`commit feito, push falhou: ${result.error.split("\n")[0]}`);
  else ok("commit feito localmente.");
}
