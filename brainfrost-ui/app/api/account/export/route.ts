import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const limited = await enforceRateLimit(supabase, "account-export", 3, 3600);
  if (limited) return limited;

  const [notes, links, imports, suggestions, subscriptions, grants, llmCredentials, chatCredentials] = await Promise.all([
    supabase.from("vault_notes").select("*").order("created_at", { ascending: true }),
    supabase.from("vault_links").select("*"),
    supabase.from("imports").select("*").order("created_at", { ascending: true }),
    supabase.from("pattern_suggestions").select("*").order("created_at", { ascending: true }),
    supabase.from("subscriptions").select("status,price_id,current_period_end,cancel_at_period_end,created_at,updated_at"),
    supabase.from("pro_grants").select("expires_at,reason,revoked_at,created_at,updated_at"),
    supabase.from("llm_credentials").select("provider,deep_analysis,updated_at"),
    supabase.from("chat_credentials").select("label,provider_key,api,model,url,updated_at"),
  ]);

  const failed = [notes, links, imports, suggestions, subscriptions, grants, llmCredentials, chatCredentials]
    .find((result) => result.error);
  if (failed?.error) {
    return NextResponse.json({ error: "Não foi possível preparar seus dados." }, { status: 503 });
  }

  const payload = {
    exportedAt: new Date().toISOString(),
    account: {
      id: user.id,
      email: user.email,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      metadata: user.user_metadata,
      connectedProviders: (user.identities ?? []).map((identity) => identity.provider),
    },
    brain: {
      notes: notes.data ?? [],
      links: links.data ?? [],
      imports: imports.data ?? [],
      suggestions: suggestions.data ?? [],
    },
    billing: {
      subscriptions: subscriptions.data ?? [],
      courtesyGrants: grants.data ?? [],
    },
    integrations: {
      llmCredentials: llmCredentials.data ?? [],
      chatCredentials: chatCredentials.data ?? [],
      notice: "Chaves e segredos não fazem parte da exportação por segurança.",
    },
  };

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="brainfrost-export-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}

