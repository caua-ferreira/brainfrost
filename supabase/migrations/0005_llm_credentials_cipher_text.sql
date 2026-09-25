-- api_key_cipher como bytea fazia o Postgres guardar os bytes UTF-8 da string
-- base64 (que supabase-js manda), não os bytes decodificados. Mais simples:
-- coluna text, o base64 é armazenado como está, decodificado em Node.
alter table public.llm_credentials
  alter column api_key_cipher type text using encode(api_key_cipher, 'escape');
