-- Controles operacionais: rate limit distribuído para rotas autenticadas.
-- A tabela não é exposta ao cliente; somente a função security definer pode
-- consumir uma janela pertencente ao usuário autenticado.
create table public.api_rate_limits (
  user_id       uuid not null references auth.users(id) on delete cascade,
  bucket        text not null,
  window_start  timestamptz not null,
  request_count integer not null default 1 check (request_count > 0),
  primary key (user_id, bucket, window_start)
);

create index api_rate_limits_window_idx
  on public.api_rate_limits (window_start);

alter table public.api_rate_limits enable row level security;

create or replace function public.consume_api_rate_limit(
  p_bucket text,
  p_limit integer,
  p_window_seconds integer
)
returns table (
  allowed boolean,
  remaining integer,
  resets_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  safe_bucket text := left(regexp_replace(coalesce(p_bucket, ''), '[^a-zA-Z0-9:_-]', '', 'g'), 80);
  safe_limit integer := greatest(1, least(coalesce(p_limit, 1), 1000));
  safe_window integer := greatest(10, least(coalesce(p_window_seconds, 60), 86400));
  current_window timestamptz;
  next_count integer;
begin
  if current_user_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if safe_bucket = '' then
    raise exception 'invalid bucket' using errcode = '22023';
  end if;

  current_window := to_timestamp(
    floor(extract(epoch from now()) / safe_window) * safe_window
  );

  insert into public.api_rate_limits (user_id, bucket, window_start, request_count)
  values (current_user_id, safe_bucket, current_window, 1)
  on conflict (user_id, bucket, window_start) do update
    set request_count = public.api_rate_limits.request_count + 1
  returning request_count into next_count;

  return query select
    next_count <= safe_limit,
    greatest(0, safe_limit - next_count),
    current_window + make_interval(secs => safe_window);
end;
$$;

revoke all on function public.consume_api_rate_limit(text, integer, integer) from public;
revoke all on function public.consume_api_rate_limit(text, integer, integer) from anon;
grant execute on function public.consume_api_rate_limit(text, integer, integer) to authenticated;

