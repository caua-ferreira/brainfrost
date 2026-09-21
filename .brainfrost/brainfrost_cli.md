---
title: BrainFrost CLI
tags: [ferramenta]
layer: core
---

# BrainFrost CLI

Relacionado: [[index]], [[padroes_arquitetura]].

O `bfrost` lê o cofre, monta o prompt e devolve pronto para o Cortex.

| Comando | O que faz |
| --- | --- |
| `bfrost ask "pergunta"` | puxa do Git, injeta o cofre e imprime o prompt final |
| `bfrost ask "..." --sql` | devolve um `SELECT SNOWFLAKE.CORTEX.COMPLETE(...)` pronto |
| `bfrost learn "titulo" "texto"` | grava em [[log_aprendizados]] e sobe para o Git |
| `bfrost sync` | pull e push sem tocar em conteúdo |
| `bfrost list` | lista as camadas, links e órfãos |
