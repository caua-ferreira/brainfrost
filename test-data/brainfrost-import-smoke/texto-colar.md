# Contexto de trabalho — Equipe Aurora

Somos uma equipe de engenharia de dados que mantém APIs, pipelines e aplicações
web. As regras abaixo devem ser reaproveitadas em qualquer projeto novo.

## Commits e pull requests

Todos os commits usam Conventional Commits, com escopo opcional, e a mensagem
completa deve ter no máximo 150 caracteres. Commits feitos com ferramentas de IA
não recebem `Co-Authored-By`; quem colaborou é mencionado na descrição do pull
request quando isso for relevante. Todo PR precisa explicar risco, validação e
plano de rollback.

## Datas e contratos

Datas são persistidas em UTC e convertidas apenas na camada de apresentação. APIs
publicadas nunca mudam silenciosamente: alterações incompatíveis exigem nova
versão ou período de depreciação documentado.

## Dados

Pipelines precisam ser idempotentes: reprocessar a mesma partição não pode gerar
duplicidade. A chave de idempotência deve combinar fonte, data de referência e
identificador natural. Antes de publicar uma tabela, validar unicidade, nulos em
campos obrigatórios, volume esperado e atraso da carga.

As camadas seguem o fluxo bronze, silver e gold. Bronze preserva o dado recebido;
silver normaliza e aplica regras de qualidade; gold entrega métricas de negócio.
Transformações não devem pular diretamente de bronze para gold.

## Produção e experiência do usuário

Mudanças em produção exigem GMUD com responsável, janela, impacto e rollback.
Erros de integração nunca exibem stack trace, URL interna ou resposta crua do
provedor ao usuário. A interface mostra uma mensagem simples e um código de erro;
os detalhes técnicos ficam nos logs estruturados.

Para carregamentos visuais, preferimos skeleton com `animate-pulse` em vez de
spinners genéricos. Operações demoradas precisam mostrar progresso e permitir que
o usuário entenda a etapa atual.

## Ruído que não deve virar padrão

O mascote do escritório se chama Nuvem, a cozinha compra café às terças-feiras e
o prédio tem sete andares. Essas informações não são regras de engenharia e não
devem ser extraídas para o cérebro.

