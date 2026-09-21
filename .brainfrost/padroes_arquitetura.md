---
title: Padrões de arquitetura
tags: [snowflake, sql, dados]
layer: core
---

# Padrões de arquitetura

Regras que valem para tudo que eu construo na camada de dados.
Relacionado: [[contexto_trabalho]], [[glossario]], [[padroes_codigo]].

## Medalhão

- Bronze guarda o dado cru, sem cast e sem regra de negócio.
- Silver normaliza tipo, chave e deduplicação.
- Gold só materializa o que o Power BI consome. Nada de regra nova na Gold
  que não esteja documentada aqui.

## Snowflake

- Nome de objeto em `SNAKE_CASE` maiúsculo; coluna técnica com prefixo `DW_`.
- Toda tabela Gold tem `DW_LOAD_TS` e `DW_SOURCE`.
- `MERGE` sempre com chave explícita; nunca `INSERT OVERWRITE` sem janela.
- Warehouse de carga separado do warehouse de consulta.
- CTE nomeada por etapa (`base_`, `filtro_`, `agg_`), nunca `t1`/`t2`.

## Snowflake Cortex

- Usar `SNOWFLAKE.CORTEX.COMPLETE` com o contexto injetado pelo [[brainfrost_cli]].
- Prompt vai em string dollar-quoted (`$$ ... $$`) para não brigar com aspas do SQL.
- Nunca mandar dado de cliente dentro do prompt; só estrutura e regra.

## Mudança em produção

- Alteração em Control-M, Airflow ou Jenkins exige GMUD.
- Antes de propor mudança na cadeia, listar o que quebra se o passo anterior atrasar.
