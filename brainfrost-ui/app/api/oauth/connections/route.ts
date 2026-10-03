import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isRepositoryProvider } from "@/lib/oauth-connections";

export async function GET() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("oauth_connections")
    .select("provider,provider_account_id,scopes,updated_at")
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: "não foi possível consultar as integrações" }, { status: 503 });
  const linked = new Set((user.identities ?? []).map((identity) => identity.provider));
  return NextResponse.json({
    connections: ["github", "gitlab"].map((provider) => {
      const connection = data?.find((item) => item.provider === provider);
      return {
        provider,
        identityLinked: linked.has(provider),
        repositoryAccess: Boolean(connection),
        updatedAt: connection?.updated_at ?? null,
      };
    }),
  });
}

export async function DELETE(request: Request) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  const provider = new URL(request.url).searchParams.get("provider");
  if (!isRepositoryProvider(provider)) return NextResponse.json({ error: "provedor inválido" }, { status: 400 });
  const { error } = await getSupabaseAdmin().from("oauth_connections").delete().eq("user_id", user.id).eq("provider", provider);
  if (error) return NextResponse.json({ error: "não foi possível remover a autorização" }, { status: 503 });
  return NextResponse.json({ ok: true });
}
