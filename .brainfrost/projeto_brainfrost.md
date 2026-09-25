---
title: BrainFrost
tags: [projeto, ferramenta]
layer: core
---

# BrainFrost

Segundo cérebro de contexto para IA. Mesma família do Permafrost: o que entra, congela e fica.
Relacionado: [[brainfrost_cli]], [[padrao_webapp]], [[index]], [[log_aprendizados]].

## Arquitetura (SaaS multiusuário)

Três partes, uma sozinha é fonte de verdade:

- **App online** (`brainfrost.vercel.app`) — Next.js 15 + Supabase, segue o [[padrao_webapp]].
  Login, upload de repo/markdown, análise por LLM, curadoria das sugestões, export por IA
  destino. **É a fonte de verdade do cofre.**
- **API do cofre** — rotas do próprio Next.js sobre Supabase (Postgres + RLS + Storage).
  Cada conta enxerga só o que é dela.
- **CLI (`bfrost`)** — cliente do SaaS. `bfrost login`, `bfrost pull`, `bfrost inject` no
  `CLAUDE.md` (ou no arquivo da IA destino). Não escreve mais no vault local — aprender é
  na UI.

O antigo `.brainfrost/` do Git vira histórico congelado da fase pessoal (ver
[[log_aprendizados]] entrada de 2026-09-24).

## Decisões

- **Banco existe.** Supabase Postgres com RLS por `auth.uid() = user_id`, trigger de dono
  no insert, unique por `(user_id, chave)`. Segue [[padrao_webapp]]. A regra antiga
  "sem banco" caiu quando o produto virou multiusuário.
- **Auth**: Supabase Auth com Google + GitHub + Azure/Microsoft (para quem tem conta de
  empresa).
- **Analisador**: LLM externo (Claude ou Gemini). Chave por usuário (BYOK) guardada
  criptografada com `pgcrypto` + chave-mestra em env da Vercel.
- **Ingestão**: ZIP, colar texto, GitHub OAuth (fase 6). Sempre passa por sanitizador
  antes de chegar no LLM: `.env*`, `*.pem`, `*.key`, `id_rsa*`, `credentials.json`,
  service accounts, blocos `PRIVATE KEY`, tokens `sk-*`/`ghp_*`/`AKIA*`, connection
  strings com senha, PII em seeds/fixtures. Binários ignorados. `xlsx`/`csv`/`json` podem
  ser lidos, mas só armazena se o extrator julgar útil.
- **Curadoria**: LLM devolve sugestões pendentes. O dono aceita, edita ou rejeita antes
  de virar camada. Nada entra no cofre no automático.
- **Export multi-IA**: CLAUDE.md (Claude Code), `.cursor/rules/*.mdc` (Cursor),
  `.github/copilot-instructions.md` (Copilot), `CONTEXTO.md` genérico (ChatGPT/Gemini
  web), SQL preset para Cortex.
- **Isolamento**: RLS em toda tabela + Supabase Storage privado por bucket-por-usuário.
  Nada de criptografia client-side — o servidor precisa ler para o LLM analisar.

## Estado

Virada em curso. Fase 0 cumprida (essa reescrita). Próxima: Fase 1 — auth + shell da UI
protegida, reaproveitando `brainfrost-ui`.

## Modelo de dados mínimo (referência)

```
vault_notes            id, user_id, slug, title, body, category, updated_at
vault_links            from_note_id, to_slug
imports                id, user_id, source (zip|text|github), status, created_at
pattern_suggestions    id, user_id, import_id, title, body, category, status
                       (pending|accepted|rejected|edited), evidence
llm_credentials        id, user_id, provider, api_key_ciphered
```
