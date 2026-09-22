import { test, expect, describe, beforeEach, afterEach, vi } from "vitest";
import { sendChat, PROVIDER_PRESETS, findPreset, type ChatConfig } from "./chat-client";

function baseConfig(overrides: Partial<ChatConfig>): ChatConfig {
  return {
    label: "test",
    api: "openai",
    url: "https://example.test/v1/chat",
    model: "test-model",
    apiKey: "TOKEN",
    ...overrides,
  };
}

// Guarda o fetch global pra restaurar depois — cada teste mocka do zeu jeito.
const originalFetch = globalThis.fetch;

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function mockFetchOnce(response: {
  ok?: boolean;
  status?: number;
  body: unknown;
}) {
  const spy = vi.fn(async (_url: string, _init?: RequestInit) => {
    return {
      ok: response.ok ?? true,
      status: response.status ?? 200,
      text: async () =>
        typeof response.body === "string" ? response.body : JSON.stringify(response.body),
    } as Response;
  });
  globalThis.fetch = spy as unknown as typeof fetch;
  return spy;
}

describe("PROVIDER_PRESETS", () => {
  test("expõe pelo menos claude, gpt, gemini, cortex", () => {
    const keys = PROVIDER_PRESETS.map((p) => p.key);
    for (const k of ["claude", "gpt", "gemini", "cortex", "ollama", "custom"]) {
      expect(keys).toContain(k);
    }
  });

  test("findPreset devolve null pra chave desconhecida", () => {
    expect(findPreset("nao-existe")).toBeNull();
    expect(findPreset("claude")?.api).toBe("openai");
  });
});

describe("sendChat — headers e body por api", () => {
  test("openai: Authorization Bearer + messages passthrough", async () => {
    const spy = mockFetchOnce({
      body: { choices: [{ message: { content: "resposta" } }] },
    });
    const cfg = baseConfig({ api: "openai" });
    const text = await sendChat(cfg, [{ role: "user", content: "oi" }]);
    expect(text).toBe("resposta");
    const call = spy.mock.calls[0];
    const headers = (call[1] as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer TOKEN");
    expect(headers["content-type"]).toBe("application/json");
    const body = JSON.parse((call[1] as RequestInit).body as string);
    expect(body.model).toBe("test-model");
    expect(body.messages).toEqual([{ role: "user", content: "oi" }]);
  });

  test("anthropic: x-api-key + version + max_tokens no body", async () => {
    const spy = mockFetchOnce({
      body: { content: [{ text: "resposta anthropic" }] },
    });
    const cfg = baseConfig({ api: "anthropic" });
    const text = await sendChat(cfg, [{ role: "user", content: "oi" }]);
    expect(text).toBe("resposta anthropic");
    const headers = (spy.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("TOKEN");
    expect(headers["anthropic-version"]).toBe("2023-06-01");
    expect(headers["anthropic-dangerous-direct-browser-access"]).toBeUndefined();
    const body = JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string);
    expect(body.max_tokens).toBeGreaterThan(0);
  });

  test("anthropic com dangerouslyAllowBrowser adiciona o header explícito", async () => {
    mockFetchOnce({ body: { content: [{ text: "ok" }] } });
    const cfg = baseConfig({ api: "anthropic", dangerouslyAllowBrowser: true });
    await sendChat(cfg, [{ role: "user", content: "x" }]);
    const headers = (vi.mocked(globalThis.fetch).mock.calls[0][1] as RequestInit).headers as Record<
      string,
      string
    >;
    expect(headers["anthropic-dangerous-direct-browser-access"]).toBe("true");
  });

  test("gemini: x-goog-api-key + contents com role model", async () => {
    const spy = mockFetchOnce({
      body: {
        candidates: [{ content: { parts: [{ text: "resposta gemini" }] } }],
      },
    });
    const cfg = baseConfig({ api: "gemini" });
    const text = await sendChat(cfg, [
      { role: "user", content: "oi" },
      { role: "assistant", content: "olá" },
      { role: "user", content: "outra" },
    ]);
    expect(text).toBe("resposta gemini");
    const headers = (spy.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers["x-goog-api-key"]).toBe("TOKEN");
    const body = JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string);
    expect(body.contents).toEqual([
      { role: "user", parts: [{ text: "oi" }] },
      { role: "model", parts: [{ text: "olá" }] },
      { role: "user", parts: [{ text: "outra" }] },
    ]);
  });

  test("ollama: sem auth, stream:false", async () => {
    const spy = mockFetchOnce({
      body: { message: { content: "resposta ollama" } },
    });
    const cfg = baseConfig({ api: "ollama", url: "http://localhost:11434/api/chat" });
    const text = await sendChat(cfg, [{ role: "user", content: "oi" }]);
    expect(text).toBe("resposta ollama");
    const headers = (spy.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
    const body = JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string);
    expect(body.stream).toBe(false);
  });

  test("cortex: monta SQL SELECT SNOWFLAKE.CORTEX.COMPLETE e usa /api/v2/statements", async () => {
    const spy = mockFetchOnce({
      body: {
        data: [
          [
            JSON.stringify({ choices: [{ messages: "resposta cortex" }] }),
          ],
        ],
      },
    });
    const cfg = baseConfig({
      api: "cortex",
      url: "https://x.snowflakecomputing.com",
      model: "claude-sonnet-4-5",
    });
    const text = await sendChat(cfg, [{ role: "user", content: "oi" }]);
    expect(text).toBe("resposta cortex");
    const url = spy.mock.calls[0][0] as string;
    expect(url).toBe("https://x.snowflakecomputing.com/api/v2/statements");
    const headers = (spy.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer TOKEN");
    expect(headers["X-Snowflake-Authorization-Token-Type"]).toBe("PROGRAMMATIC_ACCESS_TOKEN");
    const body = JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string);
    expect(body.statement).toMatch(/SELECT SNOWFLAKE\.CORTEX\.COMPLETE/);
    expect(body.statement).toMatch(/claude-sonnet-4-5/);
  });
});

describe("sendChat — erros amigáveis", () => {
  test("fetch throw (CORS/rede) vira Error com dica de CORS", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof fetch;
    const cfg = baseConfig({});
    await expect(sendChat(cfg, [{ role: "user", content: "x" }])).rejects.toThrow(
      /CORS|Failed to fetch/
    );
  });

  test("resposta não-ok inclui status e primeiros bytes do corpo", async () => {
    mockFetchOnce({
      ok: false,
      status: 401,
      body: '{"error": "invalid key"}',
    });
    const cfg = baseConfig({ label: "MeuProvedor" });
    await expect(sendChat(cfg, [{ role: "user", content: "x" }])).rejects.toThrow(
      /MeuProvedor respondeu 401/
    );
  });

  test("openai devolve error.message → propaga", async () => {
    mockFetchOnce({ body: { error: { message: "modelo não existe" } } });
    const cfg = baseConfig({});
    await expect(sendChat(cfg, [{ role: "user", content: "x" }])).rejects.toThrow(
      /modelo não existe/
    );
  });
});
