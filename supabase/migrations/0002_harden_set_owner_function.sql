-- Segue advisors do Supabase: a função só serve pro trigger, nunca deve ser
-- chamada via RPC pelo anon/authenticated.
revoke execute on function public.set_owner_on_insert() from public, anon, authenticated;
