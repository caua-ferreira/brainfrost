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
  evidence?: string;
}

export const EXTRACTION_SYSTEM_PROMPT = `Você é um extrator de padrões técnicos.
Recebe um trecho de repositório (markdown, código, comentários) e devolve as
regras/decisões/convenções que valem para o dono repetir em outros projetos.

Regras:
- Só extraia padrões DURÁVEIS (regra de projeto, decisão de arquitetura, armadilha conhecida).
- NUNCA extraia código específico, nome de variável, ou coisa que não gera reuso.
- Corte tudo que seja segredo/chave/senha — se aparecer, ignore.
- Se não há nada de padrão real no texto, devolva array vazio.

Devolva SOMENTE um JSON válido no formato:
{
  "suggestions": [
    {
      "title": "título curto imperativo",
      "body": "explicação com o padrão, 2-4 linhas",
      "category": "padroes_codigo | padroes_arquitetura | contexto_trabalho | padrao_webapp | glossario | projeto | log_aprendizados",
      "evidence": "arquivo:linha ou trecho identificador (opcional)"
    }
  ]
}

Nada além do JSON. Sem preâmbulo, sem markdown fence.`;

export function parseSuggestionsJson(raw: string): LlmSuggestion[] {
  const jsonStart = raw.indexOf("{");
  const jsonEnd = raw.lastIndexOf("}");
  if (jsonStart < 0 || jsonEnd < 0) {
    throw new Error("LLM não devolveu JSON válido");
  }
  const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1)) as {
    suggestions?: LlmSuggestion[];
  };
  return parsed.suggestions ?? [];
}
