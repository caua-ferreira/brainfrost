import type { Note } from "./types";

const DEFAULT_HEADER = `Abaixo está o contexto pessoal de quem está perguntando, carregado do cérebro BrainFrost.
Trate o bloco CONTEXTO como verdade sobre o ambiente dele: decisões já tomadas, ferramentas em uso e
restrições reais. Não proponha nada que contrarie esse bloco sem dizer explicitamente o que está
contrariando e por quê.`;

const FOLLOW_UP_HEADER = `Antes de responder, consulte as camadas relevantes abaixo.
Elas são a fonte de verdade sobre preferências e regras pessoais.
Preserve literalmente negações e restrições como "não", "sem", "nunca" e "apenas".
Não transforme uma regra negativa em positiva e não invente uma preferência.
Respostas anteriores do assistente podem estar erradas e nunca vencem uma regra literal do cérebro.`;

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
        note.concepts.length > 0 ? `conceitos: ${note.concepts.join(", ")}` : "",
        "",
        note.raw,
      ].join("\n")
    )
    .join("\n\n---\n\n");
}

const STOP_WORDS = new Set([
  "como", "qual", "quais", "para", "pelo", "pela", "isso", "esse", "essa", "com", "sem",
  "que", "uma", "umas", "uns", "dos", "das", "nos", "nas", "vai", "sou", "meu", "minha",
]);

function terms(text: string): string[] {
  return [...new Set(
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .split(/[^a-z0-9]+/)
      .filter((term) => term.length >= 3 && !STOP_WORDS.has(term))
  )];
}

function sharesTerm(searchable: string[], wanted: string): boolean {
  return searchable.some((candidate) =>
    candidate === wanted || candidate.includes(wanted) || wanted.includes(candidate)
  );
}

export function selectRelevantNotes(notes: Note[], question: string, limit = 4): Note[] {
  const wanted = terms(question);
  if (wanted.length === 0) return [];

  return notes
    .map((note) => {
      const searchable = terms([
        note.title,
        note.slug,
        note.tags.join(" "),
        note.concepts.join(" "),
        note.raw,
      ].join(" "));
      const score = wanted.reduce((total, term) => total + (sharesTerm(searchable, term) ? 1 : 0), 0);
      return { note, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.note.title.localeCompare(b.note.title))
    .slice(0, limit)
    .map(({ note }) => note);
}

function extractLiteralRules(notes: Note[]): string[] {
  const seen = new Set<string>();
  const rules: string[] = [];
  for (const note of notes) {
    const fragments = `${note.title}. ${note.raw}`
      .replace(/\r/g, "")
      .split(/[\n.!?]+/)
      .map((fragment) => fragment.replace(/\s+/g, " ").trim())
      .filter((fragment) => /\b(?:não|sem|nunca|apenas|somente|obrigad[oa]|proibid[oa])\b/i.test(fragment));
    for (const fragment of fragments) {
      const key = fragment.toLowerCase();
      if (!fragment || seen.has(key)) continue;
      seen.add(key);
      rules.push(fragment);
    }
  }
  return rules.slice(0, 8);
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

export function buildChatFollowup(notes: Note[], question: string): string {
  const relevant = selectRelevantNotes(notes, question);
  const context = relevant.length > 0
    ? formatContextForChat(relevant)
    : "Nenhuma camada correspondeu claramente às palavras da pergunta.";
  const literalRules = extractLiteralRules(relevant);
  return [
    FOLLOW_UP_HEADER,
    "",
    "## DECISÃO PRIORITÁRIA",
    "",
    "Se o histórico disser algo diferente, descarte o histórico e siga estas frases literais:",
    literalRules.length > 0
      ? literalRules.map((rule) => `- ${rule}`).join("\n")
      : "- Não há uma regra negativa explícita nas camadas encontradas; não invente uma preferência.",
    "",
    "## REGRAS LITERAIS RELEVANTES",
    "",
    context,
    "",
    "## PERGUNTA",
    "",
    question.trim(),
  ].join("\n");
}
