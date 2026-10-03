import { NextResponse } from "next/server";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseServer } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { userNeedsName } from "@/lib/user-profile";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { observabilityAdminEmails } from "@/lib/observability-admin";
import { isRepositoryProvider, saveOAuthConnection } from "@/lib/oauth-connections";

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

async function persistRepositoryConnection(user: User, session: Session | null, requestedProvider: string | null) {
  if (!session?.provider_token) return;
  const provider = isRepositoryProvider(requestedProvider)
    ? requestedProvider
    : isRepositoryProvider(user.app_metadata?.provider)
      ? user.app_metadata.provider
      : null;
  const identities = [...(user.identities ?? [])]
    .sort((a, b) => new Date(b.last_sign_in_at ?? 0).getTime() - new Date(a.last_sign_in_at ?? 0).getTime());
  const identity = provider
    ? identities.find((candidate) => candidate.provider === provider)
    : identities.find((candidate) => isRepositoryProvider(candidate.provider));
  if (!identity || !isRepositoryProvider(identity.provider)) return;
  await saveOAuthConnection({
    userId: user.id,
    provider: identity.provider,
    accessToken: session.provider_token,
    refreshToken: session.provider_refresh_token,
    providerAccountId: identity.id,
  });
}

async function notifyAdminsOfUser(user: User) {
  const createdAt = new Date(user.created_at).getTime();
  if (!Number.isFinite(createdAt) || Date.now() - createdAt > 10 * 60_000) return;
  const emails = observabilityAdminEmails();
  if (emails.length === 0) return;
  const admin = getSupabaseAdmin();
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const recipients = data.users.filter((candidate) => candidate.email && emails.includes(candidate.email.toLowerCase()));
  if (recipients.length === 0) return;
  const metadata = user.user_metadata ?? {};
  const name = String(metadata.display_name ?? metadata.full_name ?? metadata.name ?? "").trim();
  const identity = name || user.email || "Novo usuário";
  await admin.from("app_notifications").upsert(
    recipients.map((recipient) => ({
      user_id: recipient.id,
      kind: "new_user",
      title: "Novo usuário no BrainFrost",
      message: `${identity} criou ou vinculou uma conta na plataforma.`,
      href: `/gestao-assinaturas?user=${encodeURIComponent(user.id)}`,
      dedupe_key: `${recipient.id}:new-user:${user.id}`,
    })),
    { onConflict: "dedupe_key", ignoreDuplicates: true }
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));
  const repositoryProvider = url.searchParams.get("repository_provider");

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

  await Promise.all([
    persistRepositoryConnection(user, data.session, repositoryProvider).catch((cause) =>
      console.error("[auth/callback] falha ao persistir conexão OAuth", cause)
    ),
    notifyAdminsOfUser(user).catch((cause) =>
      console.error("[auth/callback] falha ao notificar administradores", cause)
    ),
  ]);

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
