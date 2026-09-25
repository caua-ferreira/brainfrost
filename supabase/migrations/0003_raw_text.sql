-- Guardar o texto colado do usuário pra rota /api/imports/[id]/analyze consumir.
-- ZIP e outros formatos vão para Storage numa próxima migration.
alter table public.imports add column raw_text text;
