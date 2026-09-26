import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

// Eventos que mudam o estado da assinatura no nosso lado.
const HANDLED = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

export async function POST(request: Request) {
  if (!WEBHOOK_SECRET) {
    return NextResponse.json({ error: "webhook não configurado" }, { status: 500 });
  }
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "assinatura ausente" }, { status: 400 });
  }

  const raw = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, signature, WEBHOOK_SECRET);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "assinatura inválida";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  if (!HANDLED.has(event.type)) {
    return NextResponse.json({ received: true });
  }

  try {
    if (event.type === "checkout.session.completed") {
      await onCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
    } else {
      await onSubscriptionChanged(event.data.object as Stripe.Subscription);
    }
    return NextResponse.json({ received: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro no handler";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function onCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (!session.subscription || !session.customer) return;
  const subscriptionId = typeof session.subscription === "string"
    ? session.subscription
    : session.subscription.id;
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  await onSubscriptionChanged(sub);
}

async function onSubscriptionChanged(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) return;
  const userId = customer.metadata?.supabase_user_id;
  if (!userId) {
    throw new Error(`customer ${customerId} sem metadata.supabase_user_id`);
  }
  const admin = getSupabaseAdmin();
  const priceId = sub.items.data[0]?.price.id ?? null;
  const periodEnd = sub.items.data[0]?.current_period_end;
  const { error } = await admin.from("subscriptions").upsert({
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    status: sub.status,
    price_id: priceId,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: sub.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}
