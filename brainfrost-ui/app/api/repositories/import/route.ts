import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getOAuthConnection, isRepositoryProvider } from "@/lib/oauth-connections";
import { buildRawTextFromFiles, fetchContextFiles } from "@/lib/github";
import { fetchGitLabContextFiles } from "@/lib/gitlab";
import { hasProAccess } from "@/lib/pro-entitlement";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { provider?: unknown; id?: unknown; fullName?: unknown; branch?: unknown } | null;
  if (!body || !isRepositoryProvider(body.provider) || (typeof body.id !== "number" && typeof body.id !== "string") || typeof body.fullName !== "string" || typeof body.branch !== "string") {
    return NextResponse.json({ error: "repositório inválido" }, { status: 400 });
  }
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  const limited = await enforceRateLimit(supabase, "repository-import", 15, 3600);
  if (limited) return limited;
  const [{ data: subscription }, { data: grant }] = await Promise.all([
    supabase.from("subscriptions").select("status").eq("user_id", user.id).maybeSingle(),
    supabase.from("pro_grants").select("expires_at,revoked_at").eq("user_id", user.id).maybeSingle(),
  ]);
  if (!hasProAccess(subscription?.status, grant)) return NextResponse.json({ error: "Esta integração é um recurso Pro." }, { status: 402 });
  const connection = await getOAuthConnection(user.id, body.provider);
  if (!connection) return NextResponse.json({ error: "Autorize novamente a conta do repositório.", code: "CONNECTION_REQUIRED" }, { status: 409 });

  try {
    const result = body.provider === "github"
      ? await fetchContextFiles(connection.accessToken, body.fullName, body.branch)
      : await fetchGitLabContextFiles(connection.accessToken, Number(body.id), body.branch);
    if (result.files.length === 0) return NextResponse.json({ error: "Nenhum README, AGENTS, CONTEXTO ou arquivo em docs/ foi encontrado." }, { status: 422 });
    const rawText = buildRawTextFromFiles(body.fullName, result.files);
    const { data, error } = await supabase.from("imports").insert({
      source: body.provider,
      label: body.fullName.slice(0, 200),
      file_count: result.files.length,
      raw_text: rawText,
    }).select("id").single();
    if (error || !data) return NextResponse.json({ error: "Não foi possível criar a importação." }, { status: 503 });
    return NextResponse.json({ id: data.id, fileCount: result.files.length, truncated: result.truncated });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Falha ao importar o repositório.";
    const unauthorized = /\b(401|403)\b/.test(message);
    return NextResponse.json({ error: unauthorized ? "A autorização expirou. Conecte novamente a conta." : message, code: unauthorized ? "CONNECTION_EXPIRED" : "PROVIDER_ERROR" }, { status: unauthorized ? 401 : 502 });
  }
}
