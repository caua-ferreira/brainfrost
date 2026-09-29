import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!sub?.stripe_customer_id) {
    return NextResponse.json({ error: "nenhuma assinatura encontrada" }, { status: 404 });
  }

  const origin = new URL(request.url).origin;
  try {
    const portal = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${origin}/assinatura`,
    });

    return NextResponse.json({ url: portal.url });
  } catch (error) {
    console.error("[billing/portal] falha ao abrir portal", error);
    return NextResponse.json({ error: "não foi possível abrir o portal de cobrança" }, { status: 502 });
  }
}
