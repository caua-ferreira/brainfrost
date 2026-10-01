-- Permite que o suporte defina uma franquia mensal personalizada por usuário.
-- A ausência de registro mantém o limite padrão de 30 análises por mês.
create table public.managed_llm_quota_limits (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  monthly_limit  integer not null check (monthly_limit between 1 and 10000),
  reason         text not null check (char_length(reason) between 3 and 500),
  granted_by     uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.managed_llm_quota_limits enable row level security;

create policy managed_llm_quota_limits_owner_read
  on public.managed_llm_quota_limits
  for select using (auth.uid() = user_id);

alter table public.subscription_admin_events
  drop constraint if exists subscription_admin_events_action_check;

alter table public.subscription_admin_events
  add constraint subscription_admin_events_action_check check (
    action in (
      'grant', 'extend', 'lifetime', 'revoke',
      'block', 'unblock', 'set_quota', 'reset_quota'
    )
  );

create or replace function public.consume_managed_llm_quota()
returns table (
  allowed boolean,
  used integer,
  quota_limit integer,
  resets_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_period date := date_trunc('month', now() at time zone 'UTC')::date;
  current_usage integer;
  effective_limit integer;
  was_allowed boolean := false;
begin
  if current_user_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select coalesce(
    (select monthly_limit
       from public.managed_llm_quota_limits
      where user_id = current_user_id),
    30
  ) into effective_limit;

  insert into public.managed_llm_usage (user_id, period_start, usage_count)
  values (current_user_id, current_period, 1)
  on conflict (user_id, period_start) do update
    set usage_count = public.managed_llm_usage.usage_count + 1,
        updated_at = now()
    where public.managed_llm_usage.usage_count < effective_limit
  returning usage_count into current_usage;

  if found then
    was_allowed := true;
  else
    select usage_count
      into current_usage
      from public.managed_llm_usage
      where user_id = current_user_id
        and period_start = current_period;
  end if;

  return query select
    was_allowed,
    coalesce(current_usage, 0),
    effective_limit,
    ((current_period + interval '1 month')::timestamp at time zone 'UTC');
end;
$$;

revoke all on function public.consume_managed_llm_quota() from public;
revoke all on function public.consume_managed_llm_quota() from anon;
grant execute on function public.consume_managed_llm_quota() to authenticated;

-- Notificações persistentes exibidas dentro da aplicação.
create table public.app_notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null check (kind in ('pro_granted', 'pro_extended', 'system')),
  title       text not null,
  message     text not null,
  href        text,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index app_notifications_user_time_idx
  on public.app_notifications (user_id, created_at desc);

alter table public.app_notifications enable row level security;

create policy app_notifications_owner_read on public.app_notifications
  for select using (auth.uid() = user_id);

create policy app_notifications_owner_update on public.app_notifications
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
