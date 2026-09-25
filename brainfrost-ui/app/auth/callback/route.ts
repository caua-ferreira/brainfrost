import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Callback do OAuth. Provedores redirecionam pra cá com ?code. A troca por
 * sessão joga o refresh/access token nos cookies do browser via cookieStore.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/painel";

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
