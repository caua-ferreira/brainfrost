# Arquitetura e banco

Decisões que alteram fronteiras de serviços, contratos ou persistência são
registradas em ADR com contexto, alternativas, decisão e consequências.

Migrações de banco devem ser compatíveis com a versão anterior durante o deploy.
Primeiro adicionamos estruturas novas, depois migramos leitores e escritores e só
então removemos o legado. Tabelas com dados de usuário ativam RLS e começam sem
políticas permissivas; o acesso é liberado explicitamente por proprietário.

Datas são armazenadas em UTC. Conversão de fuso pertence à borda da aplicação,
nunca às consultas que definem regras de negócio.

