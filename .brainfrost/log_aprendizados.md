---
title: Log de aprendizados
tags: [log]
layer: growth
---

# Log de aprendizados

Cada entrada é uma camada nova de gelo. O mais recente fica no topo do grafo pelo
carimbo de data. Escrito por `bfrost learn`, nunca à mão.

<!-- bfrost:learn-anchor -->

## 2026-09-24 — Virada para SaaS multiusuário

A regra "sem banco" do [[projeto_brainfrost]] cai. O cofre passa a morar no Supabase
(RLS por `auth.uid() = user_id`, segue [[padrao_webapp]]), e o app online vira a fonte
de verdade. Motivo: o requisito mudou — aprender padrões automaticamente varrendo
repositórios, com upload e curadoria pela UI, exige servidor com análise por LLM;
Git como storage único só cabia enquanto era pessoal.

A virada leva junto: auth Supabase (Google, GitHub, Azure), BYOK do LLM analisador
(Claude/Gemini) criptografado com `pgcrypto`, sanitizador de segredos e PII no upload,
tela de curadoria antes de qualquer sugestão virar camada, e export por IA destino
(Claude Code, Cursor, Copilot, Cortex, genérico).

O `.brainfrost/` deste Git vira histórico congelado da fase pessoal. O CLI passa a ser
cliente do SaaS: `bfrost login` + `bfrost pull` + `bfrost inject`. `bfrost learn` some
— aprender é na UI, com curadoria.

Relacionado: [[projeto_brainfrost]], [[padrao_webapp]], [[brainfrost_cli]]

Tags: `arquitetura`, `brainfrost`, `virada`

## 2026-09-20 — Cofre nasce versionado

O contexto mora no Git, não num banco. Isso resolve os três pontos de uma vez:
histórico, sincronismo entre trabalho e casa, e deploy da interface.
Sem servidor para manter, sem credencial para vazar.

Relacionado: [[index]], [[brainfrost_cli]]

Tags: `arquitetura`, `brainfrost`
