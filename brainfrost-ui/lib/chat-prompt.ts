import type { Note } from "./types";

const DEFAULT_HEADER = `Abaixo está o contexto pessoal de quem está perguntando, carregado do cofre BrainFrost.
Trate o bloco CONTEXTO como verdade sobre o ambiente dele: decisões já tomadas, ferramentas em uso e
restrições reais. Não proponha nada que contrarie esse bloco sem dizer explicitamente o que está
contrariando e por quê.`;

/**
 * Espelho da lógica de brainfrost-cli/src/prompt.js. Mantido separado
 * porque a UI não pode importar do CLI (bundle Node vs browser).
 */
export function selectNotesForChat(notes: Note[], only: string[] | null): Note[] {
  let selected = notes;
  if (only && only.length) {
    const wanted = new Set(only);
    selected = notes.filter((n) => wanted.has(n.slug) || n.tags.some((t) => wanted.has(t)));
  }
  return [...selected].sort((a, b) => {
    if (a.slug === "index") return -1;
    if (b.slug === "index") return 1;
    if (a.layer !== b.layer) return a.layer === "core" ? -1 : 1;
    return a.slug.localeCompare(b.slug);
  });
}

export function formatContextForChat(notes: Note[]): string {
  return notes
    .map((note) =>
      [
        `### ${note.title}`,
        `<!-- camada: ${note.slug} | atualizada: ${note.updatedAt.slice(0, 10)} -->`,
        "",
        note.raw,
      ].join("\n")
    )
    .join("\n\n---\n\n");
}

/**
 * Monta a mensagem inicial que vai como primeiro turno da conversa.
 * O CONTEXTO só entra aqui — turnos seguintes só carregam pergunta+histórico.
 */
export function buildChatOpener(notes: Note[], layers: string[] | null, question: string): string {
  const ordered = selectNotesForChat(notes, layers);
  const context = formatContextForChat(ordered);
  return [
    DEFAULT_HEADER,
    "",
    "## CONTEXTO",
    "",
    context,
    "",
    "## PERGUNTA",
    "",
    question.trim(),
  ].join("\n");
}
