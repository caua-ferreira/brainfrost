-- Garante que arquivos/pastas locais sejam aceitos também em ambientes que
-- ainda carregam a restrição inicial, e distingue cancelamento de falha real.
alter table public.imports
  drop constraint if exists imports_source_check;

alter table public.imports
  add constraint imports_source_check check (
    source in ('text', 'files', 'zip', 'github')
  );

alter table public.imports
  drop constraint if exists imports_status_check;

alter table public.imports
  add constraint imports_status_check check (
    status in ('analisando', 'pronto', 'erro', 'cancelado')
  );
