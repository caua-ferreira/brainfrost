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

Duas rotinas testadas:

1. **Cola manual, uma vez no início da sessão:**
   ```bash
   bfrost ask "" --only index,padroes_codigo --copy
   ```
   Cola no chat como primeira mensagem. A sessão inteira herda esse contexto.

2. **Consulta rápida no site:**
   Abra [brainfrost.vercel.app](https://brainfrost.vercel.app), clique na camada, use o
   botão **copiar prompt** do reader. Vem formatado com título + tags + corpo, pronto para
   colar em qualquer chat.

Se você acaba pedindo o mesmo contexto no mesmo projeto todo dia, é sinal de que vale
gravar isso como aprendizado no cofre (`bfrost learn`) — a próxima pergunta já leva
automaticamente.

### Grave o que aprender

```bash
# Aprendizado avulso (vai no log)
bfrost learn "MERGE sempre com chave explícita" "Nunca use MATCHED ON com coluna nullable."

# Marca com tags e faz ligações
bfrost learn "Chave do MERGE" "Sempre explícita." \
  --tags snowflake,sql \
  --links padroes_arquitetura,contexto_trabalho

# Cria uma camada nova em vez de acrescentar ao log
bfrost learn "Onboarding do time" "..." --file onboarding_time
```

O `learn` grava o arquivo, commita (`❄️ Novo aprendizado no BrainFrost: <título>`) e faz push.
A Vercel reconstrói o grafo. Em outra máquina, `bfrost sync` (ou `git pull`) recebe.

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

- `/` — grafo + reader panel. Slider de espaço e switch de rótulos persistem no browser.
- `/cofre` — dashboard: stat cards, gráfico de conexões por camada, tabela ordenável.
- `/config` — snapshot do `~/.brainfrostrc` gerado pelo `bfrost meta` (só-leitura).
- `/camadas` — placeholder (planejado como lista filtrável).

---

## O cofre

Cada arquivo `.md` dentro de `.brainfrost` é uma camada. O frontmatter é opcional:

```markdown
---
title: Padrões de arquitetura
tags: [snowflake, sql]
layer: core        # core = azul no grafo, growth = verde-água
---

# Padrões de arquitetura

MERGE sempre com chave explícita. Ver [[contexto_trabalho]].
```

WikiLinks (`[[slug]]` ou `[[slug|rótulo]]`) viram arestas no grafo. Acentos, maiúsculas, `_` e `-`
são normalizados: `[[padroes_arquitetura]]` e `[[Padrões Arquitetura]]` caem no mesmo nó.
Link para camada inexistente não quebra — aparece como pendência em `bfrost list` e no `/cofre`.

---

## CLI — referência rápida

| Comando | O que faz |
| --- | --- |
| `bfrost ask "pergunta"` | injeta o cofre e manda para a IA escolhida |
| `bfrost learn "título" "conteúdo"` | grava aprendizado, commita e faz push |
| `bfrost list` | camadas, conexões, órfãos e links quebrados |
| `bfrost show <slug>` | imprime uma camada no terminal |
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
- **Nunca coloque dado pessoal ou de cliente no cofre.** O prompt inteiro vai para a IA, e
  o repositório pode virar público sem querer. Estrutura e regra, sim; CPF, chave e segredo, não.

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
