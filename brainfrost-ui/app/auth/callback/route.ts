import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { userNeedsName } from "@/lib/user-profile";

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
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const params = new URLSearchParams({ error: error.message });
    return NextResponse.redirect(new URL(`/login?${params.toString()}`, request.url));
  }

  const user = data.user;
  if (!user || user.is_anonymous) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?error=anonymous_not_allowed", request.url));
  }

  const store = await cookies();
  const rawAttribution = store.get("brainfrost_attribution")?.value;
  if (rawAttribution && !user.user_metadata?.acquisition) {
    try {
      const parsed = JSON.parse(decodeURIComponent(rawAttribution)) as Record<string, unknown>;
      const acquisition = Object.fromEntries(
        Object.entries(parsed)
          .filter(([, value]) => typeof value === "string")
          .slice(0, 8)
          .map(([key, value]) => [key.slice(0, 40), String(value).slice(0, 300)])
      );
      await supabase.auth.updateUser({ data: { ...user.user_metadata, acquisition } });
    } catch {
      // Atribuição é auxiliar e nunca deve impedir o login.
    }
  }

  const destination = userNeedsName(user) ? "/perfil?onboarding=1" : next;
  const response = NextResponse.redirect(new URL(destination, request.url));
  response.cookies.delete("brainfrost_attribution");
  return response;
}
