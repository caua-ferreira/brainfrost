# ❄ BrainFrost

Segundo cérebro de contexto para IA. O conhecimento mora em Markdown versionado no Git,
o terminal injeta esse conhecimento em qualquer pergunta, e a web mostra como tudo se conecta.

Funciona com qualquer IA: Claude Code, Ollama, API da Anthropic ou da OpenAI, OpenRouter,
Snowflake Cortex, ou nenhuma delas — o prompt sai pronto para você colar onde quiser.

Mesma família do [Permafrost](https://pypi.org/project/permafrost/): o que entra, congela e fica.

🌐 **No ar:** [brainfrost.vercel.app](https://brainfrost.vercel.app)

```
brainfrost/
├── .brainfrost/        Pilar 1 — o cofre (Markdown + WikiLinks + _meta.json)
├── brainfrost-ui/      Pilar 2 — grafo e dashboards (Next.js na Vercel)
└── brainfrost-cli/     Pilar 3 — o injetor de contexto (Node, zero dependências)
```

## Por que Git e não banco

O cofre precisa de três coisas: histórico, sincronismo entre máquinas e um gatilho de
deploy. O Git entrega as três de graça. Um Supabase aqui só acrescentaria credencial para gerenciar
e um lugar a mais para o contexto ficar desatualizado. Por isso este projeto foge do padrão dos
outros apps: **não tem banco, não tem login, não tem servidor.**

---

## Rodando em outro PC

Máquina zerada, do começo ao `bfrost list` funcionando:

```bash
# 1. Node 18+ e Git são as únicas dependências reais.
node --version   # >= 18
git --version

# 2. Clone o repositório onde preferir (o cofre precisa estar num repo Git seu).
git clone https://github.com/caua-ferreira/brainfrost.git ~/brainfrost
cd ~/brainfrost

# 3. Instale o CLI globalmente.
cd brainfrost-cli
npm link                 # cria os comandos `brainfrost` e `bfrost` no PATH
bfrost --help            # confirma que subiu

# 4. Se você for chamar `bfrost` de fora do repositório, fixe o caminho do cofre uma vez.
bfrost config --vault ~/brainfrost/.brainfrost

# 5. Valide que enxerga o cofre.
cd ~
bfrost list              # deve listar as 11 camadas atuais
```

O CLI procura o cofre em três lugares, nesta ordem:

1. `$BRAINFROST_VAULT` — variável de ambiente, ganha de tudo.
2. O `vault` gravado no `~/.brainfrostrc` (via `bfrost config --vault`).
3. Subindo pastas a partir do CWD até achar um `.brainfrost/`.

Configure só uma vez. Nas próximas sessões o `bfrost` já está no PATH e sabe onde procurar.

### Configurando as IAs que você vai usar

O `bfrost ask` sai por três caminhos:

- **`print`** (padrão) — imprime o prompt, você cola onde quiser. Zero setup.
- **`cmd`** — joga no stdin de uma CLI local (`claude`, `ollama`, `llm`, `aichat`). Precisa
  ter o binário instalado.
- **`http`** — POST numa API. Cada provedor precisa da sua env var:

```bash
export ANTHROPIC_API_KEY=sk-ant-...      # para --provider anthropic
export OPENAI_API_KEY=sk-...             # para --provider openai
export OPENROUTER_API_KEY=sk-or-...      # para --provider openrouter
```

Chave **nunca** vai para o `~/.brainfrostrc` — o rc guarda `${NOME_DA_VAR}` e resolve na hora
do uso. Se você esquecer de exportar, o CLI diz qual variável falta.

Trocar o provedor padrão:

```bash
bfrost config --provider anthropic
bfrost meta && git add .brainfrost/_meta.json && git commit -m "❄️ meta" && git push
```

Esse `bfrost meta` regrava um snapshot da sua config no cofre. O dashboard `/config` do
site lê dele para mostrar o estado atual (sem valor de chave — só o nome da env var e se
está presente naquela máquina).

---

## Como colocar seus contextos

Uma **camada** é um arquivo `.md` dentro de `.brainfrost/`. Frontmatter é opcional mas
recomendado:

```markdown
---
title: Padrões de arquitetura
tags: [snowflake, sql]
layer: core          # core = azul no grafo · growth = verde-água
---

# Padrões de arquitetura

MERGE sempre com chave explícita. Nunca use MATCHED ON com coluna nullable.
Ver [[contexto_trabalho]] pro contexto de onde essa regra veio.
```

Campos:

| Campo | Para que serve |
| --- | --- |
| `title` | Nome que aparece no grafo e no reader. Se omitido, o CLI usa o primeiro `#` do corpo, e depois o nome do arquivo. |
| `tags` | Filtros. `bfrost ask --only snowflake` puxa toda camada com essa tag. Use poucas — 1 a 3 por camada. |
| `layer` | `core` para regra/padrão estável; `growth` para aprendizado/experimento. Muda a cor no grafo e ajuda a separar "verdade" de "acontecendo agora". |

**WikiLinks** conectam camadas: `[[slug]]` ou `[[slug|texto do link]]`. Acentos, maiúsculas,
`_` e `-` são normalizados — `[[Padrões Arquitetura]]` e `[[padroes_arquitetura]]` caem no
mesmo nó. Link para camada inexistente não quebra: aparece como pendência em `bfrost list`
e no banner amarelo do `/cofre`.

### Três formas de gravar

Todas commitam e fazem push automaticamente (`--no-push` grava só local se quiser revisar
antes):

```bash
# 1. Aprendizado curto — anexa ao log_aprendizados
bfrost learn "MERGE sempre com chave explícita" "Nunca use MATCHED ON com coluna nullable."

# 2. Aprendizado com tags e conexões
bfrost learn "Chave do MERGE" "Sempre explícita." \
  --tags snowflake,sql \
  --links padroes_arquitetura,contexto_trabalho

# 3. Camada nova em vez de append no log
bfrost learn "Onboarding do time" "Comece por ~/setup.sh e leia..." --file onboarding_time
```

Também dá pra editar os `.md` na mão (VS Code, vim, o que preferir) e depois `bfrost sync`
para pull + commit + push. O grafo reconstrói no próximo build.

### O que já está no cofre (exemplo real)

Rode `bfrost list` para ver a organização atual — camadas `core` são regras (padrões de
código, arquitetura, glossário, contexto do trabalho) e `growth` são projetos e o log de
aprendizados. É o formato testado; copie o padrão.

---

## Como gerar um contexto ideal

Regras que se pagaram sozinhas nas primeiras semanas:

**1. Uma camada = uma pergunta que ela responde.** Se o título precisa de "e", quebre em
duas. `padroes_arquitetura` cabe; `padroes_arquitetura_e_convencoes_de_teste` pede duas
camadas ligadas por WikiLink.

**2. Escreva pensando em novo dev, não em você.** Se você fosse pedir esse contexto pra
alguém que entra hoje, o que ele precisa saber? Regra > exemplo > exceção. Curto vence
completo.

**3. Cada camada com propósito claro no título.** Título ruim é `notas.md`. Título bom é
`padrao_webapp.md`. O grafo mostra só o título — se ele não se explica, você vai clicar
pra entender e o cofre perde valor.

**4. Comprimento: 150–500 palavras é o sweet spot.** Menos que 100 e a camada raramente
justifica um arquivo próprio; mais que 700 e você provavelmente misturou duas coisas.
Divida.

**5. Conecte com intenção, não por decoração.** `[[link]]` só quando o outro texto
realmente completa esse. WikiLink para "eu falo desse assunto em outro lugar também" —
não para "achei bonito citar". Camadas com muitos backlinks viram hubs; camadas órfãs
gritam pra serem juntadas ou apagadas.

**6. Tags como filtro por projeto ou tópico, não como hierarquia.** `tags: [snowflake, sql]`
serve para `bfrost ask "pergunta" --only snowflake`. `tags: [nivel1, nivel2, nivel3]` não
serve pra nada — tag hierárquica é sinal de que a organização certa seria mais camadas
com WikiLinks.

**7. Rode `bfrost list` toda semana.** Órfãos são candidatos a apagar ou reconectar. Links
quebrados são erro. O banner do `/cofre` mostra os dois.

**8. Refinar é gravar de novo.** Se você percebe que uma camada envelheceu, edite o `.md`
e faça `bfrost sync`. Não deixe camada zumbi no cofre — ela vira ruído no prompt.

**Sinal de camada boa:** você consegue copiar ela isolada e ainda faz sentido pra quem
lê. Se pra fazer sentido precisa das outras 3, ou junte ou linke melhor.

**Sinal de camada ruim que aparece cedo:** o `bfrost ask --only <camada>` gera prompt
que a IA responde com "preciso de mais contexto". Se o teste falha, a camada não estava
suficiente por si.

---

## Segurança: como não expor seus dados

**Regra dourada.** Assuma duas coisas:

1. O prompt inteiro vai para a IA — que pode logar, treinar ou vazar.
2. Este repositório pode virar público a qualquer momento (por acidente ou opção).

Se as duas hipóteses forem verdadeiras amanhã, o que está no cofre te queima? Se sim,
tire agora.

### O que vai, o que não vai

| ✅ Pode entrar | ❌ Nunca entra |
| --- | --- |
| Regra, padrão, decisão | CPF, CNPJ, RG, número de contrato |
| Padrão de código, arquitetura, glossário | Senha, token, chave de API, chave Pix |
| "Como pensamos sobre X" | Email pessoal de outros, telefone |
| Nome público de projeto ou tecnologia | Nome real de cliente, valor de contrato |
| Exemplo genérico (`cliente Fulano Ltda`) | Dado real de negócio, número interno |
| Estrutura de tabela sem dado | Dump de banco, export de planilha |

Já houve uma omissão deliberada no cofre atual: a chave Pix do app de vendas ficou de
fora e é referenciada como `<CHAVE_PIX_APP_VENDAS>` — o padrão pro que precisa aparecer
sem ser verdadeiro.

### Checagem antes de commitar

O `bfrost learn` grava e faz `git push` na sequência — se algo sensível entrou, já foi.
Duas defesas:

```bash
# 1. Grave sem push, revise, aí decide
bfrost learn "..." "..." --no-push
git diff --cached                 # olha o que vai commitar
# se ok:
git push
# se não:
git reset HEAD~1 --soft && edite o .md

# 2. Grep de segurança antes de qualquer push manual
git diff --cached | grep -iE "(cpf|cnpj|senha|password|token|secret|api[_-]?key|bearer|sk-)"
```

Bom hábito: um alias no shell (`git-safepush`) que roda o grep e só empurra se sair
limpo.

### Chaves de API

Chave nunca no `~/.brainfrostrc`. O rc guarda o **nome** da env var (`${ANTHROPIC_API_KEY}`)
e o CLI resolve na hora. Sem a env exportada, o comando falha e diz qual variável
exportar — em vez de rodar com placeholder ou vazio.

O `_meta.json` que alimenta o `/config` também **nunca** guarda valor de chave, só o
nome da env var e se ela estava presente no ambiente no momento da geração. Você pode
commitar o `_meta.json` num repo público sem risco.

### Cofre público vs. cofre privado

O cofre é um repositório Git — a visibilidade é decisão sua no GitHub.

- **Cofre público** (como este): só regra, padrão e conhecimento genérico. Serve como
  portfólio e ajuda outra gente a copiar o setup.
- **Cofre privado paralelo:** se o seu trabalho tem contexto realmente sensível (nomes
  de cliente, estratégia interna, dado de produção), crie **outro** repo privado com o
  mesmo padrão e aponte via `bfrost config --vault ~/trabalho/cofre-privado/.brainfrost`
  quando estiver dentro daquele projeto. O CLI aceita cofres diferentes por pasta — é
  só o que ele acha subindo do CWD.

Nunca misture os dois no mesmo repo. Não existe "camada privada" no mesmo cofre público:
uma vez commitado em repo público, considere vazado.

### Antes de tornar um repo do cofre público

Auditoria manual, uma vez:

```bash
bfrost list                              # visão geral
for slug in $(bfrost list ...); do       # ou olhe camada por camada
  bfrost show $slug
done
```

Depois, procure padrões que costumam denunciar dado real:

```bash
grep -rEn "(cpf|cnpj|@.*\.com|R\$ ?[0-9]|sk-[A-Za-z0-9]{20,})" .brainfrost/
```

Se voltar limpo, o repo pode virar público. Se algo sair, corrija antes.

---

## Usando em outros projetos / novas sessões

O CLI é global e neutro. Depois de instalado, você o chama de qualquer pasta.

### Do terminal, dentro de qualquer projeto

```bash
cd ~/projetos/app-de-vendas

# Injeta o cofre inteiro
bfrost ask "revisa esta modelagem"

# Só as camadas que importam para esse projeto
bfrost ask "revisa esta modelagem" --only trabalho,padroes_arquitetura

# Ver o prompt antes de gastar token
bfrost ask "qualquer coisa" --dry

# Copiar direto para a área de transferência
bfrost ask "qualquer coisa" --copy

# Salvar o resultado num arquivo
bfrost ask "gera o CHANGELOG" --provider anthropic --out CHANGELOG.md
```

`--only` aceita nome de camada (slug) ou tag. Ordem importa: se a tag `snowflake` estiver
em três camadas, `--only snowflake` puxa as três.

### Numa sessão do Claude Code (ou outra IA de chat)

Três rotinas testadas, do menos ao mais automático:

1. **Cola manual, uma vez no início da sessão:**
   ```bash
   bfrost ask "" --only index,padroes_codigo --copy
   ```
   Cola no chat como primeira mensagem. A sessão inteira herda esse contexto.

2. **Consulta rápida no site:**
   Abra [brainfrost.vercel.app](https://brainfrost.vercel.app), use `⌘K` para achar a
   camada, e o botão **copiar prompt** do reader. Vem formatado com título + tags + corpo,
   pronto para colar em qualquer chat.

3. **`bfrost inject` — automático, uma vez por projeto:**
   ```bash
   cd ~/projetos/app-de-vendas
   bfrost inject --only index,padroes_codigo,contexto_trabalho
   ```
   Grava um bloco entre marcadores no `CLAUDE.md` do repo. O Claude Code puxa
   automaticamente na próxima mensagem — não precisa mais colar nada. Rodar de novo
   substitui o bloco (idempotente); preserva o que já estava no arquivo.

Se você acaba pedindo o mesmo contexto no mesmo projeto todo dia, é sinal de que vale
gravar isso como aprendizado no cofre (`bfrost learn`) — a próxima pergunta já leva
automaticamente.

### Modo conversa

Para uma sessão longa numa API HTTP (Anthropic, OpenAI, OpenRouter, Ollama):

```bash
bfrost ask "esboça a arquitetura X"           --provider anthropic --continue
bfrost ask "detalha o passo 2"                --provider anthropic --continue
bfrost ask "e o custo de armazenar em Glacier?" --provider anthropic --continue

bfrost ask --history         # ver a conversa
bfrost ask "outra dúvida" --new  # apagar e começar do zero
```

O cofre entra só na primeira mensagem — as próximas mandam pergunta + histórico. Estado
mora em `~/.brainfrost/conversation.json`. Provedores `cmd` e `print` recusam `--continue`
com erro claro (não faz sentido histórico num prompt one-shot).

---

## Rodando o site localmente

Só necessário se você vai mexer no design ou testar antes de push:

```bash
cd brainfrost-ui
npm install
npm run vault          # diagnóstico: mostra onde o build vai achar o cofre
npm run dev            # http://localhost:3000
```

Rotas:

- `/` — grafo + reader panel. Slider de espaço, switch de rótulos e toggle "apagar camadas
  antigas" persistem no browser. Camadas atualizadas nos últimos 7 dias brilham inteiro;
  as com mais de 120 dias caem a 35% do brilho.
- `/camadas` — lista tabelada com busca full-text, filtros por layer e tag, ordenação.
- `/cofre` — dashboard: stat cards, gráfico de conexões por camada, tabela ordenável.
- `/config` — snapshot do `~/.brainfrostrc` gerado pelo `bfrost meta` (só-leitura).

`⌘K` em qualquer rota abre um command palette pra achar e abrir camada por título/tag/slug.

---

## CLI — referência rápida

| Comando | O que faz |
| --- | --- |
| `bfrost ask "pergunta"` | injeta o cofre e manda para a IA escolhida |
| `bfrost learn "título" "conteúdo"` | grava aprendizado, commita e faz push |
| `bfrost inject` | escreve o cofre no `CLAUDE.md` do repo atual |
| `bfrost list` | camadas, conexões, órfãos e links quebrados |
| `bfrost show <slug>` | imprime uma camada no terminal |
| `bfrost open <slug>` | abre a camada no editor ($EDITOR ou fallback code/codium/…) |
| `bfrost prune` | aponta camadas para revisar (órfãs, curtas, quebradas, esquecidas) |
| `bfrost providers` | lista as IAs configuradas, mostra a ativa |
| `bfrost sync` | pull + commit + push (regenera `_meta.json`) |
| `bfrost meta` | regera `.brainfrost/_meta.json` sem tocar em git |
| `bfrost init` | cria um cofre novo com as camadas base |
| `bfrost config` | mostra ou muda cofre, provedor e modelo |

Flags mais usadas do `ask`:

| Flag | Efeito |
| --- | --- |
| `--provider <nome>` | claude, ollama, anthropic, openai, openrouter, cortex, print… |
| `--model <nome>` | modelo, quando o provedor aceitar |
| `--only a,b` | usa só essas camadas ou tags |
| `--dry` | mostra o prompt sem enviar |
| `--copy` | manda para a área de transferência |
| `--out <arquivo>` | grava o resultado em arquivo |
| `--no-pull` | não puxa do Git antes |
| `--continue` | continua a última conversa (só provedores http) |
| `--new` | apaga a conversa atual antes de perguntar |
| `--history` | mostra a conversa em andamento |

Flags do `learn`:

| Flag | Efeito |
| --- | --- |
| `--tags a,b` | tags da entrada |
| `--links slug,slug` | cria os WikiLinks de relacionamento |
| `--file nome` | grava numa camada própria em vez do log |
| `--no-push` | só grava local, você revisa e empurra depois |

Config completa em `~/.brainfrostrc`. `BRAINFROST_VAULT` ganha de tudo. O texto de
instrução que abre o prompt também é configurável no campo `header`.

---

## Deploy do site (se quiser fazer o seu)

Este repositório já está publicado em `brainfrost.vercel.app`. Para hospedar o seu fork:

1. Suba o repositório inteiro para o GitHub (a raiz, com `.brainfrost` junto).
2. Na Vercel, importe o repositório e defina **Root Directory = `brainfrost-ui`**.
3. Em Settings → Build, mantenha ligada **Include source files outside of the Root Directory**.
   É ela que faz o `../.brainfrost` existir na hora do build.
4. Deploy. Todo `bfrost learn` ou `bfrost sync` reconstrói o site sozinho.

**Atenção no plano Hobby:** a Vercel bloqueia deploy via webhook do GitHub quando o email do
commit author não bate com o dono do time. Ajuste com `git config user.email <email-da-sua-conta-vercel>`
no repo local.

Se preferir não depender da opção "Include source files outside", copie o cofre para
dentro do app antes de buildar (`cp -r ../.brainfrost ./brainfrost-ui/content`) — o parser
procura em `content/` também.

---

## Testes

Duas suítes rodam sem rede, sem credenciais e sem `npm link`:

```bash
# CLI — node test runner nativo, zero dependência
cd brainfrost-cli
npm test                # roda unit + smoke E2E

# UI — vitest
cd brainfrost-ui
npm install             # se ainda não instalou
npm test                # roda unit tests dos módulos lib/
```

**CLI (50 testes):**
- `test/vault.test.js` — parsing (slugify, frontmatter, WikiLinks), backlinks, stats.
- `test/prompt.test.js` — ordem canônica das camadas, filtros, montagem do prompt.
- `test/commands/inject.test.js` — bloco idempotente, criar/anexar/substituir.
- `test/commands/prune.test.js` — 6 categorias de finding, acúmulo.
- `test/commands/conversation.test.js` — load/save/append usando `$HOME` temporário.
- `test/smoke.test.js` — spawn do binário real: `init`, `list`, `show`, `learn --no-push`,
  `ask --dry`, `inject`, `inject --only`, `meta`, `prune`, `providers`, `--version`,
  erros de comando/slug inexistente.

**UI (22 testes):**
- `lib/vault.test.ts` — parser client-side, `linkifyWikiLinks`, `readVault` com cofre
  temporário via `BRAINFROST_VAULT`.
- `lib/chat-prompt.test.ts` — `selectNotesForChat`, `formatContextForChat`,
  `buildChatOpener`.
- `lib/chat-client.test.ts` — headers e body por api (`openai`, `anthropic`, `gemini`,
  `ollama`, `cortex`), erros amigáveis (CORS/rede/401), fetch mockado.

Adicionar teste novo: coloque em `test/**/*.test.js` (CLI) ou `lib/**/*.test.ts` /
`components/**/*.test.tsx` (UI). Cada runner descobre automaticamente.

---

## Armadilhas já mapeadas

- O conteúdo é lido **no build**, não em runtime. Editar `.md` sem dar push significa grafo
  velho no site. `npm run dev` recarrega a cada save.
- Datas na UI precisam de `timeZone: "UTC"` fixo. Sem isso, server (iad1) e cliente formatam
  dias diferentes e o React 19 crasha por hydration mismatch (erro `#418`).
- `react-force-graph-2d` toca em `window`: só entra por `dynamic(..., { ssr: false })`.
- Nós no primeiro tick ainda não têm `x`/`y` válidos — `createRadialGradient` com NaN
  derruba a página. O `GraphCanvas` protege com guard, cuide se refatorar.
- Next abaixo de `15.5.4` é barrado no build por CVE. Não baixe a versão.
- Windows apaga o bit executável do `brainfrost-cli/bin/brainfrost.js` a cada edição. Antes
  de commitar, `git update-index --chmod=+x brainfrost-cli/bin/brainfrost.js`.

Contexto completo de decisões e estado atual em [`CONTEXTO.md`](./CONTEXTO.md).
Plano de UI em [`brainfrost-ui/REDESIGN.md`](./brainfrost-ui/REDESIGN.md).

---

## Próximos passos possíveis

- **`bfrost inject`** — grava um bloco de contexto no `CLAUDE.md` de outro repo, para o
  Claude Code puxar automaticamente sem precisar de `bfrost ask`.
- Modo conversa: `bfrost ask` mantendo histórico entre perguntas.
- Visão temporal no grafo: camadas recentes mais brilhantes, antigas opacas.
- `bfrost prune` para apontar camadas que ninguém cita há meses.
- Cofre compartilhado por equipe, com camadas públicas e privadas.
