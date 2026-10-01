-- Observabilidade first-party. Nenhum conteúdo importado, prompt ou mensagem de
-- chat é armazenado nestas tabelas.
create table public.product_sessions (
  id              uuid primary key,
  user_id         uuid not null references auth.users(id) on delete cascade,
  started_at      timestamptz not null default now(),
  last_seen_at    timestamptz not null default now(),
  active_seconds  integer not null default 0 check (active_seconds >= 0),
  last_path       text not null default '/'
);

create index product_sessions_user_seen_idx
  on public.product_sessions (user_id, last_seen_at desc);

create table public.product_events (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  session_id   uuid not null references public.product_sessions(id) on delete cascade,
  event_name   text not null check (event_name in ('page_view')),
  path         text not null,
  occurred_at  timestamptz not null default now()
);

create index product_events_user_time_idx
  on public.product_events (user_id, occurred_at desc);
create index product_events_path_time_idx
  on public.product_events (path, occurred_at desc);

create table public.error_events (
  error_id      uuid primary key,
  user_id       uuid references auth.users(id) on delete set null,
  import_id     uuid references public.imports(id) on delete set null,
  scope         text not null,
  stage         text not null,
  provider      text,
  message       text not null,
  metadata      jsonb not null default '{}'::jsonb,
  occurred_at   timestamptz not null default now()
);

create index error_events_time_idx on public.error_events (occurred_at desc);
create index error_events_stage_time_idx on public.error_events (stage, occurred_at desc);

create table public.synthetic_checks (
  id                 bigint generated always as identity primary key,
  check_name         text not null,
  status             text not null check (status in ('ok', 'error')),
  duration_ms        integer not null check (duration_ms >= 0),
  provider           text,
  suggestions_count  integer,
  error_id            uuid,
  occurred_at         timestamptz not null default now()
);

create index synthetic_checks_name_time_idx
  on public.synthetic_checks (check_name, occurred_at desc);

alter table public.product_sessions enable row level security;
alter table public.product_events enable row level security;
alter table public.error_events enable row level security;
alter table public.synthetic_checks enable row level security;

create policy product_sessions_owner_read on public.product_sessions
  for select using (auth.uid() = user_id);
create policy product_events_owner_read on public.product_events
  for select using (auth.uid() = user_id);
create policy error_events_owner_insert on public.error_events
  for insert with check (auth.uid() = user_id);

create or replace function public.record_product_activity(
  p_session_id uuid,
  p_path text,
  p_active_seconds integer default 0,
  p_page_view boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  safe_path text := left(coalesce(nullif(trim(p_path), ''), '/'), 200);
  safe_seconds integer := greatest(0, least(coalesce(p_active_seconds, 0), 60));
begin
  if current_user_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  insert into public.product_sessions (
    id, user_id, started_at, last_seen_at, active_seconds, last_path
  ) values (
    p_session_id, current_user_id, now(), now(), safe_seconds, safe_path
  )
  on conflict (id) do update
    set last_seen_at = now(),
        active_seconds = public.product_sessions.active_seconds + safe_seconds,
        last_path = safe_path
    where public.product_sessions.user_id = current_user_id;

  if p_page_view then
    insert into public.product_events (user_id, session_id, event_name, path)
    values (current_user_id, p_session_id, 'page_view', safe_path);
  end if;
end;
$$;

revoke all on function public.record_product_activity(uuid, text, integer, boolean) from public;
revoke all on function public.record_product_activity(uuid, text, integer, boolean) from anon;
grant execute on function public.record_product_activity(uuid, text, integer, boolean) to authenticated;

