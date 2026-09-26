# Backup do Supabase

O workflow `.github/workflows/backup.yml` roda `pg_dump` do banco `brainfrost-saas` toda
segunda 03h UTC (00h Brasília na maior parte do ano). O dump é criptografado com AES-256
antes de virar artifact — o repo é público, então nada trafega em claro.

## Setup (uma vez)

1. **Descubra a connection string do Supabase**
   - Dashboard → Project Settings → Database → Connection string → **URI**
   - Usa a *Session pooler* (porta `5432`); a Transaction pooler (`6543`) não aceita
     comandos administrativos que o `pg_dump` emite.

2. **Escolha uma passphrase forte** e guarde no seu password manager. Sem ela o dump
   volta a ser um `.gpg` inútil.

3. **Adicione os secrets no GitHub**
   - Repo Settings → Secrets and variables → Actions → New repository secret
   - `SUPABASE_DB_URL` = a connection string com senha
   - `BACKUP_PASSPHRASE` = a passphrase do passo 2

4. **Rode manual pra validar**
   - Actions → *Backup Supabase* → Run workflow → escolha branch `main`
   - Se der verde, baixe o artifact e teste o restore (passo abaixo).

## Restaurar

```bash
# baixa o artifact do GitHub, descriptografa e descompacta
gpg --batch --pinentry-mode loopback \
    --passphrase "$BACKUP_PASSPHRASE" \
    -d brainfrost-YYYYMMDDTHHMMSSZ.sql.gz.gpg \
  | gunzip -c > backup.sql

# aplica em um banco vazio
psql "$RESTORE_DB_URL" -f backup.sql
```

## O que **não** é copiado

O `pg_dump` do workflow exclui os schemas gerenciados pelo próprio Supabase (`auth`,
`storage`, `graphql`, `realtime`, `vault`, `extensions`, `supabase_functions`) porque
o próprio Supabase remonta essas partes ao criar um projeto novo.

Se você fizer restore em outro projeto Supabase, os IDs de `auth.users` precisam
existir antes de importar dados que referenciam `user_id` — reconvide os usuários
via Auth Admin API primeiro.

## Retenção

Artifact do Actions fica **90 dias**. Se precisar de retenção mais longa, baixe
periodicamente pro seu Google Drive/Drive local — o pedido "backup fora do Supabase"
inclui "fora do GitHub também".
