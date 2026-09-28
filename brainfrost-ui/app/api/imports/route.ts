import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

const SOURCES = ["text", "files", "zip", "github"] as const;
type Source = (typeof SOURCES)[number];
const isSource = (value: unknown): value is Source =>
  typeof value === "string" && (SOURCES as readonly string[]).includes(value);

const isProStatus = (status: string | null | undefined) => status === "active" || status === "trialing";

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
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const [{ data: subscription }, { count: importsThisMonth }] = await Promise.all([
    supabase.from("subscriptions").select("status").eq("user_id", user.id).maybeSingle(),
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

  const isPro = isProStatus(subscription?.status);
  if (body.source === "github" && !isPro) {
    return NextResponse.json({ error: "Importação pelo GitHub é um recurso Pro." }, { status: 402 });
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

  if (error || !data) return NextResponse.json({ error: "não foi possível criar o import" }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
