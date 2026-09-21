import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { loadConfig } from "../config.js";
import { readVault } from "../vault.js";
import { buildPrompt, formatPrompt } from "../prompt.js";
import { resolveProvider, send } from "../providers.js";
import { pull } from "../git.js";
import { c, say, flake, list } from "../ui.js";

const note = (msg) => process.stderr.write(msg + "\n");

function copyToClipboard(text) {
  const candidates = [
    ["pbcopy", []],
    ["wl-copy", []],
    ["xclip", ["-selection", "clipboard"]],
    ["clip.exe", []],
  ];
  for (const [bin, args] of candidates) {
    const result = spawnSync(bin, args, { input: text });
    if (result.status === 0) return bin;
  }
  return null;
}

export default async function ask(positional, flags) {
  const question = positional.join(" ").trim();
  if (!question) {
    throw new Error('Faltou a pergunta. Exemplo: bfrost ask "como eu resolvo isso?"');
  }

  const config = loadConfig();

  if (config.autoPull && !flags.noPull && !flags.offline) {
    const result = pull(config.repo);
    if (result.skipped) note(c.dim(`❄  contexto local (${result.skipped})`));
    else if (result.ok) note(c.dim("❄  cofre sincronizado"));
    else note(c.warn(`!  git pull falhou, seguindo com o local: ${result.error.split("\n")[0]}`));
  }

  const providerName = flags.provider && flags.provider !== true ? String(flags.provider) : config.provider;
  const provider = resolveProvider(providerName, config);
  if (config.model) provider.model = config.model;
  if (flags.model && flags.model !== true) provider.model = String(flags.model);

  const format = flags.format && flags.format !== true ? String(flags.format) : provider.format || "plain";

  const notes = readVault(config.vault);
  const built = buildPrompt(notes, question, {
    only: list(flags.only),
    header: config.header,
  });
  const payload = formatPrompt(built.prompt, format, provider.model);

  note(
    c.dim(
      `❄  ${built.used.length} camadas · ~${built.tokens.toLocaleString("pt-BR")} tokens · ${providerName}${
        provider.model ? ` (${provider.model})` : ""
      }`
    )
  );
  if (built.tokens > 30000) {
    note(c.warn("!  contexto grande. Use --only para escolher camadas: --only trabalho,index"));
  }

  if (flags.dry) {
    say(payload);
    return;
  }

  const answer = await send(provider, payload);

  if (flags.out && flags.out !== true) {
    const target = path.resolve(String(flags.out));
    fs.writeFileSync(target, (answer ?? payload) + "\n", "utf8");
    flake(`gravado em ${c.white(target)}`);
  } else if (answer !== null) {
    say(answer);
  }

  if (flags.copy || provider.copy) {
    const bin = copyToClipboard(answer ?? payload);
    note(bin ? c.dim(`❄  copiado (${bin})`) : c.warn("!  nenhum utilitário de clipboard encontrado"));
  }
}
