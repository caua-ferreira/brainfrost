# CONTEXTO.md

Documento de handoff. Quem abre uma sessão nova de IA neste repositório lê isto primeiro.
Atualize aqui quando uma decisão mudar — não deixe a decisão só no histórico do chat.

---

## O que é

BrainFrost: segundo cérebro de contexto para IA. Mesma família do Permafrost
(framework Python de arquivamento, já publicado no PyPI). O conhecimento mora em Markdown
versionado no Git, o terminal injeta esse conhecimento em qualquer pergunta, e a web mostra
como tudo se conecta.

Três pilares num repositório só:

```
.brainfrost/        o cofre — Markdown com WikiLinks. Fonte de verdade.
brainfrost-ui/      Next.js na Vercel, desenha o grafo das conexões.
brainfrost-cli/     o `bfrost` — Node sem dependência, injeta o cofre em qualquer IA.
```

Uso hoje é pessoal. Vira produto depois, então nada de decisão que só funcione para uma pessoa.

---

## Estado atual

Tudo abaixo foi escrito e verificado rodando, não é plano:

- **CLI completo e testado.** `ask`, `learn`, `list`, `show`, `sync`, `init`, `config`, `providers`.
  O `learn` foi testado num repositório Git de verdade: gravou no topo do log, commitou com a
  mensagem `❄️ Novo aprendizado no BrainFrost: <título>` e resolveu os WikiLinks.
- **UI completa.** `next build` passa limpo, 4 páginas estáticas, tipos ok.
- **Cofre com 11 camadas, 24 conexões, zero órfão e zero link quebrado.**
- **Git inicializado** com o primeiro commit. Falta só o remote e o push.

### O que falta

1. Push para o GitHub.
2. Importar na Vercel: **Root Directory = `brainfrost-ui`** e manter ligada a opção
   *Include source files outside of the Root Directory*. É ela que faz o `../.brainfrost`
   existir na hora do build.
3. Primeiro teste visual do grafo com as 11 camadas. Ajustar forças, tamanho de nó e legibilidade
   do rótulo depois de ver na tela — isso não dá para acertar no escuro.
4. Rodar `npm link` no `brainfrost-cli` e usar de verdade por alguns dias antes de mexer em feature nova.

---

## Como rodar

```bash
# CLI
cd brainfrost-cli && npm link      # habilita os comandos globais brainfrost e bfrost
bfrost list                        # mapa das camadas
bfrost ask "pergunta" --dry        # vê o prompt montado sem enviar

# UI
cd brainfrost-ui && npm install
npm run vault                      # diagnóstico: mostra onde o build acha o cofre
npm run dev
```

---

## Decisões que não se discute sem conversa

Cada uma custou raciocínio. Se for mudar alguma, diga explicitamente o que está contrariando e por quê.

- **Sem banco de dados.** O Git já dá histórico, sincronismo entre máquinas e gatilho de deploy.
  Um Postgres aqui só criaria credencial para manter e um segundo lugar para o contexto envelhecer.
  Isso foge de propósito do padrão dos outros apps do dono (Next + Supabase + Vercel).
- **Sem login, sem servidor.** O cofre é o repositório. Quem tem acesso ao repositório tem acesso ao cofre.
- **CLI neutro de provedor.** O prompt sai por três caminhos: `print` (imprime/copia), `cmd`
  (stdin de um comando local) e `http` (POST numa API). Snowflake Cortex é um preset entre dez,
  não o centro. Não reintroduza acoplamento com um provedor específico.
- **CLI sem dependência.** Só Node 18+. Isso faz o `npm link` ser instantâneo e funcionar atrás
  de proxy corporativo. Antes de adicionar um pacote, tente resolver com o que vem no Node.
- **Chave de API nunca no arquivo de config.** O `~/.brainfrostrc` guarda `${MINHA_CHAVE}` e o valor
  vem do ambiente na hora do uso. Se a variável não existir, o erro diz qual exportar.
- **Conteúdo lido no build, não em runtime.** `bfrost learn` faz push, a Vercel reconstrói,
  o grafo atualiza. Simples e sem servidor. O custo é que editar `.md` sem push deixa o grafo velho.
- **Nada de dado pessoal no cofre.** O prompt inteiro vai para a IA e o repositório pode virar
  público. Estrutura e regra, sim; CPF, chave e segredo, não. Já houve uma omissão deliberada:
  a chave Pix do app de vendas ficou de fora.
- **Voce nunca vai commitar como coautor.** O commit do aprendizado é sempre do dono do repositório. Se a IA sugerir algo, o dono
  decide se aceita e escreve o commit. Isso evita que a IA seja coautora de algo que não pode
  assinar.
---

## Armadilhas já verificadas

- `react-force-graph-2d` toca em `window`. Só entra por `dynamic(..., { ssr: false })` dentro de
  um componente cliente. Não tente renderizar no servidor.
- O force-graph **escreve `x`/`y` direto nos objetos que recebe**. Por isso o `GraphCanvas` copia
  `nodes` e `links` num `useMemo` antes de passar. Remover essa cópia quebra o React.
- Next abaixo de `15.5.4` é barrado no build da Vercel por CVE. Não baixe a versão.
- `outputFileTracingRoot` aponta para a raiz do repositório porque o cofre vive fora da pasta do app.
- O parser de cofre existe **duas vezes**: `brainfrost-cli/src/vault.js` e `brainfrost-ui/lib/vault.ts`.
  É proposital (o CLI não pode depender do build da UI), mas o `slugify` dos dois precisa continuar
  idêntico, senão um WikiLink resolve num lado e não no outro. Mexeu em um, espelhe no outro.
- A slug normaliza acento, maiúscula, `_` e `-`. `[[padroes_arquitetura]]` e `[[Padrões Arquitetura]]`
  caem no mesmo nó.

---

## Convenções

- **Português do Brasil** em tudo: código, comentário, mensagem de erro, commit, documentação.
- Comentário explica **por que**, não o que o código faz. Se o código precisa de comentário para
  dizer o que faz, reescreva o código.
- Mensagem de erro diz o próximo passo, não solta stack trace.
- Todo comando que escreve no disco diz o que escreveu e onde.
- Commits de aprendizado levam o floco: `❄️ ...`.

### Visual

Tema Frost: água profunda, gelo e aurora. Tokens em `brainfrost-ui/tailwind.config.ts`.

- `abyss #050E1A` fundo · `deep #0A1A2F` · `rift #16324F` superfícies
- `glow #5AD8FF` camada `core` · `aurora #9BFFE4` camada `growth` · `arctic #E9F6FF` texto
- IBM Plex Sans e IBM Plex Mono. Mono é para dado e rótulo do grafo, não para texto corrido.
- O grafo é o herói e ocupa a tela. O brilho fica reservado aos nós — nada de card com sombra
  genérica competindo por atenção.
- Movimento só responde a ação de quem usa. Nada de animação de entrada em tudo.

---

## Como validar antes de dizer que terminou

```bash
cd brainfrost-ui && npx next build     # tem que passar limpo
cd .. && bfrost list                   # olhar órfãos e links quebrados
bfrost ask "teste" --dry --only index  # prompt monta sem erro
```

Se mexer no `learn` ou no `git.js`, teste num repositório descartável antes:
`mkdir /tmp/t && cd /tmp/t && git init && bfrost init`.

---

## Fila de ideias (não comece sem combinar)

- Modo conversa: `bfrost ask` mantendo histórico entre perguntas.
- Visão temporal no grafo: camada recente mais brilhante, antiga opaca.
- `bfrost prune` apontando camadas que ninguém cita há meses.
- Cofre de equipe, com camada pública e privada.
