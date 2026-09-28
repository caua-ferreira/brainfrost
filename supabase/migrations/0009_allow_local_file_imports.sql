-- Permite registrar imports montados a partir de arquivos/pastas locais.
alter table public.imports drop constraint if exists imports_source_check;
alter table public.imports
  add constraint imports_source_check check (source in ('text', 'files', 'zip', 'github'));
