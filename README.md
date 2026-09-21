# ❄ BrainFrost

Segundo cérebro de contexto para IA. O conhecimento mora em Markdown versionado no Git,
o terminal injeta esse conhecimento em qualquer pergunta, e a web mostra como tudo se conecta.

Funciona com qualquer IA: Claude Code, Ollama, API da Anthropic ou da OpenAI, OpenRouter,
Snowflake Cortex, ou nenhuma delas — o prompt sai pronto para você colar onde quiser.

Mesma família do [Permafrost](https://pypi.org/project/permafrost/): o que entra, congela e fica.

```
brainfrost/
├── .brainfrost/        Pilar 1 — o cofre (Markdown + WikiLinks)
├── brainfrost-ui/      Pilar 2 — grafo interativo (Next.js na Vercel)
└── brainfrost-cli/     Pilar 3 — o injetor de contexto (Node, zero dependências)
```

## Por que Git e não banco

O cofre precisa de três coisas: histórico, sincronismo entre o trabalho e a casa, e um gatilho de
deploy. O Git entrega as três de graça. Um Supabase aqui só acrescentaria credencial para gerenciar
e um lugar a mais para o contexto ficar desatualizado. Por isso este projeto foge do padrão dos
outros apps: **não tem banco, não tem login, não tem servidor.**

---

## Pilar 1 — O cofre

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
são normalizados, então `[[padroes_arquitetura]]` e `[[Padrões Arquitetura]]` chegam no mesmo lugar.
Link para camada inexistente não quebra nada: aparece como pendência no painel e em `bfrost list`.

---

## Pilar 3 — CLI (instale primeiro)

```bash
cd brainfrost-cli
npm link          # cria os comandos globais: brainfrost e bfrost
bfrost --help
```

Se o repositório não ficar numa pasta pai do seu terminal, fixe o caminho uma vez:

```bash
bfrost config --vault ~/projetos/brainfrost/.brainfrost
```

### Perguntar

```bash
# padrão: imprime o prompt com o contexto, você cola em qualquer IA
bfrost ask "como eu resolvo isso?"

# manda direto para a IA que você escolher
bfrost ask "revisa esta modelagem" --provider claude
bfrost ask "revisa esta modelagem" --provider ollama --model llama3.1
bfrost ask "revisa esta modelagem" --provider anthropic

# SQL pronto para o worksheet do Cortex, já copiado
bfrost ask "revisa esta modelagem" --provider cortex --copy

# só as camadas que interessam, quando o cofre crescer
bfrost ask "revisa este MERGE" --only trabalho,index

# ver o prompt antes de gastar token
bfrost ask "qualquer coisa" --dry
```

O `ask` dá `git pull --rebase --autostash` antes de montar o prompt. Sem rede ou sem remote, ele
avisa e segue com o local. O rodapé mostra quantas camadas entraram e a estimativa de tokens.

### Plug and play: qualquer IA

`bfrost providers` lista o que está disponível. Um provedor é uma das três coisas:

| tipo | o que faz | exemplos prontos |
| --- | --- | --- |
| `print` | imprime ou copia o prompt | `print`, `clipboard`, `cortex` |
| `cmd` | joga no stdin de um comando local | `claude`, `ollama`, `llm` |
| `http` | POST numa API compatível | `anthropic`, `openai`, `openrouter`, `ollama-http` |

Trocar o padrão: `bfrost config --provider claude`.

Criar o seu é editar `~/.brainfrostrc`:

```json
{
  "provider": "meu-lm",
  "providers": {
    "meu-lm": {
      "kind": "http",
      "api": "openai",
      "url": "http://localhost:1234/v1/chat/completions",
      "model": "qwen2.5-coder",
      "headers": { "Authorization": "Bearer ${MINHA_CHAVE}" }
    }
  }
}
```

`${MINHA_CHAVE}` é lido do ambiente na hora do uso. **Chave de API nunca é gravada no rc** — se a
variável não existir, o comando falha dizendo qual exportar.

O campo `api` molda o corpo da requisição e a leitura da resposta: `anthropic`, `openai` ou `ollama`.

### O resto

| Comando | O que faz |
| --- | --- |
| `bfrost list` | camadas, conexões, órfãos e links quebrados |
| `bfrost show <slug>` | imprime uma camada no terminal |
| `bfrost providers` | lista as IAs configuradas e mostra a ativa |
| `bfrost sync` | pull + commit + push, sem mexer em conteúdo |
| `bfrost init` | cria um cofre novo com as camadas base |
| `bfrost config` | mostra ou muda cofre e modelo |

Configuração fica em `~/.brainfrostrc`. A variável `BRAINFROST_VAULT` ganha de tudo.
O texto de instrução que abre o prompt também é configurável, no campo `header`.

---

## Pilar 2 — Interface

```bash
cd brainfrost-ui
npm install
npm run vault     # mostra onde o build vai achar o cofre
npm run dev
```

O grafo ocupa a tela: nó cresce conforme recebe links, azul é camada `core`, verde-água é `growth`.
Passar o mouse apaga o que não é vizinho. Clicar abre o painel de leitura, com os WikiLinks
navegáveis e a lista de quem cita aquela camada. `Esc` fecha.

### Deploy na Vercel

1. Suba o repositório inteiro para o GitHub (a raiz, com o `.brainfrost` junto).
2. Na Vercel, importe o repositório e defina **Root Directory = `brainfrost-ui`**.
3. Em Settings → Build, mantenha ligada a opção **Include source files outside of the Root Directory**.
   É ela que faz o `../.brainfrost` existir na hora do build.
4. Deploy. A partir daí, todo `bfrost learn` reconstrói o grafo sozinho.

Se preferir não depender dessa opção, copie o cofre para dentro do app antes de buildar
(`cp -r ../.brainfrost ./content`) — o parser procura em `content/` também.

---

## Armadilhas já mapeadas

- O conteúdo é lido **no build**, não em tempo de execução. Editar o `.md` e não dar push significa
  grafo velho na Vercel. `npm run dev` recarrega a cada save.
- Next abaixo de `15.5.4` é barrado no build por CVE. Não baixe a versão.
- `react-force-graph-2d` toca em `window`: só entra por `dynamic(..., { ssr: false })`.
- Nunca coloque dado pessoal ou de cliente no cofre. O prompt inteiro vai para a IA, e o
  repositório pode virar público sem querer. Estrutura e regra, sim; CPF, chave e segredo, não.

---

## Próximos passos possíveis

- Modo conversa: `bfrost ask` mantendo histórico entre perguntas.
- Visão temporal no grafo: camadas recentes mais brilhantes, antigas opacas.
- `bfrost prune` para apontar camadas que ninguém cita há meses.
- Cofre compartilhado por equipe, com camadas públicas e privadas.
