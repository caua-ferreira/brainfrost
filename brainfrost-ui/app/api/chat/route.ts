import { NextResponse } from "next/server";
import { decrypt } from "@/lib/crypto";
import { getSupabaseServer } from "@/lib/supabase/server";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

type Message = { role: "user" | "assistant"; content: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toGeminiContents(messages: Message[]) {
  return messages.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  }));
}

function toCortexStatement(model: string, messages: Message[]) {
  const jsonMessages = JSON.stringify(messages).replace(/'/g, "''");
  return `SELECT SNOWFLAKE.CORTEX.COMPLETE('${model}', PARSE_JSON('${jsonMessages}')) AS resposta`;
}

function extractText(data: unknown, api: string): string {
  if (api === "gemini") {
    const parsed = data as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const parts = parsed.candidates?.[0]?.content?.parts;
    return parts?.map((part) => part.text ?? "").join("").trim() || JSON.stringify(data, null, 2);
  }
  if (api === "cortex") {
    const parsed = data as { data?: Array<Array<string>>; message?: string };
    if (parsed.message && !parsed.data) throw new Error(parsed.message);
    const cell = parsed.data?.[0]?.[0];
    if (!cell) return JSON.stringify(data, null, 2);
    try {
      const answer = JSON.parse(cell) as {
        choices?: Array<{ messages?: string; message?: { content?: string } }>;
      };
      const first = answer.choices?.[0];
      if (first?.message?.content) return first.message.content.trim();
      if (typeof first?.messages === "string") return first.messages.trim();
    } catch {
      // A API às vezes devolve texto puro.
    }
    return cell.trim();
  }

  const parsed = data as {
    content?: Array<{ text?: string }>;
    choices?: Array<{ message?: { content?: string } }>;
    message?: { content?: string };
    response?: string;
    error?: { message?: string } | string;
  };
  if (Array.isArray(parsed.content)) return parsed.content.map((part) => part.text ?? "").join("").trim();
  if (parsed.choices?.[0]?.message?.content) return parsed.choices[0].message.content.trim();
  if (parsed.message?.content) return parsed.message.content.trim();
  if (typeof parsed.response === "string") return parsed.response.trim();
  const error = typeof parsed.error === "string" ? parsed.error : parsed.error?.message;
  if (error) throw new Error(error);
  return JSON.stringify(data, null, 2);
}

function isSafeUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase();
    return parsed.protocol === "https:" &&
      host !== "localhost" &&
      host !== "::1" &&
      !host.endsWith(".local") &&
      !/^127\./.test(host) &&
      !/^10\./.test(host) &&
      !/^192\.168\./.test(host) &&
      !/^172\.(1[6-9]|2\d|3[0-1])\./.test(host);
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const providerKey = isRecord(body) && typeof body.provider_key === "string" ? body.provider_key : "";
  const rawMessages = isRecord(body) && Array.isArray(body.messages) ? body.messages : [];
  const messages = rawMessages
    .filter(
      (message): message is Message =>
        isRecord(message) &&
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string"
    )
    .slice(-40);

  if (!providerKey || !messages.length) {
    return NextResponse.json({ error: "provedor e mensagens são obrigatórios" }, { status: 400 });
  }

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  const limited = await enforceRateLimit(supabase, "chat", 60, 60);
  if (limited) return limited;

  const { data: credential, error } = await supabase
    .from("chat_credentials")
    .select("label, api, url, model, api_key_cipher, extra_key_cipher, headers, dangerously_allow_browser")
    .eq("user_id", user.id)
    .eq("provider_key", providerKey)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!credential) return NextResponse.json({ error: "conecte este provedor novamente" }, { status: 404 });
  if (!isSafeUrl(credential.url)) {
    return NextResponse.json({ error: "o endpoint salvo não pode ser acessado pelo servidor" }, { status: 400 });
  }

  let apiKey: string;
  try {
    apiKey = decrypt(Buffer.from(credential.api_key_cipher, "base64"));
  } catch {
    return NextResponse.json({ error: "não foi possível ler a chave; salve-a novamente" }, { status: 500 });
  }

  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...(isRecord(credential.headers)
      ? Object.fromEntries(
          Object.entries(credential.headers).filter(
            ([key, value]) => ["HTTP-Referer", "X-Title"].includes(key) && typeof value === "string"
          )
        ) as Record<string, string>
      : {}),
  };
  let targetUrl = credential.url;
  let requestBody: unknown;

  if (credential.api === "anthropic") {
    headers["x-api-key"] = apiKey;
    headers["anthropic-version"] = "2023-06-01";
    if (credential.dangerously_allow_browser) headers["anthropic-dangerous-direct-browser-access"] = "true";
    requestBody = { model: credential.model, max_tokens: 4096, messages };
  } else if (credential.api === "gemini") {
    headers["x-goog-api-key"] = apiKey;
    requestBody = { contents: toGeminiContents(messages) };
  } else if (credential.api === "cortex") {
    headers.Authorization = `Bearer ${apiKey}`;
    headers["X-Snowflake-Authorization-Token-Type"] = "PROGRAMMATIC_ACCESS_TOKEN";
    targetUrl = `${credential.url.replace(/\/+$/, "")}/api/v2/statements`;
    requestBody = { statement: toCortexStatement(credential.model, messages), timeout: 60 };
  } else {
    headers.Authorization = `Bearer ${apiKey}`;
    requestBody = { model: credential.model, messages, max_tokens: 1200 };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55_000);
  let response: Response;
  try {
    response = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
  } catch (fetchError) {
    const detail = fetchError instanceof Error ? fetchError.message : String(fetchError);
    return NextResponse.json({ error: `não foi possível alcançar ${credential.label}: ${detail}` }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }

  const raw = await response.text();
  let data: unknown = null;
  try {
    data = JSON.parse(raw);
  } catch {
    data = { response: raw };
  }
  if (!response.ok) {
    let detail = `respondeu ${response.status}`;
    try {
      detail = `${detail}: ${String((data as { error?: { message?: string } | string })?.error ?? raw).slice(0, 400)}`;
    } catch {
      // Mantém uma mensagem segura mesmo para respostas fora do padrão.
    }
    return NextResponse.json({ error: `${credential.label} ${detail}` }, { status: 502 });
  }

  try {
    return NextResponse.json({ answer: extractText(data, credential.api) });
  } catch (parseError) {
    return NextResponse.json(
      { error: parseError instanceof Error ? parseError.message : "resposta inválida do provedor" },
      { status: 502 }
    );
  }
}
