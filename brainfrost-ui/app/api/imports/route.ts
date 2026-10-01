import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { hasProAccess } from "@/lib/pro-entitlement";
import { enforceRateLimit } from "@/lib/rate-limit";
import { sanitizeTelemetryMessage, writeErrorTelemetry } from "@/lib/error-telemetry";

export const runtime = "nodejs";

const SOURCES = ["text", "files", "zip", "github", "url", "gitlab", "google_drive"] as const;
type Source = (typeof SOURCES)[number];
const isSource = (value: unknown): value is Source =>
  typeof value === "string" && (SOURCES as readonly string[]).includes(value);

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as {
    source?: unknown;
    label?: unknown;
    file_count?: unknown;
    raw_text?: unknown;
  } | null;

  if (!body || !isSource(body.source) || typeof body.label !== "string" || typeof body.raw_text !== "string") {
    return NextResponse.json({ error: "source, label e conteúdo são obrigatórios" }, { status: 400 });
  }

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  const limited = await enforceRateLimit(supabase, "create-import", 20, 3600);
  if (limited) return limited;

  const [{ data: subscription }, { data: grant }, { count: importsThisMonth }] = await Promise.all([
    supabase.from("subscriptions").select("status").eq("user_id", user.id).maybeSingle(),
    supabase.from("pro_grants").select("expires_at,revoked_at").eq("user_id", user.id).maybeSingle(),
    (() => {
      const start = new Date();
      start.setUTCDate(1);
      start.setUTCHours(0, 0, 0, 0);
      return supabase
        .from("imports")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", start.toISOString());
    })(),
  ]);

  const isPro = hasProAccess(subscription?.status, grant);
  if (["github", "gitlab", "google_drive"].includes(body.source) && !isPro) {
    return NextResponse.json({ error: "Esta integração é um recurso Pro." }, { status: 402 });
  }
  if (!isPro && (importsThisMonth ?? 0) >= 3) {
    return NextResponse.json({ error: "O plano Free permite 3 importações por mês. Assine o Pro para continuar." }, { status: 402 });
  }

  const { data, error } = await supabase
    .from("imports")
    .insert({
      source: body.source,
      label: body.label.slice(0, 200),
      file_count: typeof body.file_count === "number" ? Math.max(1, Math.floor(body.file_count)) : 1,
      raw_text: body.raw_text,
    })
    .select("id")
    .single();

  if (error || !data) {
    const errorId = crypto.randomUUID();
    const message = sanitizeTelemetryMessage(error?.message ?? "insert não retornou dados");
    const fileCount = typeof body.file_count === "number" ? body.file_count : null;
    console.error("[imports/create]", errorId, message);
    writeErrorTelemetry({ errorId, scope: "import", stage: "create", message, userId: user.id });
    await supabase.from("error_events").insert({
      error_id: errorId,
      user_id: user.id,
      scope: "import",
      stage: "create",
      provider: null,
      message,
      metadata: { source: body.source, fileCount },
    });
    return NextResponse.json({ error: `Não foi possível criar a importação. Código: ${errorId}` }, { status: 500 });
  }
  return NextResponse.json({ id: data.id });
}
