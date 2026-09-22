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
.brainfrost/        o cofre — Markdown com WikiLinks + _meta.json da config. Fonte de verdade.
brainfrost-ui/      Next.js na Vercel, desenha o grafo e os dashboards.
brainfrost-cli/     o `bfrost` — Node sem dependência, injeta o cofre em qualquer IA.
```

Uso hoje é pessoal. Vira produto depois, então nada de decisão que só funcione para uma pessoa.

---

## Estado atual

Tudo abaixo foi escrito, verificado rodando e deployado em produção
(`brainfrost.vercel.app`):

- **CLI completo.** `ask`, `learn`, `inject`, `list`, `show`, `open`, `sync`, `init`, `config`,
  `providers`, `meta`, `prune`. `bfrost` está global via `npm link` e é usado no dia a dia.
  O `bfrost sync` regrava `.brainfrost/_meta.json` (snapshot da config vigente) e o
  `bfrost meta` faz isso sem side-effect no git. O `ask` aceita `--continue/--new/--history`
  para modo conversa (só provedores http — o histórico vive em
  `~/.brainfrost/conversation.json`, fora do cofre).
- **UI redesenhada em 6 fases** (plano completo em `brainfrost-ui/REDESIGN.md`). Todas
  aplicadas e deployadas:
  1. Fundação shadcn/ui sobre a paleta Frost em variáveis HSL.
  2. Shell global — sidebar `Grafo / Camadas / Cofre / Config` + header slim.
  3. Grafo controlável — slider de espaço, switch de rótulos, toggle "apagar camadas
     antigas" (decay linear entre 7 e 120 dias), recentralizar, `forceCollide`,
     preferências persistidas em `localStorage` via Zustand.
  4. Reader como `Sheet` com abas `Texto / Ligações / Fonte`, ação **copiar prompt** e
     link direto para o `.md` no GitHub.
  5. Dashboard `/cofre` — 6 stat cards, `BarChart` Recharts com conexões por camada,
     tabela ordenável com deep-link `?camada=<slug>` para a home.
  6. Dashboard `/config` — lê `.brainfrost/_meta.json`, mostra provedor ativo, grid de
     provedores (kind, env vars com badge presente/ausente), bloco "como mudar" com
     comandos copiáveis. A UI **nunca** escreve.
- **Cofre com 11 camadas, 24 conexões, zero órfão e zero link quebrado.**
- **Repositório em `github.com/caua-ferreira/brainfrost`** conectado à Vercel; push na
  `main` dispara deploy automático (o time é Hobby — o email do commit precisa bater
  com o dono).
- **Design encaixa com o `permafrost-platform`** (referência de rigor) mas mantém a
  identidade Frost em vez de virar mais um dashboard `slate`.

### O que falta

1. Usar o BrainFrost por alguns dias antes de mexer em feature nova — o design agora
   pede rodagem real, não novos botões.
2. Se aparecer atrito recorrente ao pedir contexto em outros repos, considerar o
   `bfrost inject` (grava um bloco de contexto no `CLAUDE.md` do repo-alvo).
3. Ligar a busca do header global à lista da home via Zustand (hoje a busca vive só
   dentro da home). Baixa prioridade.

---

## Como rodar

```bash
# CLI
cd brainfrost-cli && npm link             # habilita brainfrost e bfrost globalmente
bfrost list                               # mapa das camadas
bfrost ask "pergunta" --dry               # vê o prompt montado sem enviar
bfrost meta                               # regrava .brainfrost/_meta.json (o /config lê daqui)

# UI
cd brainfrost-ui && npm install
npm run vault                             # diagnóstico: mostra onde o build acha o cofre
npm run dev                               # http://localhost:3000
```

Depois de mudar provedor/modelo:

```bash
bfrost config --provider anthropic
bfrost meta && git add .brainfrost/_meta.json && git commit -m "❄️ meta" && git push
```

---

## Decisões que não se discute sem conversa

Cada uma custou raciocínio. Se for mudar alguma, diga explicitamente o que está contrariando e por quê.

- **Sem banco de dados.** O Git já dá histórico, sincronismo entre máquinas e gatilho de deploy.
  Um Postgres aqui só criaria credencial para manter e um segundo lugar para o contexto envelhecer.
  Isso foge de propósito do padrão dos outros apps do dono (Next + Supabase + Vercel).
- **Sem login, sem servidor.** O cofre é o repositório. Quem tem acesso ao repositório tem
  acesso ao cofre. As telas `/cofre` e `/config` também são só-leitura no cliente.
- **CLI neutro de provedor.** O prompt sai por três caminhos: `print` (imprime/copia), `cmd`
  (stdin de um comando local) e `http` (POST numa API). Snowflake Cortex é um preset entre dez,
  não o centro. Não reintroduza acoplamento com um provedor específico.
- **CLI sem dependência.** Só Node 18+. Isso faz o `npm link` ser instantâneo e funcionar atrás
  de proxy corporativo. Antes de adicionar um pacote, tente resolver com o que vem no Node.
- **Chave de API nunca no arquivo de config.** O `~/.brainfrostrc` guarda `${MINHA_CHAVE}` e o valor
  vem do ambiente na hora do uso. Se a variável não existir, o erro diz qual exportar. O
  `_meta.json` guarda o **nome** da env var e um boolean "presente no ambiente naquele
  momento" — nunca o valor.
- **Conteúdo lido no build, não em runtime.** `bfrost learn` faz push, a Vercel reconstrói,
  o grafo e os dashboards atualizam. Simples e sem servidor. O custo é que editar `.md`
  sem push deixa o site velho.
- **Nada de dado pessoal no cofre.** O prompt inteiro vai para a IA e o repositório pode virar
  público. Estrutura e regra, sim; CPF, chave e segredo, não. Já houve uma omissão deliberada:
  a chave Pix do app de vendas ficou de fora.
- **UI adota o rigor do `permafrost-platform`, mantém a paleta Frost.** shadcn/ui + Radix +
  lucide + Zustand + Recharts, mas as variáveis HSL apontam para
  `abyss/deep/rift/glow/aurora/arctic/mute`. Trocar por `slate` genérico é reverter identidade.
- **Voce nunca vai commitar como coautor.** O commit é sempre do dono do repositório. Se a IA
  sugerir algo, o dono decide se aceita e escreve o commit. Isso evita que a IA seja
  coautora de algo que não pode assinar.

---

## Armadilhas já verificadas

- `react-force-graph-2d` toca em `window`. Só entra por `dynamic(..., { ssr: false })` dentro de
  um componente cliente. Não tente renderizar no servidor.
- O force-graph **escreve `x`/`y` direto nos objetos que recebe**. Por isso o `GraphCanvas` copia
  `nodes` e `links` num `useMemo` antes de passar. Remover essa cópia quebra o React.
- No primeiro tick, o simulador ainda não posicionou os nós. `paintNode` e `paintPointerArea`
  precisam sair cedo se `x`/`y` não forem finitos — `createRadialGradient` explode com NaN
  e derruba a página inteira (`Application error` em produção).
- Datas formatadas na UI precisam de `timeZone: "UTC"` fixo. Sem isso, o server (iad1) e o
  cliente (fuso do leitor) podem cair em dias diferentes, o React 19 detecta hydration
  mismatch (erro `#418`) e a página crasha.
- Next abaixo de `15.5.4` é barrado no build da Vercel por CVE. Não baixe a versão.
- `outputFileTracingRoot` aponta para a raiz do repositório porque o cofre vive fora da pasta do app.
- O parser de cofre existe **duas vezes**: `brainfrost-cli/src/vault.js` e `brainfrost-ui/lib/vault.ts`.
  É proposital (o CLI não pode depender do build da UI), mas o `slugify` dos dois precisa continuar
  idêntico, senão um WikiLink resolve num lado e não no outro. Mexeu em um, espelhe no outro.
- A slug normaliza acento, maiúscula, `_` e `-`. `[[padroes_arquitetura]]` e `[[Padrões Arquitetura]]`
  caem no mesmo nó.
- O time Vercel é **Hobby** e bloqueia deploys via webhook quando o email do commit author não
  bate com o dono. `git config user.email caua.fer@gmail.com` (local no repo) resolve. Se ainda
  precisar disparar deploy com email divergente, use a API/dashboard/CLI da Vercel — o gate é só
  no webhook do git.
- **Windows apaga o bit executável** do `brainfrost-cli/bin/brainfrost.js` a cada edição. Em
  Linux/Mac isso quebra o `#!/usr/bin/env node` e o `npm link`. Antes de commitar edições nele,
  rode `git update-index --chmod=+x brainfrost-cli/bin/brainfrost.js`. Se já commitou errado,
  fix-up commit dedicado.
- Rotas que usam `useSearchParams` precisam de `<Suspense>` no Next 15 — é o caso da home
  (deep-link `?camada=`).

---

## Convenções

- **Português do Brasil** em tudo: código, comentário, mensagem de erro, commit, documentação.
- Comentário explica **por que**, não o que o código faz. Se o código precisa de comentário para
  dizer o que faz, reescreva o código.
- Mensagem de erro diz o próximo passo, não solta stack trace.
- Todo comando que escreve no disco diz o que escreveu e onde.
- Commits levam o floco: `❄️ ...`. Sem coautor.

### Visual

Tema Frost: água profunda, gelo e aurora. Tokens em `brainfrost-ui/tailwind.config.ts` e
variáveis HSL em `brainfrost-ui/app/globals.css` (que alimentam também o shadcn/ui).

- `abyss #050E1A` fundo · `deep #0A1A2F` superfície de card · `rift #16324F` hover/borda
- `glow #5AD8FF` camada `core` e primário shadcn · `aurora #9BFFE4` camada `growth` e acento ·
  `arctic #E9F6FF` texto principal · `mute #7E9BB8` texto secundário
- IBM Plex Sans e IBM Plex Mono. Mono é para dado e rótulo do grafo, não para texto corrido.
- O grafo é o herói e ocupa a tela na `/`. O brilho fica reservado aos nós — nada de card com
  sombra genérica competindo por atenção.
- Movimento só responde a ação de quem usa. Nada de animação de entrada em tudo.
- Componentes novos usam os tokens semânticos shadcn (`bg-primary`, `text-foreground`); código
  antigo continua usando as cores nomeadas (`bg-abyss`, `text-arctic`) até ser migrado.

---

## Como validar antes de dizer que terminou

```bash
cd brainfrost-ui && npm run build         # tem que passar limpo, 7 páginas static
cd .. && bfrost list                      # olhar órfãos e links quebrados
bfrost ask "teste" --dry --only index     # prompt monta sem erro
bfrost meta                               # _meta.json regrava sem erro
```

Rotas a olhar:
- `/` — grafo + reader panel
- `/cofre` — dashboard
- `/config` — snapshot do `_meta.json`
- `/camadas` — placeholder (Fase 4 do plano ainda não cobre esta rota; virou "lista de
  camadas com filtros"; se implementar, atualize o `REDESIGN.md`)

Se mexer no `learn` ou no `git.js`, teste num repositório descartável antes:
`mkdir /tmp/t && cd /tmp/t && git init && bfrost init`.

---

## Fila de ideias (não comece sem combinar)

Muita coisa que estava aqui virou realidade nos últimos dias — `bfrost inject`, modo conversa,
visão temporal, `bfrost prune`, tela `/camadas`, `⌘K` global. O que sobra na fila:

- **Interface mobile pensada de propósito.** Hoje o layout responde mas foi desenhado
  desktop-first; sidebar colapsa, grafo fica apertado. Precisa de plano próprio.
- **Cofre de equipe, com camada pública e privada.** Grande. Adiar até haver caso real.
- **Autocompletion de shell (bash/zsh)** para slugs, provedores e flags do CLI.
- **`bfrost search "termo"`** — grep semântico ou textual estruturado no cofre.
- **`bfrost inject --watch`** — regenera o CLAUDE.md do repo-alvo quando o cofre muda.
