import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { enforceRateLimit } from "@/lib/rate-limit";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function DELETE(request: Request) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const limited = await enforceRateLimit(supabase, "account-delete", 3, 3600);
  if (limited) return limited;

  const body = await request.json().catch(() => null) as { confirmation?: string } | null;
  if (body?.confirmation !== "EXCLUIR") {
    return NextResponse.json({ error: "confirmação inválida" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data: subscription, error: subscriptionError } = await admin
    .from("subscriptions")
    .select("stripe_subscription_id,stripe_customer_id,status")
    .eq("user_id", user.id)
    .maybeSingle();
  if (subscriptionError) {
    return NextResponse.json({ error: "Não foi possível verificar sua assinatura." }, { status: 503 });
  }

  try {
    if (subscription?.stripe_subscription_id && ["active", "trialing", "past_due"].includes(subscription.status)) {
      await stripe.subscriptions.cancel(subscription.stripe_subscription_id);
    }
    if (subscription?.stripe_customer_id) {
      await stripe.customers.update(subscription.stripe_customer_id, {
        metadata: { account_deleted: "true" },
      });
    }
  } catch (error) {
    console.error("[account_delete_billing]", error);
    return NextResponse.json(
      { error: "Não foi possível cancelar sua assinatura. Tente novamente ou fale com o suporte." },
      { status: 502 }
    );
  }

  const { data: avatarFiles } = await admin.storage.from("avatars").list(user.id);
  if (avatarFiles?.length) {
    await admin.storage.from("avatars").remove(avatarFiles.map((file) => `${user.id}/${file.name}`));
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("[account_delete]", error.message);
    return NextResponse.json({ error: "Não foi possível excluir sua conta." }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}

