-- Permitir uma chave por provider (não só uma por conta).
alter table public.llm_credentials drop constraint llm_credentials_user_id_key;
alter table public.llm_credentials add constraint llm_credentials_user_id_provider_key unique (user_id, provider);
