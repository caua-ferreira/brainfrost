# Massa realista de importação do BrainFrost

Este pacote testa os três caminhos da tela **Importar** sem usar dados reais de
usuários.

## Teste 1 — Texto colado

1. Abra **Importar → Texto**.
2. Copie todo o conteúdo de `texto-colar.md`.
3. Analise e aguarde a Curadoria.
4. Compare o resultado com `RESULTADO-ESPERADO.md`.

## Teste 2 — Arquivos locais/pasta

1. Abra **Importar → Arquivos**.
2. Selecione a pasta `zip-source` ou seus arquivos.
3. Confirme que arquivos técnicos compatíveis são lidos.
4. Compare as sugestões com o gabarito.

## Teste 3 — ZIP

1. Abra **Importar → ZIP**.
2. Envie `brainfrost-import-smoke.zip`.
3. Confirme que o BrainFrost informa a quantidade de arquivos e conclui a análise.
4. Compare o resultado com o gabarito.

O gabarito fica fora do ZIP de propósito. Assim, a IA não recebe as respostas
esperadas como parte da entrada.

