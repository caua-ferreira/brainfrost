---
title: Contexto de trabalho
tags: [trabalho, processo]
layer: core
---

# Contexto de trabalho

Relacionado: [[padroes_arquitetura]], [[glossario]].

## Stack

Airflow para orquestração, S3 para arquivo, Jenkins para build e Control-M para
movimentação de arquivo. Snowflake é o destino e o Power BI é a ponta.

## Segmentação das demandas

- **FWBI-DATA** — ingestão e pré-processamento, até a Silver.
- **FWBI-APPS** — camada Gold e o que o relatório enxerga.

Quando a demanda chega sem dono claro, o corte é esse: mexeu em origem, é DATA;
mexeu no que o Power BI lê, é APPS.
