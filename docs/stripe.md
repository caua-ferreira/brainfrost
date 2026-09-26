# Stripe (test mode)

Checkout mensal R$10 e anual R$100, tudo em ambiente de teste. Trocar pra prod
depois é só substituir as chaves.

## Setup uma vez

1. **Cria conta no Stripe** e mantenha o toggle **"Test mode"** ligado (canto superior direito).

2. **Cria os dois Products/Prices** em Products → Add product:
   - **BrainFrost Pro Mensal** → recurring monthly, BRL 10.00 → guarde o `price_...` que aparece.
   - **BrainFrost Pro Anual** → recurring yearly, BRL 100.00 → guarde o `price_...`.

3. **Pega as chaves de API** em Developers → API keys:
   - `pk_test_...` (publishable — pode expor no client, mas nem usamos ainda)
   - `sk_test_...` (secret — só no server)

4. **Cria o endpoint do webhook** em Developers → Webhooks → Add endpoint:
   - URL: `https://<seu-domínio>/api/webhook/stripe` (ou o URL do preview Vercel)
   - Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Depois de criar, copie o `whsec_...` que ele revela.

5. **Env vars na Vercel (Preview + Production)**:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_PRICE_MONTHLY=price_...
   STRIPE_PRICE_ANNUAL=price_...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...          # Supabase Dashboard → Project Settings → API → service_role
   ```
   As duas primeiras variam entre test/live. O service_role é o mesmo em Preview/Prod.

## Testar checkout local

- Cartão de teste: `4242 4242 4242 4242`, qualquer data futura, CVC `123`, CEP qualquer.
- Cartão que falha: `4000 0000 0000 0002`.
- Cartão que exige 3DS: `4000 0025 0000 3155`.

Depois do pagamento o Stripe redireciona pra `/painel?paid=1` e o webhook grava
na tabela `subscriptions` (RLS abre pro dono).

## Testar webhook local

Sem exposição pra internet: `stripe listen --forward-to localhost:3000/api/webhook/stripe`.
O `stripe listen` imprime um `whsec_...` diferente — usa esse na env local.

## Restore / migração pra prod

1. Cria os mesmos dois Products em **Live mode** (Test mode não migra).
2. Substitui as env vars por `sk_live_` / `whsec_` do endpoint live.
3. Continua rodando.
