import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  // Falha só em runtime — permite build sem env.
  console.warn("[stripe] STRIPE_SECRET_KEY não configurada; rotas Stripe vão devolver 500.");
}

export const stripe = new Stripe(key ?? "sk_test_placeholder", {
  apiVersion: "2026-08-26.dahlia",
});

export const PRICE_MONTHLY = process.env.STRIPE_PRICE_MONTHLY!;
export const PRICE_ANNUAL = process.env.STRIPE_PRICE_ANNUAL!;

export type PlanKey = "monthly" | "annual";

export function priceFor(plan: PlanKey): string {
  return plan === "monthly" ? PRICE_MONTHLY : PRICE_ANNUAL;
}
