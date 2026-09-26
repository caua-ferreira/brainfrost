-- Assinaturas Stripe. Só o webhook (service_role) escreve; o cliente lê a
-- própria linha pra saber se está ativo/em trial/cancelado.
create table public.subscriptions (
  user_id                uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id     text not null,
  stripe_subscription_id text unique,
  status                 text not null,
  price_id               text,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  updated_at             timestamptz not null default now()
);

create index subscriptions_customer_idx on public.subscriptions (stripe_customer_id);

alter table public.subscriptions enable row level security;

-- Dono lê o próprio status. Escrita fica com o service_role usado no webhook.
create policy subscriptions_read_owner on public.subscriptions
  for select using (auth.uid() = user_id);
