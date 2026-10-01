import { NextResponse } from "next/server";
import { isObservabilityAdmin } from "@/lib/observability-admin";
import { hasActiveGrant, PRO_STATUSES } from "@/lib/pro-entitlement";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function requireAdmin() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  return user && isObservabilityAdmin(user.email) ? user : null;
}

export async function GET(request: Request) {
  const actingUser = await requireAdmin();
  if (!actingUser) return NextResponse.json({ error: "acesso restrito" }, { status: 403 });

  const query = new URL(request.url).searchParams.get("query")?.trim().toLowerCase() ?? "";
  const admin = getSupabaseAdmin();
  const [{ data: authData, error: authError }, subscriptionsResult, grantsResult, eventsResult] = await Promise.all([
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    admin.from("subscriptions").select("user_id,status,price_id,current_period_end,cancel_at_period_end,updated_at"),
    admin.from("pro_grants").select("user_id,expires_at,reason,revoked_at,created_at,updated_at"),
    admin.from("subscription_admin_events").select("id,target_user_id,action,new_expires_at,reason,created_at").order("created_at", { ascending: false }).limit(50),
  ]);

  const error = authError ?? subscriptionsResult.error ?? grantsResult.error ?? eventsResult.error;
  if (error) return NextResponse.json({ error: "não foi possível carregar as assinaturas" }, { status: 503 });

  const subscriptionByUser = new Map((subscriptionsResult.data ?? []).map((item) => [item.user_id, item]));
  const grantByUser = new Map((grantsResult.data ?? []).map((item) => [item.user_id, item]));
  const emailByUser = new Map(authData.users.map((user) => [user.id, user.email ?? "sem e-mail"]));

  const managedUsers = authData.users.map((user) => {
      const subscription = subscriptionByUser.get(user.id) ?? null;
      const grant = grantByUser.get(user.id) ?? null;
      const paidPro = PRO_STATUSES.has(subscription?.status ?? "");
      const complimentaryPro = hasActiveGrant(grant);
      return {
        id: user.id,
        email: user.email ?? "sem e-mail",
        name: String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? ""),
        createdAt: user.created_at,
        lastSignInAt: user.last_sign_in_at ?? null,
        access: paidPro && complimentaryPro ? "paid_and_grant" : paidPro ? "paid" : complimentaryPro ? "grant" : "free",
        subscription,
        grant,
      };
    });
  const users = managedUsers
    .filter((user) => !query || user.email.toLowerCase().includes(query) || user.name.toLowerCase().includes(query))
    .sort((a, b) => (b.lastSignInAt ?? b.createdAt).localeCompare(a.lastSignInAt ?? a.createdAt));

  return NextResponse.json({
    users: users.slice(0, 250),
    totals: {
      users: authData.users.length,
      paid: managedUsers.filter((item) => item.access === "paid" || item.access === "paid_and_grant").length,
      complimentary: managedUsers.filter((item) => item.access === "grant" || item.access === "paid_and_grant").length,
      free: managedUsers.filter((item) => item.access === "free").length,
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
};

export async function POST(request: Request) {
  const actingUser = await requireAdmin();
  if (!actingUser) return NextResponse.json({ error: "acesso restrito" }, { status: 403 });

  const body = await request.json().catch(() => null) as MutationBody | null;
  const userId = typeof body?.userId === "string" ? body.userId : "";
  const action = body?.action;
  const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 500) : "";
  if (!userId || (action !== "grant" && action !== "extend" && action !== "revoke")) {
    return NextResponse.json({ error: "ação administrativa inválida" }, { status: 400 });
  }
  if (reason.length < 3) {
    return NextResponse.json({ error: "informe o motivo da alteração" }, { status: 400 });
  }

  const lifetime = body?.lifetime === true;
  const days = typeof body?.days === "number" ? Math.floor(body.days) : Number.NaN;
  if (action !== "revoke" && !lifetime && (!Number.isInteger(days) || days < 1 || days > 3650)) {
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

  return NextResponse.json({ ok: true, expiresAt: newExpiry });
}
