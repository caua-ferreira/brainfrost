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

export const EXTRACTION_SYSTEM_PROMPT = `Você é um extrator de padrões TÉCNICOS de código e documentação.

Seu ÚNICO domínio é engenharia de software: regras de projeto, decisões de
arquitetura, armadilhas, convenções, ferramentas, processos de equipe.

REGRAS ABSOLUTAS:
- IGNORE conhecimento geral (geografia, biologia, história, cultura, etc.). Se o texto
  não tem padrão técnico, devolva {"suggestions": []}.
- Só extraia padrões DURÁVEIS que o dono possa repetir em outros projetos.
- NUNCA inclua código específico, nomes de variáveis, ou trivialidades.
- Descarte segredos/chaves/senhas — se aparecerem, pule.

CATEGORIAS VÁLIDAS (use exatamente uma):
- padroes_codigo         (como escrever, lint, style, formato de commit)
- padroes_arquitetura    (SQL, modelagem, pipelines, decisões estruturais)
- contexto_trabalho      (equipes, processos, ferramentas do dia a dia)
- padrao_webapp          (stack de web app, armadilhas de framework, RLS)
- glossario              (nomes internos do time)
- projeto                (contexto específico de um projeto)
- log_aprendizados       (decisão tomada em uma data)

FORMATO DA RESPOSTA: só JSON válido, nada mais.
{
  "suggestions": [
    {"title": "...", "body": "...", "category": "...", "evidence": "..."}
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
