import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getOAuthConnection, isRepositoryProvider } from "@/lib/oauth-connections";
import { listRepos } from "@/lib/github";
import { listGitLabRepos } from "@/lib/gitlab";
import { hasProAccess } from "@/lib/pro-entitlement";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const provider = new URL(request.url).searchParams.get("provider");
  if (!isRepositoryProvider(provider)) return NextResponse.json({ error: "provedor inválido" }, { status: 400 });
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  const [{ data: subscription }, { data: grant }] = await Promise.all([
    supabase.from("subscriptions").select("status").eq("user_id", user.id).maybeSingle(),
    supabase.from("pro_grants").select("expires_at,revoked_at").eq("user_id", user.id).maybeSingle(),
  ]);
  if (!hasProAccess(subscription?.status, grant)) return NextResponse.json({ error: "Repositórios conectados são um recurso Pro." }, { status: 402 });
  const connection = await getOAuthConnection(user.id, provider);
  if (!connection) return NextResponse.json({ error: `Autorize o ${provider === "github" ? "GitHub" : "GitLab"} para listar seus repositórios.`, code: "CONNECTION_REQUIRED" }, { status: 409 });
  try {
    const repositories = provider === "github"
      ? await listRepos(connection.accessToken)
      : await listGitLabRepos(connection.accessToken);
    return NextResponse.json({ repositories });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Falha ao consultar repositórios.";
    const unauthorized = /\b(401|403)\b/.test(message);
    return NextResponse.json({ error: unauthorized ? "A autorização expirou. Conecte novamente a conta." : message, code: unauthorized ? "CONNECTION_EXPIRED" : "PROVIDER_ERROR" }, { status: unauthorized ? 401 : 502 });
  }
}
