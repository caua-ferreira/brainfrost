import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { encrypt } from "@/lib/crypto";

export const runtime = "nodejs";

const PROVIDERS = ["claude", "gemini"] as const;
type Provider = (typeof PROVIDERS)[number];
const isProvider = (s: unknown): s is Provider => typeof s === "string" && (PROVIDERS as readonly string[]).includes(s);

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || !isProvider(body.provider) || typeof body.api_key !== "string") {
    return NextResponse.json({ error: "provider e api_key obrigatórios" }, { status: 400 });
  }
  if (body.api_key.trim().length < 8) {
    return NextResponse.json({ error: "api_key parece curta demais" }, { status: 400 });
  }

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const cipher = encrypt(body.api_key.trim());

  const { error } = await supabase
    .from("llm_credentials")
    .upsert(
      {
        provider: body.provider,
        api_key_cipher: cipher.toString("base64"),
        deep_analysis: typeof body.deep_analysis === "boolean" ? body.deep_analysis : false,
      },
      { onConflict: "user_id,provider" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get("provider");
  if (!isProvider(provider)) {
    return NextResponse.json({ error: "provider inválido" }, { status: 400 });
  }
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const { error } = await supabase
    .from("llm_credentials")
    .delete()
    .eq("provider", provider);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const { data } = await supabase
    .from("llm_credentials")
    .select("provider, deep_analysis, updated_at")
    .order("updated_at", { ascending: false });

  return NextResponse.json({ credentials: data ?? [] });
}
