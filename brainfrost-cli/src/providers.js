import { spawn } from "node:child_process";

/**
 * Três jeitos de entregar o prompt, e qualquer IA cai em um deles:
 *   print  — imprime e você cola onde quiser (ChatGPT, Claude.ai, worksheet)
 *   cmd    — joga no stdin de um comando local (claude, ollama, llm, aichat, snowsql)
 *   http   — POST numa API compatível (Anthropic, OpenAI, OpenRouter, Ollama, LM Studio)
 */
export const PRESETS = {
  print: {
    kind: "print",
    format: "plain",
    about: "imprime o prompt final no terminal",
  },
  clipboard: {
    kind: "print",
    format: "plain",
    copy: true,
    about: "copia o prompt para a área de transferência",
  },
  claude: {
    kind: "cmd",
    cmd: "claude -p",
    format: "plain",
    about: "Claude Code em modo não interativo",
  },
  ollama: {
    kind: "cmd",
    cmd: "ollama run llama3.1",
    format: "plain",
    about: "modelo local via Ollama",
  },
  llm: {
    kind: "cmd",
    cmd: "llm",
    format: "plain",
    about: "CLI llm do Simon Willison",
  },
  anthropic: {
    kind: "http",
    api: "anthropic",
    url: "https://api.anthropic.com/v1/messages",
    model: "claude-sonnet-4-5",
    format: "json",
    headers: {
      "x-api-key": "${ANTHROPIC_API_KEY}",
      "anthropic-version": "2023-06-01",
    },
    about: "API da Anthropic (precisa de ANTHROPIC_API_KEY)",
  },
  openai: {
    kind: "http",
    api: "openai",
    url: "https://api.openai.com/v1/chat/completions",
    model: "gpt-4o",
    format: "json",
    headers: { Authorization: "Bearer ${OPENAI_API_KEY}" },
    about: "API da OpenAI (precisa de OPENAI_API_KEY)",
  },
  openrouter: {
    kind: "http",
    api: "openai",
    url: "https://openrouter.ai/api/v1/chat/completions",
    model: "anthropic/claude-sonnet-4.5",
    format: "json",
    headers: { Authorization: "Bearer ${OPENROUTER_API_KEY}" },
    about: "qualquer modelo pelo OpenRouter",
  },
  "ollama-http": {
    kind: "http",
    api: "ollama",
    url: "http://localhost:11434/api/chat",
    model: "llama3.1",
    format: "json",
    about: "Ollama pela API local, sem sair da máquina",
  },
  cortex: {
    kind: "print",
    format: "sql",
    model: "claude-sonnet-4-5",
    about: "SQL pronto para o worksheet do Snowflake Cortex",
  },
};

/** `${VAR}` vira o valor do ambiente. Chave de API nunca é gravada no rc. */
function expandEnv(value) {
  return String(value).replace(/\$\{([A-Z0-9_]+)\}/g, (_m, name) => {
    const found = process.env[name];
    if (!found) {
      throw new Error(
        `A variável ${name} não está definida no ambiente. Exporte a chave antes de usar este provedor.`
      );
    }
    return found;
  });
}

export function resolveProvider(name, config) {
  const custom = config.providers?.[name];
  const preset = PRESETS[name];
  if (!custom && !preset) {
    throw new Error(
      `Provedor "${name}" não existe. Rode bfrost providers para ver a lista ou defina o seu em ${config.rcFile}.`
    );
  }
  return { name, ...(preset ?? {}), ...(custom ?? {}) };
}

function buildBody(provider, prompt) {
  const model = provider.model ?? "";
  const messages = [{ role: "user", content: prompt }];
  if (provider.api === "anthropic") {
    return { model, max_tokens: provider.maxTokens ?? 4096, messages };
  }
  if (provider.api === "ollama") {
    return { model, messages, stream: false };
  }
  return { model, messages };
}

function extractText(data) {
  if (Array.isArray(data?.content)) {
    return data.content.map((block) => block?.text ?? "").join("").trim();
  }
  if (data?.choices?.[0]?.message?.content) return data.choices[0].message.content.trim();
  if (data?.message?.content) return data.message.content.trim();
  if (typeof data?.response === "string") return data.response.trim();
  return JSON.stringify(data, null, 2);
}

async function callHttp(provider, prompt) {
  const headers = { "content-type": "application/json" };
  for (const [key, value] of Object.entries(provider.headers ?? {})) {
    headers[key] = expandEnv(value);
  }

  const response = await fetch(expandEnv(provider.url), {
    method: "POST",
    headers,
    body: JSON.stringify(buildBody(provider, prompt)),
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`${provider.name} respondeu ${response.status}: ${raw.slice(0, 300)}`);
  }
  try {
    return extractText(JSON.parse(raw));
  } catch {
    return raw;
  }
}

function callCmd(provider, prompt) {
  return new Promise((resolve, reject) => {
    const child = spawn(provider.cmd, {
      shell: true,
      stdio: ["pipe", "inherit", "inherit"],
    });
    child.on("error", (error) =>
      reject(new Error(`Não consegui rodar "${provider.cmd}": ${error.message}`))
    );
    child.on("close", (code) =>
      code === 0 ? resolve(null) : reject(new Error(`"${provider.cmd}" saiu com código ${code}.`))
    );
    child.stdin.write(prompt);
    child.stdin.end();
  });
}

/** Devolve o texto da resposta, ou null quando a saída já foi para o terminal. */
export async function send(provider, prompt) {
  if (provider.kind === "http") return callHttp(provider, prompt);
  if (provider.kind === "cmd") return callCmd(provider, prompt);
  return prompt;
}
