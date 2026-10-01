import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { priceFor, stripe, type PlanKey } from "@/lib/stripe";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

function isPlan(s: unknown): s is PlanKey {
  return s === "monthly" || s === "annual";
}

function isMissingCustomer(error: unknown) {
  return error instanceof Error
    && "code" in error
    && error.code === "resource_missing"
    && "param" in error
    && (error.param === "customer" || error.param === "id");
}

async function resolveCustomer(customerId: string | null | undefined, email: string, userId: string) {
  if (customerId) {
    try {
      const customer = await stripe.customers.retrieve(customerId);
      if (!customer.deleted) return { id: customer.id, created: false };
    } catch (error) {
      if (!isMissingCustomer(error)) throw error;
    }
  }

  const customer = await stripe.customers.create({
    email,
    metadata: { supabase_user_id: userId },
  });
  return { id: customer.id, created: true };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || !isPlan(body.plan)) {
    return NextResponse.json({ error: "plan deve ser 'monthly' ou 'annual'" }, { status: 400 });
  }

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email || user.is_anonymous) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }
  const limited = await enforceRateLimit(supabase, "checkout", 10, 600);
  if (limited) return limited;

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
    const customer = await resolveCustomer(existing?.stripe_customer_id, user.email, user.id);

    if (!customer.created && existing?.stripe_customer_id && managedStatuses.has(existing.status)) {
      const origin = new URL(request.url).origin;
      const portal = await stripe.billingPortal.sessions.create({
        customer: customer.id,
        return_url: `${origin}/assinatura`,
      });
      return NextResponse.json({ url: portal.url, destination: "billing_portal" });
    }

    const origin = new URL(request.url).origin;
    const session = await stripe.checkout.sessions.create({
      ui_mode: "hosted_page",
      mode: "subscription",
      customer: customer.id,
      billing_address_collection: "auto",
      phone_number_collection: { enabled: true },
      automatic_tax: { enabled: false },
      allow_promotion_codes: true,
      payment_method_collection: "always",
      submit_type: "auto",
      consent_collection: {
        terms_of_service: "required",
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
