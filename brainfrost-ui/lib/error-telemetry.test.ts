import { describe, expect, test } from "vitest";
import { sanitizeTelemetryMessage } from "./error-telemetry";

describe("sanitizeTelemetryMessage", () => {
  test("remove chaves conhecidas e normaliza espaços", () => {
    const sanitized = sanitizeTelemetryMessage(
      "Falhou com sk-or-v1-1234567890abcdefghijkl e Bearer token.secreto.valor\n agora"
    );

    expect(sanitized).toBe("Falhou com [REDACTED] e [REDACTED] agora");
  });

  test("limita mensagens extensas", () => {
    expect(sanitizeTelemetryMessage("a".repeat(800))).toHaveLength(500);
  });
});
