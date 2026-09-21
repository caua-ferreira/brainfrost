---
title: Gestão de Vendas
tags: [projeto, vendas, pwa]
layer: core
---

# Gestão de Vendas

App web mobile-first de controle de vendas Natura, feito para uma usuária de mais de 50 anos.
Segue o [[padrao_webapp]]. Relacionado: [[projeto_folha_diaria]].

## Requisito que manda em tudo

Interface muito limpa, fonte legível, botão grande, pensada para o celular.
Quando uma decisão de UI brigar com outra coisa, esse requisito ganha.

## Técnico

- Supabase `natura-manager` (Postgres, Auth e Storage), `next-pwa`, Vercel `gestao-vendas-adriana`.
- Existe repositório no GitHub, mas o código nunca foi para lá: o deploy sai pelo conector da Vercel
  com a árvore inteira inline.
- `CONTEXTO.md` na raiz guarda decisões, contrato do banco e armadilhas.
- Regra combinada: pedir ok antes de qualquer deploy, para garantir envio completo.

## Em aberto

Cópia do backup para fora do Supabase, decidir entre Supabase Pro ou seguir com keepalive,
e uma tela de CRM ainda em discussão.
