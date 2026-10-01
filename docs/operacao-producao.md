# Operação de produção

## Backup do Supabase

O workflow `Backup Supabase` executa aos domingos às 03:00 UTC e também pode
ser iniciado manualmente. Ele cria um dump do schema público, compacta, cifra
com AES-256, valida a descriptografia e publica o arquivo com checksum por 90
dias.

Segredos obrigatórios no repositório GitHub:

- `SUPABASE_DB_URL`: URI Postgres direta ou do Session Pooler, incluindo a
  senha do banco e `sslmode=require`.
- `BACKUP_PASSPHRASE`: frase aleatória longa, guardada também fora do GitHub em
  um gerenciador de senhas. Sem ela o backup não pode ser recuperado.

O dump deliberadamente exclui schemas gerenciados pelo Supabase (`auth`,
`storage`, `realtime` e outros). Ele protege os dados do BrainFrost no schema
`public`, mas não substitui um backup integral/PITR do projeto Supabase.

Depois de cadastrar os segredos:

1. Execute `gh workflow run backup.yml`.
2. Aguarde com `gh run watch` e confirme a conclusão verde.
3. Baixe o artifact em uma máquina isolada.
4. Confira o `.sha256`, decifre e restaure em um banco temporário, nunca direto
   em produção.

## Monitor de produção

O endpoint `/api/health` valida banco e o último teste sintético sem expor
dados de usuários. O workflow `Monitor produção` consulta o endpoint a cada 30
minutos. Em falha, abre ou atualiza uma issue com a label `production-alert`;
quando o serviço se recupera, fecha a issue automaticamente.

## Privacidade e conta

Em **Perfil > Seus dados**, cada usuário pode baixar um JSON com seus dados ou
excluir a conta. A exclusão exige a palavra `EXCLUIR`, cancela eventual
assinatura Stripe ativa, remove o avatar e apaga o usuário no Supabase. Dados
fiscais mantidos pelo Stripe seguem a retenção legal aplicável.

