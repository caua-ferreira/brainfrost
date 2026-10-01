import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { hasProAccess } from "@/lib/pro-entitlement";

export const runtime = "nodejs";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);

function conceptsOf(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .filter((concept): concept is string => typeof concept === "string")
        .map((concept) => concept.trim())
        .filter(Boolean)
        .slice(0, 10)
    : [];
}

function linksOf(value: unknown): Array<{ slug: string; reason: string | null }> {
  if (!Array.isArray(value)) return [];
  return value
    .filter((link): link is { slug: string; reason?: unknown } => Boolean(link) && typeof link === "object" && typeof (link as { slug?: unknown }).slug === "string")
    .map((link) => ({
      slug: link.slug.trim(),
      reason: typeof link.reason === "string" ? link.reason.slice(0, 240) : null,
    }))
    .filter((link) => link.slug)
    .slice(0, 10);
}

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
  if (!user || user.is_anonymous) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const { data: suggestion, error: suggestionLoadError } = await supabase
    .from("pattern_suggestions")
    .select("id, category, concepts, suggested_links")
    .eq("id", body.suggestion_id)
    .eq("status", "pending")
    .maybeSingle();
  if (suggestionLoadError || !suggestion) {
    return NextResponse.json({ error: "sugestão não encontrada ou já revisada" }, { status: 404 });
  }

  const concepts = conceptsOf(body.concepts ?? suggestion.concepts);
  const suggestedLinks = linksOf(body.links ?? suggestion.suggested_links);

  const [{ data: subscription }, { data: grant }, { count: layerCount }] = await Promise.all([
    supabase.from("subscriptions").select("status").eq("user_id", user.id).maybeSingle(),
    supabase.from("pro_grants").select("expires_at,revoked_at").eq("user_id", user.id).maybeSingle(),
    supabase.from("vault_notes").select("id", { count: "exact", head: true }),
  ]);
  const isPro = hasProAccess(subscription?.status, grant);
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
      concepts,
    })
    .select("id, slug")
    .single();
  if (noteError || !note) {
    return NextResponse.json({ error: noteError?.message ?? "Erro ao criar camada." }, { status: 500 });
  }

  const { data: linkedNotes } = suggestedLinks.length > 0
    ? await supabase
        .from("vault_notes")
        .select("slug")
        .in("slug", suggestedLinks.map((link) => link.slug))
    : { data: [] as Array<{ slug: string }> };
  const acceptedSlugs = new Set((linkedNotes ?? []).map((linked) => linked.slug));
  const approvedLinks = suggestedLinks.filter((link) => acceptedSlugs.has(link.slug));

  // Sugestões antigas ainda não têm ligações estruturadas; preservamos o
  // comportamento anterior como fallback apenas nesses casos.
  const { data: siblings } = approvedLinks.length === 0 && body.links === undefined
    ? await supabase
        .from("vault_notes")
        .select("slug")
        .eq("category", body.category)
        .neq("id", note.id)
        .order("updated_at", { ascending: false })
        .limit(8)
    : { data: [] as Array<{ slug: string }> };
  // A tela de curadoria sempre envia `links`, inclusive quando o usuário
  // removeu todas as sugestões. Nesse caso, não recriamos links escondidos
  // por categoria: a decisão precisa continuar sendo do usuário.
  const linksToInsert = approvedLinks.length > 0
    ? approvedLinks
    : body.links !== undefined
      ? []
      : siblings ?? [];
  if (linksToInsert.length > 0) {
    await supabase.from("vault_links").insert(
      linksToInsert.map((link) => ({ from_note_id: note.id, to_slug: link.slug }))
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
