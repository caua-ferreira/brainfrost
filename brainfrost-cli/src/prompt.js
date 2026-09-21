import { estimateTokens } from "./vault.js";

const DEFAULT_HEADER = `Abaixo está o contexto pessoal de quem está perguntando, carregado do cofre BrainFrost.
Trate o bloco CONTEXTO como verdade sobre o ambiente dele: decisões já tomadas, ferramentas em uso e
restrições reais. Não proponha nada que contrarie esse bloco sem dizer explicitamente o que está
contrariando e por quê.`;

/**
 * Aplica o filtro --only (por slug ou tag) e devolve as camadas na ordem
 * canônica: `index` primeiro, `core` antes de `growth`, alfabético dentro
 * de cada grupo. É a ordem que o ask e o inject compartilham.
 */
export function selectNotes(notes, only) {
  let selected = notes;
  if (only && only.length) {
    const wanted = new Set(only);
    selected = notes.filter((n) => wanted.has(n.slug) || n.tags.some((t) => wanted.has(t)));
    if (selected.length === 0) {
      throw new Error(`Nenhuma camada corresponde a: ${only.join(", ")}`);
    }
  }
  return [...selected].sort((a, b) => {
    if (a.slug === "index") return -1;
    if (b.slug === "index") return 1;
    if (a.layer !== b.layer) return a.layer === "core" ? -1 : 1;
    return a.slug.localeCompare(b.slug);
  });
}

/**
 * Serializa as camadas num bloco Markdown único, separadas por --- e com
 * um comentário HTML por camada guardando slug e data. Usado tanto no
 * prompt do ask quanto no CLAUDE.md do inject.
 */
export function formatContext(notes) {
  return notes
    .map((note) =>
      [
        `### ${note.title}`,
        `<!-- camada: ${note.slug} | atualizada: ${note.updatedAt.slice(0, 10)} -->`,
        "",
        note.body,
      ].join("\n")
    )
    .join("\n\n---\n\n");
}

/**
 * Monta o prompt final. A ordem é proposital: instrução, contexto, pergunta.
 * O index vem primeiro porque costuma carregar as regras de resposta.
 */
export function buildPrompt(notes, question, { only = null, header = null } = {}) {
  const ordered = selectNotes(notes, only);
  const context = formatContext(ordered);

  const prompt = [
    header ?? DEFAULT_HEADER,
    "",
    "## CONTEXTO",
    "",
    context,
    "",
    "## PERGUNTA",
    "",
    question.trim(),
  ].join("\n");

  return {
    prompt,
    used: ordered.map((n) => n.slug),
    chars: prompt.length,
    tokens: estimateTokens(prompt.length),
  };
}

/** Dollar-quoting do Snowflake quebra se o texto contiver `$$`. */
function toCortexSql(prompt, model) {
  const safe = prompt.replace(/\$\$/g, "$ $");
  return [
    "-- Gerado por bfrost",
    "SELECT SNOWFLAKE.CORTEX.COMPLETE(",
    `  '${model || "claude-sonnet-4-5"}',`,
    "  $$",
    safe,
    "  $$",
    ") AS resposta;",
  ].join("\n");
}

function toMessagesJson(prompt, model) {
  return JSON.stringify(
    { model: model || null, messages: [{ role: "user", content: prompt }] },
    null,
    2
  );
}

export const FORMATTERS = {
  plain: (prompt) => prompt,
  json: toMessagesJson,
  sql: toCortexSql,
};

export function formatPrompt(prompt, format, model) {
  const formatter = FORMATTERS[format] ?? FORMATTERS.plain;
  return formatter(prompt, model);
}

export { DEFAULT_HEADER };
