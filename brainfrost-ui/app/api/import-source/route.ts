import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { importRemoteSource, type RemoteImportSource } from "@/lib/remote-import";
import { sanitizeTelemetryMessage, writeErrorTelemetry } from "@/lib/error-telemetry";
import { hasProAccess } from "@/lib/pro-entitlement";

export const runtime = "nodejs";

const SOURCES = new Set<RemoteImportSource>(["url", "gitlab", "google_drive"]);

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { source?: unknown; url?: unknown } | null;
  if (!body || typeof body.source !== "string" || !SOURCES.has(body.source as RemoteImportSource) || typeof body.url !== "string") {
    return NextResponse.json({ error: "Fonte e URL são obrigatórias." }, { status: 400 });
  }

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  const limited = await enforceRateLimit(supabase, "fetch-import-source", 15, 3600);
  if (limited) return limited;

  if (["gitlab", "google_drive"].includes(body.source)) {
    const [{ data: subscription }, { data: grant }] = await Promise.all([
      supabase.from("subscriptions").select("status").eq("user_id", user.id).maybeSingle(),
      supabase.from("pro_grants").select("expires_at,revoked_at").eq("user_id", user.id).maybeSingle(),
    ]);
    if (!hasProAccess(subscription?.status, grant)) {
      return NextResponse.json({ error: "Esta integração é um recurso Pro." }, { status: 402 });
    }
  }

  try {
    const result = await importRemoteSource(body.source as RemoteImportSource, body.url);
    return NextResponse.json(result);
  } catch (error) {
    const errorId = crypto.randomUUID();
    const message = sanitizeTelemetryMessage(error instanceof Error ? error.message : "Falha ao buscar fonte remota.");
    writeErrorTelemetry({ errorId, scope: "import", stage: "fetch-source", message, userId: user.id });
    await supabase.from("error_events").insert({
      error_id: errorId,
      user_id: user.id,
      scope: "import",
      stage: "fetch-source",
      provider: body.source,
      message,
      metadata: { hostname: (() => { try { return new URL(body.url).hostname; } catch { return null; } })() },
    });
    return NextResponse.json({ error: `${message} Código: ${errorId}` }, { status: 422 });
  }
}
