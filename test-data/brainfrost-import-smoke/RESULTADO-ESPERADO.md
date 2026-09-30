# Gabarito da massa de importação

O resultado não precisa usar exatamente os mesmos títulos. Avalie o significado.
Como a análise está limitada a cinco sugestões, ela deve priorizar os padrões mais
duráveis e pode combinar regras relacionadas.

## Deve aparecer

- Conventional Commits, limite de 150 caracteres e ausência de coautoria de IA.
- Datas persistidas em UTC e versionamento/depreciação de contratos incompatíveis.
- Pipelines idempotentes e controles de qualidade antes da publicação.
- Separação das camadas bronze, silver e gold.
- Mudanças em produção com GMUD, validação e rollback.
- Erros seguros para o usuário, com código de referência e detalhes apenas nos logs.
- Skeleton/progresso para operações demoradas.
- Decisões arquiteturais registradas em ADR.
- Migrações de banco compatíveis e protegidas por RLS.

## Não deve aparecer

- Nome do mascote do escritório.
- Dia da compra do café.
- Quantidade de andares do prédio.
- Receita de pão de queijo.
- O placeholder de token presente no arquivo ignorado `.env.example`.

## Categorias esperadas

- `padroes_codigo`: commits e convenções de implementação.
- `padroes_arquitetura`: contratos, ADRs, banco e modelagem de dados.
- `contexto_trabalho`: GMUD, revisão e processo operacional.
- `padrao_webapp`: erros seguros, RLS e experiência de carregamento.
- `log_aprendizados`: incidentes e decisões derivadas deles.

## Critérios de aprovação

- A importação termina sem erro de JSON.
- São criadas de uma a cinco sugestões úteis.
- Nenhuma sugestão contém segredo ou conteúdo do arquivo ignorado.
- Os textos são legíveis e não terminam no meio de uma frase.
- O código de erro aparece na tela se houver falha.

