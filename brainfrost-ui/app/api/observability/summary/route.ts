import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isObservabilityAdmin } from "@/lib/observability-admin";

export const runtime = "nodejs";

const DAY = 86_400_000;

function uniqueUsers<T extends { user_id: string | null }>(rows: T[]) {
  return new Set(rows.map((row) => row.user_id).filter(Boolean)).size;
}

export async function GET() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  if (!isObservabilityAdmin(user.email)) {
    return NextResponse.json({ error: "acesso restrito" }, { status: 403 });
  }

  const admin = getSupabaseAdmin();
  const now = Date.now();
  const since30d = new Date(now - 30 * DAY).toISOString();
  const since14d = new Date(now - 14 * DAY).toISOString();
  const since7d = new Date(now - 7 * DAY).toISOString();
  const since1d = new Date(now - DAY).toISOString();
  const activeSince = new Date(now - 5 * 60_000).toISOString();

  const [sessionsResult, eventsResult, importsResult, errorsResult, checksResult] = await Promise.all([
    admin.from("product_sessions").select("user_id,started_at,last_seen_at,active_seconds,last_path").gte("last_seen_at", since30d).order("last_seen_at", { ascending: false }).limit(500),
    admin.from("product_events").select("user_id,path,occurred_at").gte("occurred_at", since14d).order("occurred_at", { ascending: false }).limit(5_000),
    admin.from("imports").select("status,created_at,finished_at").gte("created_at", since30d),
    admin.from("error_events").select("error_id,stage,provider,message,occurred_at").gte("occurred_at", since7d).order("occurred_at", { ascending: false }).limit(200),
    admin.from("synthetic_checks").select("check_name,status,duration_ms,provider,suggestions_count,error_id,occurred_at").order("occurred_at", { ascending: false }).limit(10),
  ]);

  const queryError = sessionsResult.error ?? eventsResult.error ?? importsResult.error ?? errorsResult.error ?? checksResult.error;
  if (queryError) return NextResponse.json({ error: "observabilidade indisponível" }, { status: 503 });

  const users = [];
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return NextResponse.json({ error: "não foi possível contar usuários" }, { status: 503 });
    users.push(...data.users);
    if (data.users.length < 1000) break;
  }

  const sessions = sessionsResult.data ?? [];
  const events = eventsResult.data ?? [];
  const imports = importsResult.data ?? [];
  const errors = errorsResult.data ?? [];
  const checks = checksResult.data ?? [];
  const activeNow = uniqueUsers(sessions.filter((row) => row.last_seen_at >= activeSince));
  const dau = uniqueUsers(sessions.filter((row) => row.last_seen_at >= since1d));
  const wau = uniqueUsers(sessions.filter((row) => row.last_seen_at >= since7d));
  const mau = uniqueUsers(sessions);
  const totalActiveSeconds = sessions.reduce((total, row) => total + row.active_seconds, 0);
  const successfulImports = imports.filter((row) => row.status === "pronto").length;
  const failedImports = imports.filter((row) => row.status === "erro").length;
  const emailByUserId = new Map(users.map((item) => [item.id, item.email ?? "sem e-mail"]));

  const routeCounts = new Map<string, number>();
  for (const event of events) routeCounts.set(event.path, (routeCounts.get(event.path) ?? 0) + 1);

  const errorStages = new Map<string, number>();
  for (const event of errors) errorStages.set(event.stage, (errorStages.get(event.stage) ?? 0) + 1);

  const daily = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(now - (13 - index) * DAY).toISOString().slice(0, 10);
    const dailyEvents = events.filter((event) => event.occurred_at.slice(0, 10) === date);
    return { date, activeUsers: uniqueUsers(dailyEvents), pageViews: dailyEvents.length };
  });

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    users: {
      total: users.length,
      new7d: users.filter((item) => item.created_at >= since7d).length,
      activeNow,
      dau,
      wau,
      mau,
      averageActiveMinutes30d: mau > 0 ? Math.round(totalActiveSeconds / 60 / mau) : 0,
    },
    usage: {
      pageViews14d: events.length,
      topRoutes: [...routeCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([path, views]) => ({ path, views })),
      daily,
      recentSessions: sessions.slice(0, 30).map((session) => ({
        email: emailByUserId.get(session.user_id) ?? "usuário removido",
        startedAt: session.started_at,
        lastSeenAt: session.last_seen_at,
        activeMinutes: Math.round(session.active_seconds / 60),
        lastPath: session.last_path,
      })),
      recentPageViews: events.slice(0, 50).map((event) => ({
        email: emailByUserId.get(event.user_id) ?? "usuário removido",
        path: event.path,
        occurredAt: event.occurred_at,
      })),
    },
    imports: {
      total30d: imports.length,
      successful30d: successfulImports,
      failed30d: failedImports,
      successRate30d: imports.length > 0 ? Math.round(successfulImports / imports.length * 100) : 0,
    },
    errors: {
      total7d: errors.length,
      byStage: [...errorStages.entries()].sort((a, b) => b[1] - a[1]).map(([stage, count]) => ({ stage, count })),
      recent: errors.slice(0, 20),
    },
    syntheticChecks: checks,
  });
}
