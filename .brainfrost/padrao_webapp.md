---
title: Padrão de web app
tags: [web, next, supabase, vercel]
layer: core
---

# Padrão de web app

Padrão aplicado em [[projeto_folha_diaria]] e [[projeto_gestao_vendas]].
Detalhe de código em [[padroes_codigo]]. [[projeto_brainfrost]] foge dele de propósito.

## Stack

Next.js (App Router), Tailwind, shadcn/ui, Supabase para banco e auth, deploy na Vercel.

## Multiusuário desde o primeiro dia

Todo app tem pelo menos duas pessoas usando. Então:

- RLS com `auth.uid() = user_id` em toda tabela.
- Trigger que força o dono no insert, para o cliente não conseguir mentir.
- Unique por `(user_id, chave)` em vez de unique global.

## Armadilhas do deploy pelo conector da Vercel

- Não grava variável de ambiente: URL e anon key ficam em `lib/supabase/config.ts` como fallback
  de `process.env`.
- Arquivo binário corrompe no envio inline: ícone de PWA em SVG, ícone do iOS gerado no build
  com `next/og`.
- Leitura de status volta 403: quem confere se o build passou é você, no painel.
- A Vercel barra versão de Next com CVE aberto. O 15.1.6 foi rejeitado; usar `^15.5.4`.
