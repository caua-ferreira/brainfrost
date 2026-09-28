-- Credenciais do Chat salvas na conta.
-- A chave nunca fica em texto puro: api_key_cipher e extra_key_cipher são
-- cifrados pela aplicação com ENCRYPTION_KEY antes de chegar ao Supabase.
create table public.chat_credentials (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references auth.users(id) on delete cascade,
  provider_key             text not null,
  label                    text not null,
  api                      text not null,
  url                      text not null,
  model                    text not null,
  api_key_cipher           bytea not null,
  extra_key_cipher         bytea,
  headers                  jsonb not null default '{}'::jsonb,
  dangerously_allow_browser boolean not null default false,
  updated_at               timestamptz not null default now(),
  unique (user_id, provider_key)
);

create index chat_credentials_user_updated_idx
  on public.chat_credentials (user_id, updated_at desc);

create trigger chat_credentials_set_owner
  before insert on public.chat_credentials
  for each row execute function public.set_owner_on_insert();

create trigger chat_credentials_moddatetime
  before update on public.chat_credentials
  for each row execute procedure extensions.moddatetime(updated_at);

alter table public.chat_credentials enable row level security;

create policy chat_credentials_owner on public.chat_credentials
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
