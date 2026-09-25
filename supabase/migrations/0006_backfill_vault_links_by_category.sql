-- Backfill: cria vault_links entre camadas da mesma categoria e mesmo dono,
-- pra camadas que foram aceitas antes do auto-link por categoria existir na
-- rota de curadoria. A partir daqui novas aceitações já criam os links.
insert into public.vault_links (from_note_id, to_slug)
select n1.id, n2.slug
from public.vault_notes n1
join public.vault_notes n2
  on n1.category = n2.category
 and n1.user_id = n2.user_id
 and n1.id <> n2.id
where not exists (
  select 1 from public.vault_links vl
  where vl.from_note_id = n1.id and vl.to_slug = n2.slug
);
