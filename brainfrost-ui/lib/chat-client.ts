/**
 * Adaptador de LLM para o chat no browser. Reusa o vocabulário do
 * brainfrost-cli/src/providers.js (openai/anthropic/ollama) mas roda
 * client-side — cada usuário traz a própria chave, o fetch sai direto
 * do browser pro provedor. Nada passa por servidor do BrainFrost.
 */

export type ChatApi = "openai" | "anthropic" | "ollama" | "openrouter";

export interface ChatConfig {
  /** Nome que o dono escolhe pra identificar essa config (ex.: "OpenRouter Claude"). */
  label: string;
  api: ChatApi;
  url: string;
  model: string;
  apiKey: string;
  /**
   * Headers extras arbitrários (para providers custom). O adaptador já
   * preenche Authorization/x-api-key conforme o api; use isto pra coisas
   * como `HTTP-Referer` do OpenRouter.
   */
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

/** Presets que aparecem no dropdown do formulário. */
export const CHAT_PRESETS: Array<Omit<ChatConfig, "apiKey" | "label"> & {
  key: string;
  label: string;
  hint: string;
  browserFriendly: boolean;
}> = [
  {
    key: "openrouter",
    label: "OpenRouter (recomendado)",
    api: "openai",
    url: "https://openrouter.ai/api/v1/chat/completions",
    model: "anthropic/claude-sonnet-4.5",
    headers: {
      "HTTP-Referer": "https://brainfrost.vercel.app",
      "X-Title": "BrainFrost",
    },
    hint: "Aceita chamada do browser e revende Claude, GPT, Gemini, Llama etc.",
    browserFriendly: true,
  },
  {
    key: "ollama-local",
    label: "Ollama local",
    api: "ollama",
    url: "http://localhost:11434/api/chat",
    model: "llama3.1",
    hint: "Rode com OLLAMA_ORIGINS=https://brainfrost.vercel.app se der CORS.",
    browserFriendly: true,
  },
  {
    key: "lmstudio-local",
    label: "LM Studio local",
    api: "openai",
    url: "http://localhost:1234/v1/chat/completions",
    model: "",
    hint: "LM Studio expõe endpoint OpenAI-compatible; ligue CORS nas settings.",
    browserFriendly: true,
  },
  {
    key: "groq",
    label: "Groq",
    api: "openai",
    url: "https://api.groq.com/openai/v1/chat/completions",
    model: "llama-3.3-70b-versatile",
    hint: "Inferência rápida com CORS habilitado.",
    browserFriendly: true,
  },
  {
    key: "anthropic-direct",
    label: "Anthropic direto (avançado)",
    api: "anthropic",
    url: "https://api.anthropic.com/v1/messages",
    model: "claude-sonnet-4-5",
    dangerouslyAllowBrowser: true,
    hint: "Requer o header dangerous-direct-browser-access. Prefira OpenRouter.",
    browserFriendly: false,
  },
  {
    key: "openai-direct",
    label: "OpenAI direto (bloqueia browser)",
    api: "openai",
    url: "https://api.openai.com/v1/chat/completions",
    model: "gpt-4o",
    hint: "CORS bloqueado. Só funciona via extensão ou proxy próprio.",
    browserFriendly: false,
  },
  {
    key: "custom",
    label: "Custom",
    api: "openai",
    url: "",
    model: "",
    hint: "Configure manualmente. Escolha o api mais próximo do seu endpoint.",
    browserFriendly: true,
  },
];

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
  } else if (config.api === "ollama") {
    // Ollama local não pede autenticação por padrão.
  } else {
    // openai + openrouter usam Authorization Bearer
    headers.Authorization = `Bearer ${config.apiKey}`;
  }
  return headers;
}

function buildBody(config: ChatConfig, messages: ChatMessage[]) {
  const model = config.model;
  if (config.api === "anthropic") {
    return { model, max_tokens: 4096, messages };
  }
  if (config.api === "ollama") {
    return { model, messages, stream: false };
  }
  return { model, messages };
}

function extractText(data: unknown): string {
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

/**
 * Envia as mensagens pro provedor configurado e devolve o texto da resposta.
 * Erros de rede (CORS incluso) sobem como Error com mensagem legível — o
 * caller decide como mostrar.
 */
export async function sendChat(config: ChatConfig, messages: ChatMessage[]): Promise<string> {
  let response: Response;
  try {
    response = await fetch(config.url, {
      method: "POST",
      headers: buildHeaders(config),
      body: JSON.stringify(buildBody(config, messages)),
    });
  } catch (error) {
    // fetch lançou — geralmente é CORS ou rede caída. A mensagem do TypeError
    // não distingue, então damos uma dica prática.
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Não consegui alcançar ${config.url}. Costuma ser CORS (o provedor bloqueia browser) ou rede. Detalhe: ${detail}`
    );
  }

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`${config.label} respondeu ${response.status}: ${raw.slice(0, 400)}`);
  }
  try {
    return extractText(JSON.parse(raw));
  } catch (error) {
    if (error instanceof Error) throw error;
    return raw;
  }
}
