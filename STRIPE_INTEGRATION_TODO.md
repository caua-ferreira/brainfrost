# Stripe Checkout: configuração e próximos passos

Este arquivo é a fonte de verdade da integração do Stripe Checkout no BrainFrost.

## Values to Replace

Não há placeholders dentro da chamada do Checkout Session.

**Arquivo verificado:**

- [brainfrost-ui/app/api/checkout/route.ts](brainfrost-ui/app/api/checkout/route.ts)

| Campo | Valor atual | Situação |
|---|---|---|
| `mode` | `subscription` | Correto para os planos recorrentes do BrainFrost. |
| `success_url` | URL atual + `/assinatura?paid=1` | URL real, calculada a partir do domínio que recebeu a requisição. |
| `cancel_url` | URL atual + `/?checkout=cancelado` | URL real, calculada a partir do domínio que recebeu a requisição. |
| `line_items[].price` | `priceFor(body.plan)` | Usa `STRIPE_PRICE_MONTHLY` ou `STRIPE_PRICE_ANNUAL`. |

Antes de receber pagamentos reais, os valores de **Production** na Vercel devem apontar para recursos do modo real do Stripe:

| Variável | O que configurar em Production |
|---|---|
| `STRIPE_SECRET_KEY` | Chave secreta do modo real, com prefixo `sk_live_`. |
| `STRIPE_PRICE_MONTHLY` | Price ID real do plano mensal. |
| `STRIPE_PRICE_ANNUAL` | Price ID real do plano anual. |
| `STRIPE_WEBHOOK_SECRET` | Segredo do endpoint de webhook criado no modo real. |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço do projeto Supabase de produção. |

Mantenha Development e Preview com os recursos do ambiente de teste.

## Configured Parameters

Os parâmetros abaixo foram configurados no Checkout Studio e já estão aplicados.

**Arquivo que contém os parâmetros:**

- [brainfrost-ui/app/api/checkout/route.ts](brainfrost-ui/app/api/checkout/route.ts)

| Parâmetro | Valor |
|---|---|
| `ui_mode` | `hosted_page` |
| `billing_address_collection` | `auto` |
| `phone_number_collection` | `{ enabled: true }` |
| `automatic_tax` | `{ enabled: false }` |
| `allow_promotion_codes` | `true` |
| `payment_method_collection` | `always` |
| `submit_type` | `auto` |
| `consent_collection.terms_of_service` | `required` |
| `consent_collection.promotions` | `auto` |
| `name_collection.individual.enabled` | `true` |
| `integration_identifier` | `hosted_web_0001` |
| `origin_context` | `web` |

O projeto usa Stripe Node `22.6.2`, portanto `hosted_page` é o valor compatível para `ui_mode`.

`customer` continua sendo enviado com o Customer ID associado ao usuário. O webhook depende dos metadados desse Customer para vincular a assinatura ao usuário do Supabase e conceder acesso Pro.

## Setup and Next Steps

### 1. Ativar a conta Stripe

O titular informou que a verificação facial, os documentos, a segurança, os produtos e os preços já foram configurados. No modo real, falta confirmar no Dashboard se **Cobranças** e **Repasses** aparecem como habilitados e se a conta bancária está pronta para receber.

### 2. Criar os recursos no modo real

No modo real do Stripe, crie ou confirme:

- produto BrainFrost Pro;
- preço mensal recorrente;
- preço anual recorrente;
- endpoint `https://brainfrost.vercel.app/api/webhook/stripe`.

O webhook deve receber:

- `checkout.session.completed`;
- `customer.subscription.created`;
- `customer.subscription.updated`;
- `customer.subscription.deleted`.

### 3. Publicar termos e configurar o Checkout

As páginas públicas estão implementadas em:

- `https://brainfrost.vercel.app/termos`;
- `https://brainfrost.vercel.app/privacidade`.

Como `consent_collection.terms_of_service` é obrigatório, configure `https://brainfrost.vercel.app/termos` como URL dos Termos nas configurações públicas do Stripe depois do deploy.

Revise também no Dashboard:

- identidade visual e nome exibido ao cliente;
- descrição que aparecerá na fatura do cartão;
- emails de recibo e falha de pagamento;
- métodos de pagamento permitidos;
- códigos promocionais que poderão ser resgatados.

### 4. Configurar o Portal do Cliente

No modo real, habilite conforme a política do BrainFrost:

- atualização da forma de pagamento;
- histórico de faturas;
- cancelamento ao final do período;
- retorno para `https://brainfrost.vercel.app/assinatura`.

### 5. Fluxo da integração

1. O usuário autenticado escolhe o plano mensal ou anual.
2. `POST /api/checkout` localiza ou cria seu Stripe Customer.
3. O servidor cria uma Checkout Session hospedada pelo Stripe.
4. O navegador é redirecionado para a URL da sessão.
5. Após o pagamento, o Stripe envia eventos para `/api/webhook/stripe`.
6. O webhook atualiza a assinatura no Supabase.
7. O BrainFrost libera os recursos Pro quando a assinatura está `active` ou `trialing`.

### 6. Testes

Use somente o modo de teste com chaves `sk_test_`, Prices de teste e cartões de teste. Para um pagamento aprovado, use:

- cartão: `4242 4242 4242 4242`;
- validade: qualquer data futura;
- CVC: qualquer três dígitos;
- demais dados: valores de teste.

Valide também:

- pagamento recusado;
- cancelamento no Checkout;
- atualização do cartão no Portal do Cliente;
- cancelamento ao final do período;
- entrega e reenvio dos quatro eventos do webhook;
- mudança do usuário entre Free e Pro.

### 7. Próximas melhorias recomendadas

- ~~impedir que um usuário com assinatura ativa crie uma segunda assinatura;~~ concluído: assinaturas em andamento são enviadas ao Portal;
- definir o período de tolerância para assinaturas `past_due`;
- tratar `invoice.payment_failed` e `invoice.payment_succeeded` para comunicação ao usuário;
- revisar emissão fiscal, identificação legal do operador, política de reembolso e atendimento ao consumidor antes do lançamento.

## Estrutura alterada

- `brainfrost-ui/app/api/checkout/route.ts`: parâmetros da Checkout Session hospedada.
- `brainfrost-ui/app/termos/page.tsx`: Termos de Uso públicos.
- `brainfrost-ui/app/privacidade/page.tsx`: Política de Privacidade pública.
- `brainfrost-ui/components/legal/LegalDocument.tsx`: layout compartilhado das páginas legais.
- `STRIPE_INTEGRATION_TODO.md`: configuração, validação e passos para produção.

## Recursos

- [Suporte Stripe](https://support.stripe.com)
- [Documentação Stripe](https://docs.stripe.com)
- [Stripe MCP](https://docs.stripe.com/mcp)
