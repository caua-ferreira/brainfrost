-- BrainFrost SaaS · schema inicial (Fase 1)
-- Multiusuário com RLS por auth.uid(), trigger de dono no insert,
-- categorias em tabela referência, BYOK criptografado.

create extension if not exists pgcrypto;
create extension if not exists moddatetime schema extensions;

-- ─────────────────────────────────────────────────────────────
-- categorias (referência pública)
-- ─────────────────────────────────────────────────────────────
create table public.categories (
  id          text primary key,
  label       text not null,
  description text,
  created_at  timestamptz not null default now()
);

insert into public.categories (id, label, description) values
  ('padroes_codigo',      'Padrão de código',       'Como escrever web app, CLI e Python'),
  ('padroes_arquitetura', 'Padrão de arquitetura',  'Snowflake, SQL, modelagem, pipeline'),
  ('contexto_trabalho',   'Contexto de trabalho',   'Squads, ferramentas e processos'),
  ('padrao_webapp',       'Padrão de web app',      'Stack, armadilhas, RLS'),
  ('glossario',           'Glossário',              'Nomes internos do dono'),
  ('projeto',             'Projeto',                'Um projeto específico'),
  ('log_aprendizados',    'Log de aprendizados',    'Decisões por interação');

-- ─────────────────────────────────────────────────────────────
-- vault_notes: as camadas do cofre
-- ─────────────────────────────────────────────────────────────
create table public.vault_notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  slug       text not null,
  title      text not null,
  body       text not null,
  category   text not null references public.categories(id),
  layer      text not null default 'growth' check (layer in ('core','growth')),
  tags       text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug)
);

create index vault_notes_user_updated_idx on public.vault_notes (user_id, updated_at desc);
create index vault_notes_category_idx     on public.vault_notes (category);

-- ─────────────────────────────────────────────────────────────
-- vault_links: WikiLinks entre camadas
-- ─────────────────────────────────────────────────────────────
create table public.vault_links (
  from_note_id uuid not null references public.vault_notes(id) on delete cascade,
  to_slug      text not null,
  primary key (from_note_id, to_slug)
);

create index vault_links_to_slug_idx on public.vault_links (to_slug);

-- ─────────────────────────────────────────────────────────────
-- imports: cada upload/análise
-- ─────────────────────────────────────────────────────────────
create table public.imports (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  source         text not null check (source in ('text','zip','github')),
  label          text not null,
  file_count     int  not null default 0,
  status         text not null default 'analisando' check (status in ('analisando','pronto','erro')),
  error          text,
  provider_used  text check (provider_used in ('claude','gemini')),
  created_at     timestamptz not null default now(),
  finished_at    timestamptz
);

create index imports_user_created_idx on public.imports (user_id, created_at desc);

-- ─────────────────────────────────────────────────────────────
-- pattern_suggestions: o que o LLM propôs, aguarda curadoria
-- ─────────────────────────────────────────────────────────────
create table public.pattern_suggestions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  import_id         uuid not null references public.imports(id) on delete cascade,
  title             text not null,
  body              text not null,
  category          text not null references public.categories(id),
  evidence          text,
  status            text not null default 'pending' check (status in ('pending','accepted','rejected','edited')),
  accepted_note_id  uuid references public.vault_notes(id) on delete set null,
  created_at        timestamptz not null default now()
);

create index pattern_suggestions_pending_idx on public.pattern_suggestions (user_id, status, created_at desc);

-- ─────────────────────────────────────────────────────────────
-- llm_credentials: BYOK criptografado com pgcrypto
-- ─────────────────────────────────────────────────────────────
create table public.llm_credentials (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  provider       text not null check (provider in ('claude','gemini')),
  api_key_cipher bytea not null,
  deep_analysis  boolean not null default false,
  updated_at     timestamptz not null default now(),
  unique (user_id)
);

-- ─────────────────────────────────────────────────────────────
-- trigger: força user_id = auth.uid() no insert
-- (impede cliente de mentir dono, mesmo com token válido)
-- ─────────────────────────────────────────────────────────────
create or replace function public.set_owner_on_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.user_id := auth.uid();
  return new;
end;
$$;

create trigger vault_notes_set_owner
  before insert on public.vault_notes
  for each row execute function public.set_owner_on_insert();

create trigger imports_set_owner
  before insert on public.imports
  for each row execute function public.set_owner_on_insert();

create trigger pattern_suggestions_set_owner
  before insert on public.pattern_suggestions
  for each row execute function public.set_owner_on_insert();

create trigger llm_credentials_set_owner
  before insert on public.llm_credentials
  for each row execute function public.set_owner_on_insert();

-- ─────────────────────────────────────────────────────────────
-- updated_at automático
-- ─────────────────────────────────────────────────────────────
create trigger vault_notes_moddatetime
  before update on public.vault_notes
  for each row execute procedure extensions.moddatetime(updated_at);

create trigger llm_credentials_moddatetime
  before update on public.llm_credentials
  for each row execute procedure extensions.moddatetime(updated_at);

-- ─────────────────────────────────────────────────────────────
-- Row-level security
-- ─────────────────────────────────────────────────────────────
alter table public.categories          enable row level security;
alter table public.vault_notes         enable row level security;
alter table public.vault_links         enable row level security;
alter table public.imports             enable row level security;
alter table public.pattern_suggestions enable row level security;
alter table public.llm_credentials     enable row level security;

-- categorias: leitura pública, escrita bloqueada
create policy categories_read on public.categories
  for select using (true);

-- vault_notes: dono acessa tudo dele
create policy vault_notes_owner on public.vault_notes
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- vault_links: dono é o dono da nota origem
create policy vault_links_owner on public.vault_links
  for all
  using (exists (
    select 1 from public.vault_notes n
    where n.id = from_note_id and n.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.vault_notes n
    where n.id = from_note_id and n.user_id = auth.uid()
  ));

-- imports
create policy imports_owner on public.imports
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- pattern_suggestions
create policy pattern_suggestions_owner on public.pattern_suggestions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- llm_credentials
create policy llm_credentials_owner on public.llm_credentials
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
