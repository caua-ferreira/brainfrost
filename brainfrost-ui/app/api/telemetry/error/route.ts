import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { sanitizeTelemetryMessage, writeErrorTelemetry } from "@/lib/error-telemetry";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const errorId = crypto.randomUUID();
  const scope = sanitizeTelemetryMessage(body?.scope ?? "client", 50);
  const stage = sanitizeTelemetryMessage(body?.stage ?? "unknown", 50);
  const message = sanitizeTelemetryMessage(body?.message);
  const importId = typeof body?.importId === "string" ? body.importId.slice(0, 100) : undefined;
  const provider = typeof body?.provider === "string" ? sanitizeTelemetryMessage(body.provider, 100) : undefined;
  writeErrorTelemetry({
    errorId,
    scope,
    stage,
    message,
    userId: user.id,
    importId,
    provider,
    metadata: { source: "browser" },
  });

  await supabase.from("error_events").insert({
    error_id: errorId,
    user_id: user.id,
    import_id: importId && /^[0-9a-f-]{36}$/i.test(importId) ? importId : null,
    scope,
    stage,
    provider: provider ?? null,
    message,
    metadata: { source: "browser" },
  });

  return NextResponse.json({ ok: true, errorId });
}
