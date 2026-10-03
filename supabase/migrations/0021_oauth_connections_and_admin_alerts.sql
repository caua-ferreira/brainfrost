-- Tokens OAuth de integrações ficam cifrados e acessíveis somente pelo backend
-- com service_role. Identidades de login continuam gerenciadas pelo Supabase Auth.
create table public.oauth_connections (
  user_id              uuid not null references auth.users(id) on delete cascade,
  provider             text not null check (provider in ('github', 'gitlab')),
  access_token_cipher  text not null,
  refresh_token_cipher text,
  provider_account_id  text,
  scopes               text[] not null default '{}'::text[],
  updated_at           timestamptz not null default now(),
  primary key (user_id, provider)
);

alter table public.oauth_connections enable row level security;

-- Sem policies: tokens nunca são expostos ao cliente. O backend autenticado
-- consulta a conexão usando o cliente service_role.

alter table public.app_notifications
  add column if not exists dedupe_key text;

alter table public.app_notifications
  drop constraint if exists app_notifications_kind_check;

alter table public.app_notifications
  add constraint app_notifications_kind_check
  check (kind in ('pro_granted', 'pro_extended', 'new_user', 'system'));

create unique index if not exists app_notifications_dedupe_key_idx
  on public.app_notifications (dedupe_key);
