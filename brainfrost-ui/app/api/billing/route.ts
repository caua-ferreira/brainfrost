import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getSupabaseServer } from "@/lib/supabase/server";
import { hasActiveGrant, hasProAccess } from "@/lib/pro-entitlement";

export const runtime = "nodejs";

function isMissingCustomer(error: unknown) {
  return error instanceof Error
    && "code" in error
    && error.code === "resource_missing"
    && "param" in error
    && (error.param === "customer" || error.param === "id");
}

export async function GET() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [{ data: subscription }, { data: grant }, { count: importsThisMonth }, { count: layers }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("stripe_customer_id, stripe_subscription_id, status, price_id, current_period_end, cancel_at_period_end, updated_at")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("pro_grants")
      .select("expires_at,reason,revoked_at,updated_at")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("imports")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", monthStart.toISOString()),
    supabase
      .from("vault_notes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  if (!subscription) {
    return NextResponse.json({
      isPro: hasActiveGrant(grant),
      subscription: null,
      complimentaryGrant: hasActiveGrant(grant) ? {
        expiresAt: grant?.expires_at ?? null,
        reason: grant?.reason ?? "Concessão administrativa",
        updatedAt: grant?.updated_at ?? null,
      } : null,
      invoices: [],
      paymentMethods: [],
      usage: { importsThisMonth: importsThisMonth ?? 0, layers: layers ?? 0 },
    });
  }

  try {
    const [invoiceList, paymentMethodList] = await Promise.all([
      stripe.invoices.list({ customer: subscription.stripe_customer_id, limit: 24 }),
      stripe.paymentMethods.list({ customer: subscription.stripe_customer_id, type: "card" }),
    ]);

    const invoices = invoiceList.data.map((invoice) => ({
      id: invoice.id,
      number: invoice.number,
      status: invoice.status ?? "unknown",
      amountPaid: invoice.amount_paid,
      amountDue: invoice.amount_due,
      amountRemaining: invoice.amount_remaining,
      currency: invoice.currency,
      createdAt: invoice.created,
      dueDate: invoice.due_date,
      hostedUrl: invoice.hosted_invoice_url,
      pdfUrl: invoice.invoice_pdf,
    }));

    const status = subscription.status;
    const priceId = subscription.price_id;
    const plan = priceId === process.env.STRIPE_PRICE_ANNUAL ? "annual" : "monthly";
    const totalPaid = invoices.reduce((sum, invoice) => sum + invoice.amountPaid, 0);
    const overdue = invoices
      .filter((invoice) => invoice.status === "open" && invoice.dueDate && invoice.dueDate * 1000 < Date.now())
      .reduce((sum, invoice) => sum + invoice.amountRemaining, 0);

    return NextResponse.json({
      isPro: hasProAccess(status, grant),
      subscription: {
        status,
        isPro: hasProAccess(status, grant),
        plan,
        priceId,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        updatedAt: subscription.updated_at,
      },
      complimentaryGrant: hasActiveGrant(grant) ? {
        expiresAt: grant?.expires_at ?? null,
        reason: grant?.reason ?? "Concessão administrativa",
        updatedAt: grant?.updated_at ?? null,
      } : null,
      invoices,
      paymentMethods: paymentMethodList.data.map((method) => ({
        id: method.id,
        brand: method.card?.brand ?? "cartão",
        last4: method.card?.last4 ?? "••••",
        expMonth: method.card?.exp_month ?? null,
        expYear: method.card?.exp_year ?? null,
      })),
      totals: { totalPaid, overdue },
      usage: { importsThisMonth: importsThisMonth ?? 0, layers: layers ?? 0 },
    });
  } catch (error) {
    if (isMissingCustomer(error)) {
      return NextResponse.json({
        isPro: hasActiveGrant(grant),
        subscription: null,
        complimentaryGrant: hasActiveGrant(grant) ? {
          expiresAt: grant?.expires_at ?? null,
          reason: grant?.reason ?? "Concessão administrativa",
          updatedAt: grant?.updated_at ?? null,
        } : null,
        invoices: [],
        paymentMethods: [],
        usage: { importsThisMonth: importsThisMonth ?? 0, layers: layers ?? 0 },
      });
    }
    console.error("[billing] falha ao consultar Stripe", error);
    return NextResponse.json({ error: "não foi possível consultar os dados de pagamento" }, { status: 502 });
  }
}
