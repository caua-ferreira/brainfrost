import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const { data, error } = await supabase
    .from("app_notifications")
    .select("id,kind,title,message,href,read_at,created_at")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) return NextResponse.json({ error: "não foi possível carregar as notificações" }, { status: 503 });

  return NextResponse.json({ notifications: data ?? [] });
}

export async function PATCH(request: Request) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const body = await request.json().catch(() => null) as { id?: unknown; all?: unknown } | null;
  let query = supabase
    .from("app_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);

  if (body?.all !== true) {
    if (typeof body?.id !== "string") return NextResponse.json({ error: "notificação inválida" }, { status: 400 });
    query = query.eq("id", body.id);
  }

  const { error } = await query;
  if (error) return NextResponse.json({ error: "não foi possível atualizar a notificação" }, { status: 503 });
  return NextResponse.json({ ok: true });
}
