# Padrões para pipelines

Todo pipeline é idempotente. A repetição de uma execução para a mesma fonte e data
de referência deve substituir ou mesclar os registros corretos, nunca duplicá-los.

O lakehouse usa três responsabilidades:

- bronze preserva o evento recebido e metadados de ingestão;
- silver normaliza tipos, remove duplicidades e aplica qualidade;
- gold publica métricas e dimensões prontas para consumo.

Antes de promover uma carga, executar testes de unicidade, campos obrigatórios,
volume mínimo/máximo e freshness. Uma falha bloqueia a publicação de gold e gera
alerta com identificador rastreável.

