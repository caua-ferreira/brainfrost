/**
 * Adaptador de LLM para o chat no browser. Reusa o vocabulário do
 * brainfrost-cli/src/providers.js (openai/anthropic/ollama/gemini/cortex)
 * mas roda client-side — cada usuário traz a própria chave, o fetch sai
 * direto do browser pro provedor. Nada passa por servidor do BrainFrost.
 */

export type ChatApi = "openai" | "anthropic" | "ollama" | "openrouter" | "gemini" | "cortex";

export interface ChatConfig {
  /** Nome que o dono escolhe pra identificar essa config (ex.: "Claude Pessoal"). */
  label: string;
  api: ChatApi;
  url: string;
  model: string;
  apiKey: string;
  /**
   * Segundo segredo, usado pelo Cortex (PAT do Snowflake). Chave normal
   * fica em `apiKey`; account URL vai em `url`.
   */
  extraKey?: string;
  headers?: Record<string, string>;
  /**
   * Marca a config como "força browser mesmo em API que resiste"
   * (Anthropic). Adiciona o header explícito exigido pela Anthropic.
   */
  dangerouslyAllowBrowser?: boolean;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface PresetField {
  key: "apiKey" | "extraKey" | "url" | "model";
  label: string;
  placeholder?: string;
  type?: "password" | "text";
  hint?: string;
}

export interface ProviderPreset {
  key: string;
  label: string;
  /** Uma linha, aparece embaixo do label no card. */
  tagline: string;
  /** Ícone visual (emoji ou glifo curto). */
  glyph: string;
  api: ChatApi;
  url: string;
  model: string;
  headers?: Record<string, string>;
  dangerouslyAllowBrowser?: boolean;
  /**
   * Campos que o modal de conectar deve pedir. Se vazio, o preset é
   * one-click (ex.: Ollama local, se estiver rodando).
   */
  needs: PresetField[];
  /** true = costuma funcionar no browser. false = provavelmente CORS. */
  browserFriendly: boolean;
  /** Aviso extra pra colocar no rodapé do modal. */
  warning?: string;
}

const OPENROUTER_HEADERS = {
  "HTTP-Referer": "https://brainfrost.vercel.app",
  "X-Title": "BrainFrost",
};

/** Cards que aparecem na grade do picker, na ordem exibida. */
export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    key: "claude",
    label: "Claude",
    tagline: "via OpenRouter — funciona no browser",
    glyph: "🧠",
    api: "openai",
    url: "https://openrouter.ai/api/v1/chat/completions",
    model: "anthropic/claude-sonnet-4.5",
    headers: OPENROUTER_HEADERS,
    browserFriendly: true,
    needs: [
      {
        key: "apiKey",
        label: "chave OpenRouter",
        placeholder: "sk-or-v1-...",
        type: "password",
        hint: "Crie em openrouter.ai/keys — cobre Claude, GPT e Gemini na mesma chave.",
      },
    ],
  },
  {
    key: "gpt",
    label: "ChatGPT",
    tagline: "GPT-4o via OpenRouter",
    glyph: "💬",
    api: "openai",
    url: "https://openrouter.ai/api/v1/chat/completions",
    model: "openai/gpt-4o",
    headers: OPENROUTER_HEADERS,
    browserFriendly: true,
    needs: [
      {
        key: "apiKey",
        label: "chave OpenRouter",
        placeholder: "sk-or-v1-...",
        type: "password",
        hint: "Mesma chave do card Claude — OpenRouter revende os dois.",
      },
    ],
  },
  {
    key: "gemini",
    label: "Gemini",
    tagline: "Google — API direta",
    glyph: "✦",
    api: "gemini",
    url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent",
    model: "gemini-3.6-flash",
    browserFriendly: true,
    needs: [
      {
        key: "apiKey",
        label: "chave Google AI Studio",
        placeholder: "AIza...",
        type: "password",
        hint: "Crie em aistudio.google.com/apikey (gratuito com limite generoso).",
      },
    ],
  },
  {
    key: "cortex",
    label: "Snowflake Cortex",
    tagline: "requer account URL + PAT",
    glyph: "❄",
    api: "cortex",
    url: "",
    model: "claude-sonnet-4-5",
    browserFriendly: false,
    warning:
      "O Snowflake costuma bloquear browser por CORS. Se der erro de rede, use `bfrost ask --provider cortex` no CLI.",
    needs: [
      {
        key: "url",
        label: "account URL",
        placeholder: "https://xy12345.us-east-1.snowflakecomputing.com",
        type: "text",
        hint: "Sua URL do Snowflake — a mesma que aparece no worksheet.",
      },
      {
        key: "apiKey",
        label: "PAT (Personal Access Token)",
        placeholder: "eyJ...",
        type: "password",
        hint: "Crie em Snowflake → Users → seu user → Personal Access Tokens.",
      },
      {
        key: "model",
        label: "modelo Cortex",
        placeholder: "claude-sonnet-4-5",
        type: "text",
      },
    ],
  },
  {
    key: "claude-direct",
    label: "Claude direto",
    tagline: "API Anthropic — avançado",
    glyph: "🅰",
    api: "anthropic",
    url: "https://api.anthropic.com/v1/messages",
    model: "claude-sonnet-4-5",
    dangerouslyAllowBrowser: true,
    browserFriendly: false,
    warning:
      "Requer o header dangerous-direct-browser-access. A Anthropic recomenda proxy — prefira o card Claude (OpenRouter).",
    needs: [
      {
        key: "apiKey",
        label: "chave Anthropic",
        placeholder: "sk-ant-...",
        type: "password",
      },
    ],
  },
  {
    key: "ollama",
    label: "Ollama local",
    tagline: "modelo rodando na sua máquina",
    glyph: "🦙",
    api: "ollama",
    url: "http://localhost:11434/api/chat",
    model: "llama3.1",
    browserFriendly: true,
    warning:
      "Rode com OLLAMA_ORIGINS=https://brainfrost.vercel.app se der CORS.",
    needs: [
      {
        key: "model",
        label: "modelo instalado",
        placeholder: "llama3.1",
        type: "text",
      },
    ],
  },
  {
    key: "lmstudio",
    label: "LM Studio local",
    tagline: "endpoint OpenAI-compatible",
    glyph: "🖥",
    api: "openai",
    url: "http://localhost:1234/v1/chat/completions",
    model: "",
    browserFriendly: true,
    needs: [
      {
        key: "model",
        label: "nome do modelo carregado",
        placeholder: "seu-modelo",
        type: "text",
      },
    ],
  },
  {
    key: "custom",
    label: "Custom",
    tagline: "outro endpoint OpenAI-compatible",
    glyph: "⚙",
    api: "openai",
    url: "",
    model: "",
    browserFriendly: true,
    needs: [
      { key: "url", label: "url", placeholder: "https://…", type: "text" },
      { key: "model", label: "modelo", type: "text" },
      { key: "apiKey", label: "chave (Bearer)", type: "password" },
    ],
  },
];

export function findPreset(key: string): ProviderPreset | null {
  return PROVIDER_PRESETS.find((p) => p.key === key) ?? null;
}

function buildHeaders(config: ChatConfig): Record<string, string> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...(config.headers ?? {}),
  };
  if (config.api === "anthropic") {
    headers["x-api-key"] = config.apiKey;
    headers["anthropic-version"] = "2023-06-01";
    if (config.dangerouslyAllowBrowser) {
      headers["anthropic-dangerous-direct-browser-access"] = "true";
    }
  } else if (config.api === "gemini") {
    // Gemini aceita chave em header — mais seguro que na query string.
    headers["x-goog-api-key"] = config.apiKey;
  } else if (config.api === "cortex") {
    // PAT do Snowflake vai como Bearer.
    headers.Authorization = `Bearer ${config.apiKey}`;
    headers["X-Snowflake-Authorization-Token-Type"] = "PROGRAMMATIC_ACCESS_TOKEN";
  } else if (config.api === "ollama") {
    // Sem auth por padrão.
  } else {
    headers.Authorization = `Bearer ${config.apiKey}`;
  }
  return headers;
}

function toGeminiContents(messages: ChatMessage[]) {
  return messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
}

function toCortexStatement(model: string, messages: ChatMessage[]) {
  // Cortex COMPLETE aceita string ou array de messages. Usamos o array pra
  // preservar histórico multiturno. Escapamos aspas simples do usuário.
  const jsonMessages = JSON.stringify(messages).replace(/'/g, "''");
  return `SELECT SNOWFLAKE.CORTEX.COMPLETE('${model}', PARSE_JSON('${jsonMessages}')) AS resposta`;
}

function buildBody(config: ChatConfig, messages: ChatMessage[]) {
  const model = config.model;
  if (config.api === "anthropic") {
    return { model, max_tokens: 4096, messages };
  }
  if (config.api === "ollama") {
    return { model, messages, stream: false };
  }
  if (config.api === "gemini") {
    return { contents: toGeminiContents(messages) };
  }
  if (config.api === "cortex") {
    return {
      statement: toCortexStatement(model, messages),
      timeout: 60,
    };
  }
  return { model, messages };
}

function extractGemini(data: unknown): string {
  const d = data as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    error?: { message?: string };
  };
  if (d.error?.message) throw new Error(d.error.message);
  const parts = d.candidates?.[0]?.content?.parts;
  if (parts) return parts.map((p) => p?.text ?? "").join("").trim();
  return JSON.stringify(data, null, 2);
}

function extractCortex(data: unknown): string {
  const d = data as {
    data?: Array<Array<string>>;
    message?: string;
  };
  if (d.message && !d.data) throw new Error(d.message);
  const cell = d.data?.[0]?.[0];
  if (!cell) return JSON.stringify(data, null, 2);
  // Cortex devolve JSON serializado; tenta parsear pra pegar a resposta.
  try {
    const parsed = JSON.parse(cell) as { choices?: Array<{ messages?: string; message?: { content?: string } }> };
    const first = parsed.choices?.[0];
    if (first?.message?.content) return first.message.content.trim();
    if (typeof first?.messages === "string") return first.messages.trim();
  } catch {
    // Não era JSON, devolve como veio.
  }
  return cell.trim();
}

function extractText(data: unknown, api: ChatApi): string {
  if (api === "gemini") return extractGemini(data);
  if (api === "cortex") return extractCortex(data);
  const d = data as {
    content?: Array<{ text?: string }>;
    choices?: Array<{ message?: { content?: string } }>;
    message?: { content?: string };
    response?: string;
    error?: { message?: string } | string;
  };
  if (Array.isArray(d.content)) {
    return d.content.map((b) => b?.text ?? "").join("").trim();
  }
  if (d.choices?.[0]?.message?.content) return d.choices[0].message.content.trim();
  if (d.message?.content) return d.message.content.trim();
  if (typeof d.response === "string") return d.response.trim();
  const err = typeof d.error === "string" ? d.error : d.error?.message;
  if (err) throw new Error(err);
  return JSON.stringify(data, null, 2);
}

function targetUrl(config: ChatConfig): string {
  if (config.api === "cortex") {
    const base = config.url.replace(/\/+$/, "");
    return `${base}/api/v2/statements`;
  }
  return config.url;
}

/**
 * Envia as mensagens pro provedor configurado e devolve o texto da resposta.
 * Erros de rede (CORS incluso) sobem como Error com mensagem legível — o
 * caller decide como mostrar.
 */
export async function sendChat(config: ChatConfig, messages: ChatMessage[]): Promise<string> {
  const url = targetUrl(config);
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: buildHeaders(config),
      body: JSON.stringify(buildBody(config, messages)),
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Não consegui alcançar ${url}. Costuma ser CORS (o provedor bloqueia browser) ou rede. Detalhe: ${detail}`
    );
  }

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`${config.label} respondeu ${response.status}: ${raw.slice(0, 400)}`);
  }
  try {
    return extractText(JSON.parse(raw), config.api);
  } catch (error) {
    if (error instanceof Error) throw error;
    return raw;
  }
}
