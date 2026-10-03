import { describe, expect, test } from "vitest";
import {
  buildExtractionInput,
  dedupeSuggestions,
  filterNovelSuggestions,
  parseSuggestionsJson,
  sampleAnalysisText,
  splitAnalysisText,
} from "./prompts";

describe("buildExtractionInput", () => {
  test("envia o catálogo de camadas para a IA", () => {
    const input = buildExtractionInput("texto novo", [
      { slug: "energia", title: "Energia", category: "glossario" },
    ]);

    expect(input).toContain("texto novo");
    expect(input).toContain("energia | Energia |  | categoria: glossario");
    expect(input).toContain("não repita ideias equivalentes");
  });

  test("bloqueia ligações quando não há camadas existentes", () => {
    expect(buildExtractionInput("texto novo")).toContain("nenhuma camada existente");
  });
});

describe("splitAnalysisText", () => {
  test("mantém textos pequenos em um único bloco", () => {
    expect(splitAnalysisText("regra curta", 100)).toEqual(["regra curta"]);
  });

  test("divide textos grandes sem perder o conteúdo", () => {
    const text = "primeiro parágrafo\n\nsegundo parágrafo\n\nterceiro parágrafo";
    const chunks = splitAnalysisText(text, 30);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.join(" ").replace(/\s+/g, " ")).toBe(text.replace(/\s+/g, " "));
    expect(chunks.every((chunk) => chunk.length <= 30)).toBe(true);
  });

  test("faz corte rígido quando não há separadores", () => {
    const chunks = splitAnalysisText("a".repeat(25), 10);
    expect(chunks.map((chunk) => chunk.length)).toEqual([10, 10, 5]);
  });
});

describe("dedupeSuggestions", () => {
  test("remove sugestões idênticas geradas em blocos diferentes", () => {
    const suggestion = {
      title: "Sem coautoria",
      body: "Commits não usam coautoria.",
      category: "padroes_codigo",
    };

    expect(dedupeSuggestions([suggestion, { ...suggestion }])).toEqual([suggestion]);
  });

  test("remove uma sugestão semanticamente equivalente a uma memória", () => {
    const suggestions = [{
      title: "Commits sem coautoria",
      body: "Não adicionar coautoria de ferramentas aos commits.",
      category: "padroes_codigo",
    }];

    expect(filterNovelSuggestions(suggestions, [{
      slug: "omitir-coautoria",
      title: "Omitir coautoria em commits",
      body: "Commits de produção não devem incluir coautoria de IA.",
      category: "padroes_codigo",
    }])).toEqual([]);
  });
});

describe("sampleAnalysisText", () => {
  test("preserva começo, meio e fim dentro do limite", () => {
    const text = `${"A".repeat(100)}${"B".repeat(100)}${"C".repeat(100)}`;
    const sampled = sampleAnalysisText(text, 180);

    expect(sampled.length).toBeLessThanOrEqual(180);
    expect(sampled).toContain("AAAA");
    expect(sampled).toContain("BBBB");
    expect(sampled).toContain("CCCC");
  });
});

describe("parseSuggestionsJson", () => {
  test("aceita JSON cercado por texto ou markdown", () => {
    const parsed = parseSuggestionsJson(`\`\`\`json
      {"suggestions":[{"title":"Commits","body":"Use Conventional Commits."}]}
      \`\`\``);

    expect(parsed).toHaveLength(1);
    expect(parsed[0].title).toBe("Commits");
  });

  test("corrige aspas tipográficas, chaves sem aspas e trailing comma", () => {
    const parsed = parseSuggestionsJson(
      `{suggestions: [{title: “Sem coautoria”, body: “Não adicionar coautoria.”,}],}`
    );

    expect(parsed).toEqual([
      { title: "Sem coautoria", body: "Não adicionar coautoria." },
    ]);
  });

  test("rejeita respostas sem um objeto JSON completo", () => {
    expect(() => parseSuggestionsJson("resposta interrompida")).toThrow(
      "LLM não devolveu JSON válido"
    );
  });
});
