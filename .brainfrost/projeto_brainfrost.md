---
title: BrainFrost
tags: [projeto, ferramenta]
layer: core
---

# BrainFrost

Segundo cérebro de contexto para IA. Mesma família do Permafrost: o que entra, congela e fica.
Relacionado: [[brainfrost_cli]], [[padrao_webapp]], [[index]].

## Arquitetura

Três pilares num repositório só:

- `.brainfrost/` — o cofre em Markdown com WikiLinks. É a fonte de verdade.
- `brainfrost-ui/` — Next.js na Vercel, desenha o grafo das conexões.
- `brainfrost-cli/` — o `bfrost`, Node sem dependência, injeta o cofre em qualquer IA.

## Decisões

- **Sem banco.** O Git já dá histórico, sincronismo entre máquinas e gatilho de deploy.
  Um Postgres aqui só criaria credencial para manter. Foge do [[padrao_webapp]] de propósito.
- **Neutro de provedor.** O CLI entrega o prompt por três caminhos: imprime, joga no stdin de
  um comando local, ou faz POST numa API. Snowflake Cortex é um preset entre vários, não o centro.
- Conteúdo lido no build: `bfrost learn` faz push, a Vercel reconstrói, o grafo atualiza.

## Estado

Primeiro uso é pessoal. Virar produto depois, então nada de decisão que só funcione para uma pessoa.
