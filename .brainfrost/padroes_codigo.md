---
title: Padrões de código
tags: [web, python, cli]
layer: core
---

# Padrões de código

Relacionado: [[padroes_arquitetura]], [[glossario]].

## Web app

- Next.js (App Router), Tailwind e shadcn/ui.
- Quando o app tem login e dados por pessoa: Supabase com RLS por `auth.uid() = user_id`,
  trigger que força o dono no insert e unique por `(user_id, chave)`.
- Mobile-first de verdade: alvo de toque grande, fonte legível, nada de hover como
  único caminho para uma ação.
- Deploy na Vercel. Next em versão sem CVE aberto, senão o build é barrado.

## Ferramenta de linha de comando

- Zero dependência quando der: só o que vem no Node.
- Todo comando que escreve no disco diz o que escreveu e onde.
- Falha com mensagem que explica o próximo passo, não com stack trace.

## Python

- Tipagem nas funções públicas, docstring curta e teste do caminho feliz.
- Compressão e arquivamento seguem o que já está no Permafrost.
