import { NextResponse } from "next/server";
import { isObservabilityAdmin } from "@/lib/observability-admin";
import { hasActiveGrant, PRO_STATUSES } from "@/lib/pro-entitlement";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function requireAdmin() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  return user && !user.is_anonymous && isObservabilityAdmin(user.email) ? user : null;
}

export async function GET(request: Request) {
  const actingUser = await requireAdmin();
  if (!actingUser) return NextResponse.json({ error: "acesso restrito" }, { status: 403 });

  const query = new URL(request.url).searchParams.get("query")?.trim().toLowerCase() ?? "";
  const admin = getSupabaseAdmin();
  const now = new Date();
  const currentPeriod = `${now.toISOString().slice(0, 7)}-01`;
  const resetsAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
  const [{ data: authData, error: authError }, subscriptionsResult, grantsResult, eventsResult, sessionsResult, pageViewsResult, usageResult, quotaLimitsResult, errorsResult, importsResult] = await Promise.all([
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    admin.from("subscriptions").select("user_id,status,price_id,current_period_end,cancel_at_period_end,updated_at"),
    admin.from("pro_grants").select("user_id,expires_at,reason,revoked_at,created_at,updated_at"),
    admin.from("subscription_admin_events").select("id,target_user_id,action,new_expires_at,reason,created_at").order("created_at", { ascending: false }).limit(50),
    admin.from("product_sessions").select("user_id,last_seen_at,active_seconds,last_path").order("last_seen_at", { ascending: false }).limit(5000),
    admin.from("product_events").select("user_id,path,occurred_at").order("occurred_at", { ascending: false }).limit(5000),
    admin.from("managed_llm_usage").select("user_id,usage_count").eq("period_start", currentPeriod),
    admin.from("managed_llm_quota_limits").select("user_id,monthly_limit,reason,updated_at"),
    admin.from("error_events").select("error_id,user_id,import_id,scope,stage,provider,message,occurred_at").order("occurred_at", { ascending: false }).limit(5000),
    admin.from("imports").select("id,user_id").limit(5000),
  ]);

  const error = authError ?? subscriptionsResult.error ?? grantsResult.error ?? eventsResult.error ?? sessionsResult.error ?? pageViewsResult.error ?? usageResult.error ?? quotaLimitsResult.error ?? errorsResult.error ?? importsResult.error;
  if (error) return NextResponse.json({ error: "não foi possível carregar as assinaturas" }, { status: 503 });

  const subscriptionByUser = new Map((subscriptionsResult.data ?? []).map((item) => [item.user_id, item]));
  const grantByUser = new Map((grantsResult.data ?? []).map((item) => [item.user_id, item]));
  const usageByUser = new Map((usageResult.data ?? []).map((item) => [item.user_id, item.usage_count]));
  const quotaLimitByUser = new Map((quotaLimitsResult.data ?? []).map((item) => [item.user_id, item]));
  const importOwnerById = new Map((importsResult.data ?? []).map((item) => [item.id, item.user_id]));
  const emailByUser = new Map(authData.users.map((user) => [user.id, user.email ?? "sem e-mail"]));
  const sessionsByUser = new Map<string, { lastSeenAt: string; activeSeconds: number; lastPath: string }>();
  for (const session of sessionsResult.data ?? []) {
    const current = sessionsByUser.get(session.user_id);
    if (!current) {
      sessionsByUser.set(session.user_id, {
        lastSeenAt: session.last_seen_at,
        activeSeconds: session.active_seconds,
        lastPath: session.last_path,
      });
    } else {
      current.activeSeconds += session.active_seconds;
      if (session.last_seen_at > current.lastSeenAt) {
        current.lastSeenAt = session.last_seen_at;
        current.lastPath = session.last_path;
      }
    }
  }
  const pagesByUser = new Map<string, Array<{ path: string; occurredAt: string }>>();
  for (const pageView of pageViewsResult.data ?? []) {
    const pages = pagesByUser.get(pageView.user_id) ?? [];
    if (pages.length < 8) pages.push({ path: pageView.path, occurredAt: pageView.occurred_at });
    pagesByUser.set(pageView.user_id, pages);
  }
  const errorsByUser = new Map<string, Array<{
    id: string;
    scope: string;
    stage: string;
    provider: string | null;
    message: string;
    occurredAt: string;
  }>>();
  for (const errorEvent of errorsResult.data ?? []) {
    const errorUserId = errorEvent.user_id ?? (errorEvent.import_id ? importOwnerById.get(errorEvent.import_id) : null);
    if (!errorUserId) continue;
    const userErrors = errorsByUser.get(errorUserId) ?? [];
    if (userErrors.length < 10) {
      userErrors.push({
        id: errorEvent.error_id,
        scope: errorEvent.scope,
        stage: errorEvent.stage,
        provider: errorEvent.provider,
        message: errorEvent.message,
        occurredAt: errorEvent.occurred_at,
      });
    }
    errorsByUser.set(errorUserId, userErrors);
  }

  const managedUsers = authData.users.map((user) => {
      const subscription = subscriptionByUser.get(user.id) ?? null;
      const grant = grantByUser.get(user.id) ?? null;
      const paidPro = PRO_STATUSES.has(subscription?.status ?? "");
      const complimentaryPro = hasActiveGrant(grant);
      const identities = user.identities ?? [];
      const identityData = identities.find((identity) => identity.identity_data)?.identity_data ?? {};
      const metadata = user.user_metadata ?? {};
      const session = sessionsByUser.get(user.id);
      const providers = [...new Set(identities.map((identity) => identity.provider).filter(Boolean))];
      const isAnonymous = user.is_anonymous === true || (!user.email && providers.length === 0);
      const acquisition = metadata.acquisition && typeof metadata.acquisition === "object"
        ? metadata.acquisition as Record<string, unknown>
        : null;
      const lastAccessAt = [session?.lastSeenAt, user.last_sign_in_at]
        .filter((value): value is string => Boolean(value))
        .sort()
        .at(-1) ?? null;
      const customQuota = quotaLimitByUser.get(user.id) ?? null;
      return {
        id: user.id,
        email: user.email ?? "sem e-mail",
        name: String(metadata.display_name ?? metadata.full_name ?? metadata.name ?? identityData.full_name ?? identityData.name ?? ""),
        avatarUrl: String(metadata.avatar_url ?? metadata.picture ?? identityData.avatar_url ?? identityData.picture ?? "") || null,
        providers,
        isAnonymous,
        blocked: Boolean(user.banned_until && new Date(user.banned_until) > new Date()),
        createdAt: user.created_at,
        lastSignInAt: user.last_sign_in_at ?? null,
        lastAccessAt,
        activeMinutes: Math.round((session?.activeSeconds ?? 0) / 60),
        lastPath: session?.lastPath ?? null,
        recentPages: pagesByUser.get(user.id) ?? [],
        recentErrors: errorsByUser.get(user.id) ?? [],
        acquisition: acquisition ? {
          source: String(acquisition.utm_source ?? acquisition.referrer ?? "direto"),
          medium: typeof acquisition.utm_medium === "string" ? acquisition.utm_medium : null,
          campaign: typeof acquisition.utm_campaign === "string" ? acquisition.utm_campaign : null,
          landingPath: typeof acquisition.landing_path === "string" ? acquisition.landing_path : null,
          capturedAt: typeof acquisition.captured_at === "string" ? acquisition.captured_at : null,
        } : null,
        quota: {
          used: usageByUser.get(user.id) ?? 0,
          limit: customQuota?.monthly_limit ?? 30,
          isCustom: Boolean(customQuota),
          reason: customQuota?.reason ?? null,
          updatedAt: customQuota?.updated_at ?? null,
          resetsAt,
        },
        access: paidPro && complimentaryPro ? "paid_and_grant" : paidPro ? "paid" : complimentaryPro ? "grant" : "free",
        subscription,
        grant,
      };
    });
  const users = managedUsers
    .filter((user) => !query || user.email.toLowerCase().includes(query) || user.name.toLowerCase().includes(query))
    .sort((a, b) => (b.lastSignInAt ?? b.createdAt).localeCompare(a.lastSignInAt ?? a.createdAt));
  const realUsers = managedUsers.filter((item) => !item.isAnonymous);

  return NextResponse.json({
    users: users.slice(0, 250),
    totals: {
      users: realUsers.length,
      anonymous: managedUsers.filter((item) => item.isAnonymous).length,
      blocked: realUsers.filter((item) => item.blocked).length,
      paid: realUsers.filter((item) => item.access === "paid" || item.access === "paid_and_grant").length,
      complimentary: realUsers.filter((item) => item.access === "grant" || item.access === "paid_and_grant").length,
      free: realUsers.filter((item) => item.access === "free").length,
    },
    recentEvents: (eventsResult.data ?? []).map((event) => ({
      ...event,
      email: emailByUser.get(event.target_user_id) ?? "usuário removido",
    })),
  });
}

type MutationBody = {
  userId?: unknown;
  action?: unknown;
  days?: unknown;
  lifetime?: unknown;
  reason?: unknown;
  quotaLimit?: unknown;
};

export async function POST(request: Request) {
  const actingUser = await requireAdmin();
  if (!actingUser) return NextResponse.json({ error: "acesso restrito" }, { status: 403 });

  const body = await request.json().catch(() => null) as MutationBody | null;
  const userId = typeof body?.userId === "string" ? body.userId : "";
  const action = typeof body?.action === "string" ? body.action : "";
  const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 500) : "";
  if (!userId || !["grant", "extend", "revoke", "block", "unblock", "set_quota", "reset_quota"].includes(action)) {
    return NextResponse.json({ error: "ação administrativa inválida" }, { status: 400 });
  }
  if (action === "block" && userId === actingUser.id) {
    return NextResponse.json({ error: "você não pode bloquear a própria conta administrativa" }, { status: 400 });
  }
  if (reason.length < 3) {
    return NextResponse.json({ error: "informe o motivo da alteração" }, { status: 400 });
  }

  const lifetime = body?.lifetime === true;
  const days = typeof body?.days === "number" ? Math.floor(body.days) : Number.NaN;
  if ((action === "grant" || action === "extend") && !lifetime && (!Number.isInteger(days) || days < 1 || days > 3650)) {
    return NextResponse.json({ error: "a duração deve ficar entre 1 e 3650 dias" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const [{ data: targetData, error: targetError }, { data: existing, error: existingError }, { data: subscription, error: subscriptionError }] = await Promise.all([
    admin.auth.admin.getUserById(userId),
    admin.from("pro_grants").select("expires_at,revoked_at").eq("user_id", userId).maybeSingle(),
    admin.from("subscriptions").select("status,current_period_end").eq("user_id", userId).maybeSingle(),
  ]);
  if (targetError || !targetData.user) return NextResponse.json({ error: "usuário não encontrado" }, { status: 404 });
  if (existingError || subscriptionError) return NextResponse.json({ error: "não foi possível consultar o acesso atual" }, { status: 503 });

  const now = new Date();
  const previousExpiry = existing?.expires_at ?? null;

  if (action === "set_quota" || action === "reset_quota") {
    if (action === "set_quota") {
      const quotaLimit = typeof body?.quotaLimit === "number" ? Math.floor(body.quotaLimit) : Number.NaN;
      if (!Number.isInteger(quotaLimit) || quotaLimit < 1 || quotaLimit > 10000) {
        return NextResponse.json({ error: "a franquia mensal deve ficar entre 1 e 10000 análises" }, { status: 400 });
      }
      const { error: quotaError } = await admin.from("managed_llm_quota_limits").upsert({
        user_id: userId,
        monthly_limit: quotaLimit,
        reason,
        granted_by: actingUser.id,
        updated_at: now.toISOString(),
      });
      if (quotaError) return NextResponse.json({ error: "não foi possível atualizar a franquia" }, { status: 503 });
    } else {
      const { error: quotaError } = await admin.from("managed_llm_quota_limits").delete().eq("user_id", userId);
      if (quotaError) return NextResponse.json({ error: "não foi possível restaurar a franquia padrão" }, { status: 503 });
    }

    const { error: auditError } = await admin.from("subscription_admin_events").insert({
      target_user_id: userId,
      admin_user_id: actingUser.id,
      action,
      previous_expires_at: null,
      new_expires_at: null,
      reason,
    });
    if (auditError) console.error("[admin/subscriptions] falha ao registrar auditoria de franquia", auditError.message);
    return NextResponse.json({ ok: true });
  }

  if (action === "block" || action === "unblock") {
    const { error: accessError } = await admin.auth.admin.updateUserById(userId, {
      ban_duration: action === "block" ? "876000h" : "none",
    });
    if (accessError) return NextResponse.json({ error: "não foi possível alterar o acesso à plataforma" }, { status: 503 });
    await admin.from("subscription_admin_events").insert({
      target_user_id: userId,
      admin_user_id: actingUser.id,
      action,
      previous_expires_at: previousExpiry,
      new_expires_at: previousExpiry,
      reason,
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "revoke") {
    if (!existing || !hasActiveGrant(existing)) {
      return NextResponse.json({ error: "o usuário não possui concessão Pro ativa" }, { status: 409 });
    }
    const { error: revokeError } = await admin
      .from("pro_grants")
      .update({ revoked_at: now.toISOString(), updated_at: now.toISOString() })
      .eq("user_id", userId);
    if (revokeError) return NextResponse.json({ error: "não foi possível revogar o acesso" }, { status: 503 });

    await admin.from("subscription_admin_events").insert({
      target_user_id: userId,
      admin_user_id: actingUser.id,
      action: "revoke",
      previous_expires_at: previousExpiry,
      new_expires_at: null,
      reason,
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "extend" && existing && hasActiveGrant(existing) && existing.expires_at === null) {
    return NextResponse.json({ error: "a concessão atual já é vitalícia" }, { status: 409 });
  }

  const currentExpiry = existing?.expires_at ? new Date(existing.expires_at) : null;
  const paidExpiry = PRO_STATUSES.has(subscription?.status ?? "") && subscription?.current_period_end
    ? new Date(subscription.current_period_end)
    : null;
  const candidates = [now, currentExpiry, paidExpiry].filter((date): date is Date => Boolean(date && date > now));
  const base = candidates.reduce((latest, date) => date > latest ? date : latest, now);
  const newExpiry = lifetime ? null : new Date(base.getTime() + days * 86_400_000).toISOString();
  const eventAction = lifetime ? "lifetime" : action;

  const { error: upsertError } = await admin.from("pro_grants").upsert({
    user_id: userId,
    expires_at: newExpiry,
    reason,
    granted_by: actingUser.id,
    revoked_at: null,
    updated_at: now.toISOString(),
  });
  if (upsertError) return NextResponse.json({ error: "não foi possível conceder o acesso" }, { status: 503 });

  const { error: auditError } = await admin.from("subscription_admin_events").insert({
    target_user_id: userId,
    admin_user_id: actingUser.id,
    action: eventAction,
    previous_expires_at: previousExpiry,
    new_expires_at: newExpiry,
    reason,
  });
  if (auditError) console.error("[admin/subscriptions] falha ao registrar auditoria", auditError.message);

  const notificationKind = action === "extend" ? "pro_extended" : "pro_granted";
  const accessDescription = newExpiry
    ? `Seu acesso Pro está disponível até ${new Date(newExpiry).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}.`
    : "Seu acesso Pro vitalício está disponível.";
  const { error: notificationError } = await admin.from("app_notifications").insert({
    user_id: userId,
    kind: notificationKind,
    title: action === "extend" ? "Sua licença Pro foi estendida" : "Você recebeu uma licença Pro",
    message: `${accessDescription} Aproveite os recursos Pro do BrainFrost.`,
    href: "/assinatura",
  });
  if (notificationError) console.error("[admin/subscriptions] falha ao notificar usuário", notificationError.message);

  return NextResponse.json({ ok: true, expiresAt: newExpiry });
}
