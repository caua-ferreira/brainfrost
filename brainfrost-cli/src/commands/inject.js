import fs from "node:fs";
import path from "node:path";
import { loadConfig } from "../config.js";
import { readVault, estimateTokens } from "../vault.js";
import { selectNotes, formatContext } from "../prompt.js";
import { c, say, flake, ok, list } from "../ui.js";

const START = "<!-- brainfrost:inject-start -->";
const END = "<!-- brainfrost:inject-end -->";

const PREAMBLE = `## Contexto do BrainFrost

Cofre pessoal, versionado em git. Trate este bloco como verdade sobre decisões,
padrões e ferramentas em uso. Se algo aqui contradiz o que você ia sugerir,
diga explicitamente o que está contrariando e por quê.

Regerar este bloco: \`bfrost inject\` (opcionalmente \`--only <camadas>\`).`;

function buildBlock(notes, listSummary) {
  const context = formatContext(notes);
  return [
    START,
    PREAMBLE,
    "",
    `<!-- ${listSummary} -->`,
    "",
    context,
    END,
  ].join("\n");
}

/**
 * Se o alvo já tem os marcadores, substitui o conteúdo entre eles. Se
 * existe sem marcadores, anexa no fim. Se não existe, cria com só o bloco.
 * Assim rodar `bfrost inject` várias vezes converge, nunca duplica.
 */
function mergeIntoFile(target, block) {
  if (!fs.existsSync(target)) {
    fs.writeFileSync(target, block + "\n", "utf8");
    return "created";
  }

  const existing = fs.readFileSync(target, "utf8");
  const startIdx = existing.indexOf(START);
  const endIdx = existing.indexOf(END);

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const before = existing.slice(0, startIdx);
    const after = existing.slice(endIdx + END.length);
    fs.writeFileSync(target, (before + block + after).replace(/\n{3,}$/g, "\n\n"), "utf8");
    return "replaced";
  }

  const trimmed = existing.replace(/\s+$/, "");
  const joined = trimmed.length > 0 ? `${trimmed}\n\n${block}\n` : `${block}\n`;
  fs.writeFileSync(target, joined, "utf8");
  return "appended";
}

export default function inject(_positional, flags) {
  const config = loadConfig();
  const notes = readVault(config.vault);
  const only = list(flags.only);
  const selected = selectNotes(notes, only);

  const targetRaw = flags.file && flags.file !== true ? String(flags.file) : "CLAUDE.md";
  const target = path.resolve(targetRaw);

  const listSummary =
    only && only.length
      ? `bfrost inject --only ${only.join(",")} · ${selected.length} camadas`
      : `bfrost inject · ${selected.length} camadas do cofre`;
  const block = buildBlock(selected, listSummary);

  if (flags.dry) {
    flake(`prévia — nada foi escrito (alvo: ${c.white(target)})`);
    say("");
    say(block);
    return;
  }

  const action = mergeIntoFile(target, block);
  const verb = action === "created" ? "criado" : action === "replaced" ? "atualizado" : "acrescido a";
  ok(`${verb} ${c.white(target)}`);
  say(
    c.dim(
      `   ${selected.length} camadas · ~${estimateTokens(block.length).toLocaleString("pt-BR")} tokens no bloco`
    )
  );
  say(c.dim("   próxima sessão do Claude Code neste diretório já lê o contexto."));
}
