-- Franquia mensal da LLM gerenciada para assinantes Pro.
-- O consumo e a verificacao acontecem na mesma operacao para evitar que
-- requisicoes concorrentes ultrapassem o limite.
create table public.managed_llm_usage (
  user_id       uuid not null references auth.users(id) on delete cascade,
  period_start  date not null,
  usage_count   integer not null default 0 check (usage_count >= 0),
  updated_at    timestamptz not null default now(),
  primary key (user_id, period_start)
);

alter table public.managed_llm_usage enable row level security;

create policy managed_llm_usage_owner_read on public.managed_llm_usage
  for select
  using (auth.uid() = user_id);

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
  was_allowed boolean := false;
  monthly_limit constant integer := 30;
begin
  if current_user_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  insert into public.managed_llm_usage (user_id, period_start, usage_count)
  values (current_user_id, current_period, 1)
  on conflict (user_id, period_start) do update
    set usage_count = public.managed_llm_usage.usage_count + 1,
        updated_at = now()
    where public.managed_llm_usage.usage_count < monthly_limit
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
    monthly_limit,
    ((current_period + interval '1 month')::timestamp at time zone 'UTC');
end;
$$;

revoke all on function public.consume_managed_llm_quota() from public;
revoke all on function public.consume_managed_llm_quota() from anon;
grant execute on function public.consume_managed_llm_quota() to authenticated;

-- Registra a origem da analise para auditoria. A restricao inicial aceitava
-- apenas Claude e Gemini e impediria WebLLM/OpenRouter de finalizar o import.
alter table public.imports
  drop constraint if exists imports_provider_used_check;

alter table public.imports
  add constraint imports_provider_used_check check (
    provider_used is null
    or provider_used in ('claude', 'gemini', 'webllm', 'brainfrost')
    or provider_used like 'brainfrost:%'
  );
