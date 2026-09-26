import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Callback do OAuth. Provedores redirecionam pra cá com ?code. A troca por
 * sessão joga o refresh/access token nos cookies do browser via cookieStore.
 */
// Aceita só path interno (`/foo`), rejeita `https://…`, `//host`, `\\host`
// pra não virar open redirect via ?next=.
function safeNext(raw: string | null): string {
  if (!raw) return "/painel";
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return "/painel";
  return raw;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", request.url));
  }

  const supabase = await getSupabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const params = new URLSearchParams({ error: error.message });
    return NextResponse.redirect(new URL(`/login?${params.toString()}`, request.url));
  }

  return NextResponse.redirect(new URL(next, request.url));
}
