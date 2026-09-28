import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  if (
    typeof body?.suggestion_id !== "string" ||
    typeof body?.title !== "string" ||
    typeof body?.content !== "string" ||
    typeof body?.category !== "string"
  ) {
    return NextResponse.json({ error: "sugestão inválida" }, { status: 400 });
  }

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const [{ data: subscription }, { count: layerCount }] = await Promise.all([
    supabase.from("subscriptions").select("status").eq("user_id", user.id).maybeSingle(),
    supabase.from("vault_notes").select("id", { count: "exact", head: true }),
  ]);
  const isPro = subscription?.status === "active" || subscription?.status === "trialing";
  if (!isPro && (layerCount ?? 0) >= 50) {
    return NextResponse.json(
      { error: "O plano Free permite até 50 camadas. Faça upgrade para continuar." },
      { status: 402 }
    );
  }

  const { data: note, error: noteError } = await supabase
    .from("vault_notes")
    .insert({
      slug: `${slugify(body.title)}_${body.suggestion_id.slice(0, 6)}`,
      title: body.title.slice(0, 200),
      body: body.content,
      category: body.category,
    })
    .select("id, slug")
    .single();
  if (noteError || !note) {
    return NextResponse.json({ error: noteError?.message ?? "Erro ao criar camada." }, { status: 500 });
  }

  const { data: siblings } = await supabase
    .from("vault_notes")
    .select("slug")
    .eq("category", body.category)
    .neq("id", note.id)
    .order("updated_at", { ascending: false })
    .limit(8);
  if (siblings && siblings.length > 0) {
    await supabase.from("vault_links").insert(
      siblings.map((sibling) => ({ from_note_id: note.id, to_slug: sibling.slug }))
    );
  }

  const { error: suggestionError } = await supabase
    .from("pattern_suggestions")
    .update({ status: "accepted", accepted_note_id: note.id })
    .eq("id", body.suggestion_id);
  if (suggestionError) {
    return NextResponse.json({ error: suggestionError.message }, { status: 500 });
  }

  return NextResponse.json({ id: note.id });
}
