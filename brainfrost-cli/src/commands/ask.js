import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { loadConfig } from "../config.js";
import { readVault } from "../vault.js";
import { buildPrompt, formatPrompt } from "../prompt.js";
import { resolveProvider, send } from "../providers.js";
import { pull } from "../git.js";
import { c, say, flake, list } from "../ui.js";
import {
  loadConversation,
  saveConversation,
  newConversation,
  appendTurn,
  clearConversation,
  CONVO_FILE,
} from "../conversation.js";

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

function showHistory() {
  const convo = loadConversation();
  if (!convo || convo.messages.length === 0) {
    say(c.dim("nenhuma conversa em andamento."));
    return;
  }
  flake(`conversa ${c.white(convo.id)} · ${convo.provider}${convo.model ? ` (${convo.model})` : ""}`);
  say(c.dim(`   ${convo.messages.length} mensagens · atualizada em ${convo.updatedAt.slice(0, 19).replace("T", " ")}`));
  say(c.dim(`   arquivo: ${CONVO_FILE}`));
  say("");
  for (const [i, msg] of convo.messages.entries()) {
    const role = msg.role === "user" ? c.ice("você") : c.deep("ia  ");
    const preview = msg.content.replace(/\s+/g, " ").slice(0, 160);
    say(`  ${role} ${i + 1}. ${preview}${msg.content.length > 160 ? "…" : ""}`);
  }
}

export default async function ask(positional, flags) {
  if (flags.history) {
    showHistory();
    return;
  }

  if (flags.new) {
    clearConversation();
    say(c.dim("conversa apagada — a próxima pergunta começa do zero."));
    if (!positional.length) return;
  }

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

  // Modo conversa: só faz sentido em provedores http. O CLI avisa em vez de
  // silenciosamente ignorar o --continue nos outros.
  const continuing = Boolean(flags.continue);
  if (continuing && provider.kind !== "http") {
    throw new Error(
      `Modo conversa (--continue) só funciona com provedores http. "${providerName}" é ${provider.kind}.`
    );
  }

  let convo = null;
  let messages = null;
  if (continuing) {
    convo = loadConversation();
    if (!convo || convo.messages.length === 0) {
      note(c.dim("❄  sem conversa anterior — começando uma nova."));
      convo = newConversation(provider.name, provider.model);
      messages = [{ role: "user", content: payload }];
    } else if (convo.provider !== provider.name) {
      throw new Error(
        `A conversa em andamento é com "${convo.provider}"; --provider ${provider.name} conflita. Rode com --new para recomeçar.`
      );
    } else {
      // Perguntas seguintes vão sem o CONTEXTO — ele já está no histórico.
      messages = [...convo.messages, { role: "user", content: question }];
    }
  }

  note(
    c.dim(
      `❄  ${built.used.length} camadas · ~${built.tokens.toLocaleString("pt-BR")} tokens · ${providerName}${
        provider.model ? ` (${provider.model})` : ""
      }${continuing ? c.ice(" · conversa") : ""}`
    )
  );
  if (built.tokens > 30000) {
    note(c.warn("!  contexto grande. Use --only para escolher camadas: --only trabalho,index"));
  }

  if (flags.dry) {
    say(payload);
    return;
  }

  const answer = await send(provider, messages ?? payload);

  if (continuing && provider.kind === "http") {
    const userContent = messages && messages.length > 1 ? question : payload;
    appendTurn(convo, userContent, answer);
    saveConversation(convo);
    note(c.dim(`❄  turno gravado em ${CONVO_FILE}`));
  }

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
