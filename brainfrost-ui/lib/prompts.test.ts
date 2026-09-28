import { describe, expect, test } from "vitest";
import { buildExtractionInput } from "./prompts";

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
