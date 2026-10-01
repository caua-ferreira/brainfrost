import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
  if (!UUID.test(sessionId)) {
    return NextResponse.json({ error: "sessão inválida" }, { status: 400 });
  }

  const path = typeof body?.path === "string" ? body.path.slice(0, 200) : "/";
  const activeSeconds = Number.isFinite(body?.activeSeconds)
    ? Math.max(0, Math.min(60, Math.round(body.activeSeconds)))
    : 0;
  const pageView = body?.event === "page_view";

  const { error } = await supabase.rpc("record_product_activity", {
    p_session_id: sessionId,
    p_path: path,
    p_active_seconds: activeSeconds,
    p_page_view: pageView,
  });
  if (error) return NextResponse.json({ error: "telemetria indisponível" }, { status: 503 });
  return NextResponse.json({ ok: true });
}
