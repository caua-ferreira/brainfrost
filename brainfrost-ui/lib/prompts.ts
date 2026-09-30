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

export const LOCAL_ANALYSIS_CHUNK_CHARS = 8_000;

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

export function dedupeSuggestions(suggestions: LlmSuggestion[]): LlmSuggestion[] {
  const seen = new Set<string>();
  return suggestions.filter((suggestion) => {
    const key = `${suggestion.title}|${suggestion.body}`
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
  existingNotes: Array<{ slug: string; title: string; category: string }> = []
) {
  const catalog = existingNotes.length === 0
    ? "(nenhuma camada existente; não sugira links)"
    : existingNotes
        .map((note) => `- ${note.slug} | ${note.title} | categoria: ${note.category}`)
        .join("\n");

  return `${text}\n\nCAMADAS EXISTENTES (use somente estes slugs em links):\n${catalog}`;
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
