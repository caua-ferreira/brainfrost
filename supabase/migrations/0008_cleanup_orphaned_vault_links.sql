-- Remove referências de entrada quando uma camada é apagada.
-- vault_links.to_slug é texto para suportar links por slug, então o banco
-- precisa limpar as referências que não são cobertas pelo ON DELETE CASCADE.

create or replace function public.cleanup_incoming_vault_links()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.vault_links l
  where l.to_slug = old.slug
    and exists (
      select 1
      from public.vault_notes source_note
      where source_note.id = l.from_note_id
        and source_note.user_id = old.user_id
    );
  return old;
end;
$$;

drop trigger if exists vault_notes_cleanup_incoming_links on public.vault_notes;
create trigger vault_notes_cleanup_incoming_links
before delete on public.vault_notes
for each row execute function public.cleanup_incoming_vault_links();
