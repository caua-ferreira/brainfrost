-- Acesso Pro cortesia, independente de cobrança Stripe.
create table public.pro_grants (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  expires_at   timestamptz,
  reason       text not null check (char_length(reason) between 3 and 500),
  granted_by   uuid references auth.users(id) on delete set null,
  revoked_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index pro_grants_active_idx on public.pro_grants (expires_at) where revoked_at is null;

alter table public.pro_grants enable row level security;

-- O usuário pode consultar a própria concessão. Escrita é exclusiva da
-- service_role usada pelas rotas administrativas protegidas.
create policy pro_grants_read_owner on public.pro_grants
  for select using (auth.uid() = user_id);

create table public.subscription_admin_events (
  id                  uuid primary key default gen_random_uuid(),
  target_user_id      uuid not null references auth.users(id) on delete cascade,
  admin_user_id       uuid references auth.users(id) on delete set null,
  action              text not null check (action in ('grant', 'extend', 'lifetime', 'revoke')),
  previous_expires_at timestamptz,
  new_expires_at      timestamptz,
  reason              text not null,
  created_at          timestamptz not null default now()
);

create index subscription_admin_events_target_idx
  on public.subscription_admin_events (target_user_id, created_at desc);

alter table public.subscription_admin_events enable row level security;

-- Sem policy: somente service_role acessa o histórico administrativo.
