---
title: Índice do Cofre
tags: [meta]
layer: core
---

# Índice do Cofre

Ponto de entrada do BrainFrost. Tudo que a IA precisa saber antes de responder
qualquer coisa sobre os meus projetos começa aqui.

## Camadas

- [[padroes_arquitetura]] — regras de Snowflake, SQL, modelagem e pipeline.
- [[padroes_codigo]] — como eu escrevo web app, CLI e Python.
- [[contexto_trabalho]] — squads, ferramentas e processos do meu dia a dia.
- [[log_aprendizados]] — o que foi aprendido em cada interação, em ordem cronológica.
- [[glossario]] — nomes internos que só fazem sentido aqui dentro.
- [[padrao_webapp]] — a stack e as armadilhas que valem para todo app web meu.

## Projetos

- [[projeto_brainfrost]] — este ecossistema.
- [[projeto_folha_diaria]] — planner diário para TDAH.
- [[projeto_gestao_vendas]] — controle de vendas mobile.

## Como usar

1. `bfrost ask "pergunta"` injeta todas as camadas acima antes da pergunta.
2. `bfrost learn "titulo" "conteudo"` grava o que ficou decidido em [[log_aprendizados]].
3. O grafo na Vercel mostra o que está conectado e o que ficou órfão.

## Regras de resposta

- Responder em português do Brasil.
- Mostrar SQL e código completo, sem trechos pela metade.
- Apontar o risco antes da solução quando a mudança tocar em produção.
