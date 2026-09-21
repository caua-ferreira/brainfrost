---
title: Folha Diária
tags: [projeto, tdah, pwa]
layer: core
---

# Folha Diária

PWA mobile-first de organização diária, inspirado num planner para TDAH.
Segue o [[padrao_webapp]]. Relacionado: [[projeto_gestao_vendas]].

## O que cada folha tem

Foco do dia, três prioridades, tarefas com estimativa, blocos de tempo e energia das 6h às 22h,
plano B, distrações previstas, pausas, recompensa e avaliação do dia.

## Técnico

- Projeto Supabase dedicado `folha-diaria` (ref `pkeztpegqyvqokuykzom`), região us-east-1,
  tabela `daily_planners` com RLS aplicado.
- Multiusuário sem compartilhamento: cada conta enxerga só o que é dela.
- Publicado na Vercel, projeto `folha-diaria`.
- Auto-save sem botão: patch acumulado em ref com debounce de 700ms, gravando também ao trocar
  de dia e ao esconder a aba.
