import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { sanitizeTelemetryMessage, writeErrorTelemetry } from "@/lib/error-telemetry";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const errorId = crypto.randomUUID();
  writeErrorTelemetry({
    errorId,
    scope: sanitizeTelemetryMessage(body?.scope ?? "client", 50),
    stage: sanitizeTelemetryMessage(body?.stage ?? "unknown", 50),
    message: body?.message,
    userId: user.id,
    importId: typeof body?.importId === "string" ? body.importId.slice(0, 100) : undefined,
    metadata: { source: "browser" },
  });

  return NextResponse.json({ ok: true, errorId });
}
