alter table public.pattern_suggestions
  add column if not exists concepts text[] not null default '{}'::text[],
  add column if not exists suggested_links jsonb not null default '[]'::jsonb,
  add column if not exists category_reason text,
  add column if not exists category_confidence numeric;

alter table public.pattern_suggestions
  drop constraint if exists pattern_suggestions_category_confidence_check;

alter table public.pattern_suggestions
  add constraint pattern_suggestions_category_confidence_check
  check (category_confidence is null or (category_confidence >= 0 and category_confidence <= 1));

alter table public.vault_notes
  add column if not exists concepts text[] not null default '{}'::text[];
