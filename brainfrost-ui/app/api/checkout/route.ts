import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { priceFor, stripe, type PlanKey } from "@/lib/stripe";

export const runtime = "nodejs";

function isPlan(s: unknown): s is PlanKey {
  return s === "monthly" || s === "annual";
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || !isPlan(body.plan)) {
    return NextResponse.json({ error: "plan deve ser 'monthly' ou 'annual'" }, { status: 400 });
  }

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }

  const { data: existing } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const customerId = existing?.stripe_customer_id ??
    (await stripe.customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id },
    })).id;

  const origin = new URL(request.url).origin;
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceFor(body.plan), quantity: 1 }],
    success_url: `${origin}/painel?paid=1`,
    cancel_url: `${origin}/?checkout=cancelado`,
    allow_promotion_codes: true,
  });

  if (!session.url) {
    return NextResponse.json({ error: "Stripe não devolveu URL da sessão" }, { status: 502 });
  }
  return NextResponse.json({ url: session.url });
}
