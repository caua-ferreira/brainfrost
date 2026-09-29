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

  const { data: existing, error: subscriptionError } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (subscriptionError) {
    return NextResponse.json({ error: "não foi possível consultar sua assinatura" }, { status: 502 });
  }

  try {
    const managedStatuses = new Set(["active", "trialing", "past_due", "unpaid", "paused", "incomplete"]);
    if (existing?.stripe_customer_id && managedStatuses.has(existing.status)) {
      const origin = new URL(request.url).origin;
      const portal = await stripe.billingPortal.sessions.create({
        customer: existing.stripe_customer_id,
        return_url: `${origin}/assinatura`,
      });
      return NextResponse.json({ url: portal.url, destination: "billing_portal" });
    }

    const customerId = existing?.stripe_customer_id ??
      (await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      })).id;

    const origin = new URL(request.url).origin;
    const session = await stripe.checkout.sessions.create({
      ui_mode: "hosted_page",
      mode: "subscription",
      customer: customerId,
      billing_address_collection: "auto",
      phone_number_collection: { enabled: true },
      automatic_tax: { enabled: false },
      allow_promotion_codes: true,
      payment_method_collection: "always",
      submit_type: "auto",
      consent_collection: {
        terms_of_service: "required",
        promotions: "auto",
      },
      name_collection: {
        individual: { enabled: true },
      },
      integration_identifier: "hosted_web_0001",
      origin_context: "web",
      line_items: [{ price: priceFor(body.plan), quantity: 1 }],
      success_url: `${origin}/assinatura?paid=1`,
      cancel_url: `${origin}/?checkout=cancelado`,
    });

    if (!session.url) {
      return NextResponse.json({ error: "Stripe não devolveu URL da sessão" }, { status: 502 });
    }
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[checkout] falha ao abrir Stripe", error);
    return NextResponse.json({ error: "não foi possível abrir o pagamento" }, { status: 502 });
  }
}
