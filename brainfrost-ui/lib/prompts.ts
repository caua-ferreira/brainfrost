/**
 * Prompt compartilhado entre a rota API server-side (Claude/Gemini) e o
 * cliente WebLLM. Manter idêntico é o que garante que trocar de provedor
 * não muda a shape das sugestões.
 */

export const VALID_CATEGORIES = [
  "padroes_codigo",
  "padroes_arquitetura",
  "contexto_trabalho",
  "padrao_webapp",
  "glossario",
  "projeto",
  "log_aprendizados",
] as const;

export type Category = (typeof VALID_CATEGORIES)[number];

export const isCategory = (s: string): s is Category =>
  (VALID_CATEGORIES as readonly string[]).includes(s);

export interface LlmSuggestion {
  title: string;
  body: string;
  category: string;
  category_reason?: string;
  category_confidence?: number;
  concepts?: string[];
  links?: Array<{ slug: string; reason?: string }>;
  evidence?: string;
}

export interface ExistingPattern {
  slug?: string;
  title: string;
  body?: string | null;
  category: string;
}

export const LOCAL_ANALYSIS_CHUNK_CHARS = 8_000;
export const MAX_ANALYSIS_INPUT_CHARS = 120_000;

/**
 * Mantém importações grandes utilizáveis sem estourar a janela da LLM.
 * A amostra preserva começo, meio e fim, onde normalmente ficam README,
 * decisões e instruções finais, em vez de simplesmente truncar o arquivo.
 */
export function sampleAnalysisText(
  text: string,
  maxChars = MAX_ANALYSIS_INPUT_CHARS
): string {
  const clean = text.trim();
  if (clean.length <= maxChars) return clean;

  const separator = "\n\n[... trecho intermediário omitido para caber na análise ...]\n\n";
  const available = Math.max(3, maxChars - separator.length * 2);
  const firstSize = Math.ceil(available * 0.4);
  const middleSize = Math.floor(available * 0.3);
  const lastSize = available - firstSize - middleSize;
  const middleStart = Math.max(firstSize, Math.floor((clean.length - middleSize) / 2));

  return [
    clean.slice(0, firstSize),
    clean.slice(middleStart, middleStart + middleSize),
    clean.slice(-lastSize),
  ].join(separator);
}

/**
 * Divide importações grandes sem descartar conteúdo. Prioriza quebras de
 * parágrafo/linha para não cortar uma regra no meio e usa corte rígido apenas
 * quando um único bloco já é maior que o limite.
 */
export function splitAnalysisText(
  text: string,
  maxChars = LOCAL_ANALYSIS_CHUNK_CHARS
): string[] {
  const clean = text.trim();
  if (!clean) return [];
  if (clean.length <= maxChars) return [clean];

  const chunks: string[] = [];
  let remaining = clean;

  while (remaining.length > maxChars) {
    const window = remaining.slice(0, maxChars + 1);
    const paragraphBreak = window.lastIndexOf("\n\n");
    const lineBreak = window.lastIndexOf("\n");
    const spaceBreak = window.lastIndexOf(" ");
    const minimumUsefulBreak = Math.floor(maxChars * 0.6);
    const candidates = [paragraphBreak, lineBreak, spaceBreak].filter(
      (position) => position >= minimumUsefulBreak
    );
    const cutAt = candidates.length > 0 ? Math.max(...candidates) : maxChars;

    chunks.push(remaining.slice(0, cutAt).trim());
    remaining = remaining.slice(cutAt).trimStart();
  }

  if (remaining.trim()) chunks.push(remaining.trim());
  return chunks;
}

const STOP_WORDS = new Set(["a", "ao", "aos", "as", "com", "como", "da", "das", "de", "do", "dos", "e", "em", "na", "nas", "no", "nos", "o", "os", "para", "por", "que", "sem", "um", "uma"]);

function semanticTokens(value: string) {
  return new Set(value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token)));
}

function similarity(left: string, right: string) {
  const a = semanticTokens(left);
  const b = semanticTokens(right);
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection++;
  return intersection / Math.min(a.size, b.size);
}

function equivalent(left: { title: string; body?: string | null }, right: { title: string; body?: string | null }) {
  const titleScore = similarity(left.title, right.title);
  const contentScore = similarity(`${left.title} ${left.body ?? ""}`, `${right.title} ${right.body ?? ""}`);
  return titleScore >= 0.72 || contentScore >= 0.82;
}

export function filterNovelSuggestions(suggestions: LlmSuggestion[], existing: ExistingPattern[] = []): LlmSuggestion[] {
  const accepted: LlmSuggestion[] = [];
  for (const suggestion of suggestions) {
    if (!suggestion.title?.trim() || !suggestion.body?.trim()) continue;
    if (existing.some((pattern) => equivalent(suggestion, pattern))) continue;
    if (accepted.some((pattern) => equivalent(suggestion, pattern))) continue;
    accepted.push(suggestion);
  }
  return accepted;
}

export function dedupeSuggestions(suggestions: LlmSuggestion[]): LlmSuggestion[] {
  return filterNovelSuggestions(suggestions);
}

export const EXTRACTION_SYSTEM_PROMPT = `Você é um extrator de padrões TÉCNICOS de código e documentação.

Seu ÚNICO domínio é engenharia de software: regras de projeto, decisões de
arquitetura, armadilhas, convenções, ferramentas, processos de equipe.

REGRAS ABSOLUTAS:
- IGNORE conhecimento geral (geografia, biologia, história, cultura, etc.). Se o texto
  não tem padrão técnico, devolva {"suggestions": []}.
- Só extraia padrões DURÁVEIS que o dono possa repetir em outros projetos.
- NUNCA inclua código específico, nomes de variáveis, ou trivialidades.
- Descarte segredos/chaves/senhas — se aparecerem, pule.
- Retorne no máximo 5 sugestões, priorizando as mais úteis e recorrentes.
- NÃO sugira algo equivalente a uma memória ou sugestão já existente enviada no catálogo.
- Seja conciso: title, body, category_reason, evidence e motivos dos links devem ter uma frase curta.

CATEGORIAS VÁLIDAS (use exatamente uma):
- padroes_codigo         (como escrever, lint, style, formato de commit)
- padroes_arquitetura    (SQL, modelagem, pipelines, decisões estruturais)
- contexto_trabalho      (equipes, processos, ferramentas do dia a dia)
- padrao_webapp          (stack de web app, armadilhas de framework, RLS)
- glossario              (nomes internos do time)
- projeto                (contexto específico de um projeto)
- log_aprendizados       (decisão tomada em uma data)

CONCEITOS E LIGAÇÕES:
- concepts deve conter de 1 a 5 conceitos curtos que a camada representa.
- links só pode apontar para slugs da lista CAMADAS EXISTENTES enviada junto do texto.
- Sugira no máximo 5 links e explique brevemente o motivo de cada ligação.
- Se não houver uma ligação clara, use []. Nunca invente slug.
- category_reason deve explicar por que a gaveta escolhida é adequada.
- category_confidence deve ser um número entre 0 e 1.

FORMATO DA RESPOSTA: só JSON válido, nada mais.
{
  "suggestions": [
    {
      "title": "...",
      "body": "...",
      "category": "...",
      "category_reason": "...",
      "category_confidence": 0.92,
      "concepts": ["..."],
      "links": [{"slug": "slug-existente", "reason": "..."}],
      "evidence": "..."
    }
  ]
}

EXEMPLOS:

Entrada: "sempre usar TypeScript strict mode com noImplicitAny=true"
Saída: {"suggestions":[{"title":"TypeScript strict mode obrigatório","body":"Todos os projetos ativam strict mode com noImplicitAny para pegar erros de tipo cedo.","category":"padroes_codigo","evidence":"tsconfig.json"}]}

Entrada: "a Amazônia tem grande diversidade biológica"
Saída: {"suggestions":[]}

Entrada: "commits sempre no formato conventional commits, com scope opcional. Nada de coautoria."
Saída: {"suggestions":[{"title":"Commits em Conventional Commits sem coautoria","body":"Formato tipo(scope): descrição. Scope opcional mas encorajado quando o commit toca área específica. Coautoria não é usada.","category":"padroes_codigo","evidence":"CONTRIBUTING.md"}]}

Entrada: "receita de bolo de cenoura: 2 ovos, 3 cenouras..."
Saída: {"suggestions":[]}

Nada de preâmbulo. Nada de markdown fence. Apenas o JSON.`;

export function buildExtractionInput(
  text: string,
  existingNotes: ExistingPattern[] = []
) {
  const catalog = existingNotes.length === 0
    ? "(nenhuma camada existente; não sugira links)"
    : existingNotes
        .map((note) => `- ${note.slug ?? "sugestao-pendente"} | ${note.title} | ${note.body?.slice(0, 240) ?? ""} | categoria: ${note.category}`)
        .join("\n");

  return `${text}\n\nMEMÓRIAS E SUGESTÕES EXISTENTES (não repita ideias equivalentes; use somente slugs reais em links):\n${catalog}`;
}

export function parseSuggestionsJson(raw: string): LlmSuggestion[] {
  const jsonStart = raw.indexOf("{");
  const jsonEnd = raw.lastIndexOf("}");
  if (jsonStart < 0 || jsonEnd < 0) {
    throw new Error("LLM não devolveu JSON válido");
  }
  const slice = raw.slice(jsonStart, jsonEnd + 1);

  const tryParse = (s: string) => {
    const parsed = JSON.parse(s) as { suggestions?: LlmSuggestion[] };
    return parsed.suggestions ?? [];
  };

  try {
    return tryParse(slice);
  } catch {
    // LLMs pequenos (Qwen 1.5B) escorregam: chave sem aspas, aspas tortas,
    // trailing commas. Faxina barata e tenta de novo.
    const cleaned = slice
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
      .replace(/,(\s*[}\]])/g, "$1");
    return tryParse(cleaned);
  }
}
