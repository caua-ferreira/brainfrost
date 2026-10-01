import { NextResponse } from "next/server";
import { encrypt } from "@/lib/crypto";
import { getSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

const ALLOWED_APIS = new Set(["openai", "anthropic", "gemini", "cortex"]);
const SAFE_HEADERS = new Set(["HTTP-Referer", "X-Title"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanHeaders(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      ([key, item]) => SAFE_HEADERS.has(key) && typeof item === "string" && item.length <= 300
    )
  ) as Record<string, string>;
}

function isProxyableUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    return !(
      host === "localhost" ||
      host === "::1" ||
      host === "0.0.0.0" ||
      host.endsWith(".local") ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    );
  } catch {
    return false;
  }
}

function publicConfig(row: {
  provider_key: string;
  label: string;
  api: string;
  url: string;
  model: string;
  headers: unknown;
  dangerously_allow_browser: boolean;
}) {
  return {
    label: row.label,
    api: row.api,
    url: row.url,
    model: row.model,
    apiKey: "",
    storage: "account" as const,
    providerKey: row.provider_key,
    hasApiKey: true,
    headers: isRecord(row.headers) ? row.headers : {},
    dangerouslyAllowBrowser: row.dangerously_allow_browser,
  };
}

export async function GET() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const { data, error } = await supabase
    .from("chat_credentials")
    .select("provider_key, label, api, url, model, headers, dangerously_allow_browser")
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ configs: (data ?? []).map(publicConfig) });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!isRecord(body)) return NextResponse.json({ error: "configuração inválida" }, { status: 400 });

  const providerKey = typeof body.provider_key === "string" ? body.provider_key.trim() : "";
  const label = typeof body.label === "string" ? body.label.trim() : "";
  const api = typeof body.api === "string" ? body.api.trim() : "";
  const url = typeof body.url === "string" ? body.url.trim() : "";
  const model = typeof body.model === "string" ? body.model.trim() : "";
  const apiKey = typeof body.api_key === "string" ? body.api_key.trim() : "";
  const extraKey = typeof body.extra_key === "string" ? body.extra_key.trim() : "";

  if (!/^[a-z0-9-]{1,40}$/.test(providerKey) || !label || !ALLOWED_APIS.has(api) || !model) {
    return NextResponse.json({ error: "dados do provedor inválidos" }, { status: 400 });
  }
  if (!isProxyableUrl(url)) {
    return NextResponse.json(
      { error: "Para salvar na conta, use um endpoint HTTPS público. Ollama e LM Studio ficam somente neste navegador." },
      { status: 400 }
    );
  }

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const { data: existing, error: lookupError } = await supabase
    .from("chat_credentials")
    .select("api_key_cipher, extra_key_cipher")
    .eq("provider_key", providerKey)
    .maybeSingle();
  if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 500 });

  if (!apiKey && !existing) {
    return NextResponse.json({ error: "informe a chave antes de salvar na conta" }, { status: 400 });
  }
  if (apiKey && apiKey.length < 8) {
    return NextResponse.json({ error: "a chave parece curta demais" }, { status: 400 });
  }

  const payload = {
    user_id: user.id,
    provider_key: providerKey,
    label,
    api,
    url,
    model,
    api_key_cipher: apiKey
      ? encrypt(apiKey).toString("base64")
      : existing!.api_key_cipher,
    extra_key_cipher: extraKey
      ? encrypt(extraKey).toString("base64")
      : existing?.extra_key_cipher ?? null,
    headers: cleanHeaders(body.headers),
    dangerously_allow_browser: body.dangerously_allow_browser === true,
  };

  const { data, error } = await supabase
    .from("chat_credentials")
    .upsert(payload, { onConflict: "user_id,provider_key" })
    .select("provider_key, label, api, url, model, headers, dangerously_allow_browser")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ config: publicConfig(data) });
}

export async function DELETE(request: Request) {
  const providerKey = new URL(request.url).searchParams.get("provider_key")?.trim() ?? "";
  if (!/^[a-z0-9-]{1,40}$/.test(providerKey)) {
    return NextResponse.json({ error: "provedor inválido" }, { status: 400 });
  }

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const { error } = await supabase
    .from("chat_credentials")
    .delete()
    .eq("user_id", user.id)
    .eq("provider_key", providerKey);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
