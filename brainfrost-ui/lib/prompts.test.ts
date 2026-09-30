import { describe, expect, test } from "vitest";
import {
  buildExtractionInput,
  dedupeSuggestions,
  splitAnalysisText,
} from "./prompts";

describe("buildExtractionInput", () => {
  test("envia o catálogo de camadas para a IA", () => {
    const input = buildExtractionInput("texto novo", [
      { slug: "energia", title: "Energia", category: "glossario" },
    ]);

    expect(input).toContain("texto novo");
    expect(input).toContain("energia | Energia | categoria: glossario");
    expect(input).toContain("use somente estes slugs");
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
});
