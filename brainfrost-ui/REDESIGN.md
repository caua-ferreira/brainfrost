# REDESIGN.md

Plano de redesign do `brainfrost-ui`. Nada aqui é executado sem aprovação; este
documento existe para alinhar o alvo antes de mexer no código.

---

## Contexto

Hoje o `brainfrost-ui` é uma tela só: grafo + lista + reader. Funciona, mas está
enxuto demais — sem sidebar, sem sistema de componentes, sem estados de
carregamento formais, sem tela de configuração. O `permafrost-platform` (mesmo
dono, mesmo ecossistema) já tem um padrão maduro de dashboard dark que serve de
referência. O objetivo é **subir o BrainFrost ao mesmo rigor**, sem perder a
identidade Frost e sem transformar o grafo em coadjuvante.

Referência: `github.com/caua-ferreira/permafrost-platform` (branch `master`).

---

## O que vem do permafrost-platform

Estas escolhas atacadas de lá deixaram o produto coerente e escalável. Adotar
tudo aqui:

- **shadcn/ui** (`components.json`, `baseColor: slate`, `cssVariables: true`) —
  primitivos de UI que compartilham a mesma linguagem de componente em todas as
  telas.
- **Radix UI** como base dos componentes complexos (Dialog, DropdownMenu,
  Select, Tooltip, Separator).
- **lucide-react** para ícones — substitui o `❄` de texto solto por um sistema
  consistente de glifos lineares.
- **Zustand + persist** para estado global (config de cofre, painel aberto,
  filtros do grafo).
- **TanStack Query** só se acabarmos consumindo alguma API futura; hoje o
  cofre é estático.
- **Padrões de UX**:
  - Skeleton (`animate-pulse`) em vez de spinner.
  - Erros como card destacado com CTA para `/settings`.
  - `EmptyState` (emoji ❄️ grande + título + descrição + ação) reutilizável.
  - Rotas em `app/` são server components thin — lógica vive em
    `components/<area>/*`.

---

## O que fica do BrainFrost

Esses pontos são identidade, não têm por que ser diluídos:

- **Paleta Frost** (`abyss/deep/rift/glow/aurora/arctic/mute`) — o
  `permafrost-platform` usa `slate` padrão, o que o deixa parecido com
  qualquer dashboard. A Frost é o que distingue.
- **Grafo como hero** — ocupa a área principal, ninguém compete com ele.
- **Reader panel** como side drawer sobre o grafo, não uma página nova.
- **IBM Plex Sans + Mono** — funcionam bem com a paleta e são únicas.
- **Português em tudo** — código, texto, erro, commit.

---

## Sistema de design proposto

### Tokens (adaptar `tailwind.config.ts` + `globals.css`)

Migrar para o modelo `cssVariables: true` do shadcn (variáveis em `:root`,
Tailwind usa `hsl(var(--...))`). Assim os componentes shadcn puxam a paleta
Frost sem hardcode.

```
--background: 210 76% 6%      /* abyss */
--surface:    213 65% 11%     /* deep */
--surface-2:  212 55% 20%     /* rift */
--primary:    195 100% 68%    /* glow */
--accent:     162 100% 80%    /* aurora */
--foreground: 205 100% 96%    /* arctic */
--muted:      207 30% 60%     /* mute */
--danger:     356 79% 65%     /* novo — vermelho gelado */
--warn:       36 92% 68%      /* novo — âmbar frio */
--border:     212 55% 20% / 0.5
```

O `slate` do permafrost-platform vira apenas fallback para componentes shadcn
que a gente não customize.

### Tipografia

Manter IBM Plex Sans (UI) e IBM Plex Mono (dado/rótulo do grafo, código).
Definir uma escala rígida:

| Uso                         | Tamanho | Peso | Família |
| --------------------------- | ------- | ---- | ------- |
| H1 página                   | 20/28   | 600  | Sans    |
| H2 seção                    | 15/22   | 600  | Sans    |
| Corpo padrão                | 14/22   | 400  | Sans    |
| Nav / label                 | 13/20   | 500  | Sans    |
| Meta / número               | 12/16   | 500  | Mono    |
| Micro (badges, footers)     | 11/14   | 500  | Mono    |

### Elevação e superfícies

- `abyss` — fundo global
- `deep` — sidebar, cards, drawer
- `rift` — hover, item selecionado, borda de superfície
- Sombra única, herdada do atual: `shadow-pane` para painéis flutuantes
- Bordas hairline (1px em `rift/40`) em vez de bordas cheias

---

## Estrutura de layout

O BrainFrost tem essencialmente três modos: **explorar o grafo**, **ler uma
camada**, **configurar/inspecionar o cofre**. Isso pede sidebar, sim, mas
enxuta.

```
┌─────────┬─────────────────────────────────────────┐
│  ❄ BF   │  Header (título/atalhos/busca)          │
│         ├─────────────────────────────────────────┤
│ ▨ Grafo │                                         │
│ ▤ Lista │           GRAFO (hero)                  │
│ ⓘ Cofre │                                         │
│ ⚙ Config│                                         │
│         │                                         │
│ status  │                                         │
└─────────┴─────────────────────────────────────────┘
       ↑ drawer do reader flutua sobre o grafo (como hoje)
```

Rotas propostas:

- `/` — grafo em tela cheia (hero). Reader como drawer.
- `/camadas` — lista tabelada (todas as notas, filtros de tag/camada, busca
  full-text). Serve pra quando o grafo não é o melhor caminho.
- `/cofre` — inspeção meta: contagem, órfãos, links quebrados, últimas
  atualizações. Análogo à tela **Cost** do permafrost.
- `/config` — o que o `~/.brainfrostrc` guarda, provedores, chave (mascarada),
  layer aliases. Não escreve nada por si — orienta o `bfrost config`.

---

## Componentes shadcn a instalar (mínimo viável)

`npx shadcn@latest add button badge card input tabs separator dialog dropdown-menu tooltip skeleton scroll-area`

Uso previsto:

- `Card` — cards do dashboard do cofre e do reader.
- `Badge` — tags, camada (core/growth), estado (órfão, quebrado).
- `Input` — busca no header, filtros na tela `/camadas`.
- `Tabs` — no reader: **Texto** / **Ligações** / **Backlinks**.
- `Dialog` — modal de aprendizado rápido, se implementarmos `bfrost learn` via
  UI (fase 5).
- `DropdownMenu` — ações do nó (abrir, copiar link, ver arquivo).
- `Tooltip` — nomes truncados no grafo, atalhos do teclado.
- `Skeleton` — quando o grafo estiver montando forças.
- `ScrollArea` — lista lateral e reader com scrollbar temada.

---

## Fases

Cada fase entrega valor por si. A fase 1 é bloqueadora para todas as outras.

### Fase 1 — Fundação (bloqueadora)

- `npx shadcn@latest init` com `baseColor: slate` (customizamos depois).
- Migrar `tailwind.config.ts` + `globals.css` para variáveis HSL Frost.
- Adicionar `lucide-react`, `class-variance-authority`, `clsx`,
  `tailwind-merge` (deps do shadcn) e `lib/utils.ts` (`cn`).
- Adicionar `zustand` para o store de UI (reader aberto, filtros do grafo).
- Adicionar `next-themes`? **Não** — o BrainFrost é dark-only por design.
- Critério de aceite: um `<Button variant="outline">Teste</Button>` renderiza
  com a paleta Frost e a home antiga continua funcionando.

### Fase 2 — Shell (sidebar + header)

- Criar `components/shell/Sidebar.tsx` (nav lateral 224px, ícones lucide,
  item ativo em `rift`, status do cofre no rodapé — nº de camadas + hora do
  último `bfrost learn`).
- Criar `components/shell/Header.tsx` (título, busca global, atalho `⌘K`
  pra abrir a busca em modal, breadcrumb quando fizer sentido).
- Envolver o `app/layout.tsx` com esse shell (fora da home tudo herda).
- Critério: `/` mostra o grafo com sidebar do lado; busca do header filtra a
  lista do reader panel via store Zustand.

### Fase 3 — Grafo repaginado

- Migrar o `GraphCanvas` para dentro de um `Card` bleed
  (`border-0 bg-abyss`) — a moldura some pra não competir com o desenho.
- Legenda flutuante com `Tooltip` explicando cor/tamanho/dim.
- Controles: toggle de rótulos (mostrar/ocultar), slider de repulsão, botão
  "recentralizar". Guardar preferência no Zustand persist.
- Estados: `Skeleton` enquanto o `size` do wrapper é 0; `EmptyState` quando
  o cofre está vazio.
- Critério: cofre com 11 camadas legível na primeira renderização, sem
  precisar dar zoom.

### Fase 4 — Reader panel repaginado

- Trocar o `<aside>` ad-hoc por `<Drawer>` (`vaul` — o shadcn recomenda) ou
  `<Sheet>` do shadcn. Preferência: `Sheet` (menos dependência).
- Abrir com `Tabs`: **Texto**, **Ligações** (aponta para + citada por),
  **Fonte** (`.md` cru, para copiar).
- Backlinks e links viram `Badge` clicáveis.
- Ações no header do painel: **copiar prompt** (o mesmo prompt que o
  `bfrost ask` monta) e **abrir no editor** (deep link `vscode://file/...`).
- Critério: fluxo de "clique no nó → leia → salte para camada citada" tem
  metade dos cliques atuais e nenhum estado perdido.

### Fase 5 — Tela `/cofre` (dashboard meta)

- Cards de topo: total de camadas, conexões, palavras, tokens estimados,
  órfãos, links quebrados. Cada card é um `Card` shadcn.
- Gráfico único (Recharts, `BarChart`): "conexões por camada", ordenado.
- Tabela: camadas ordenáveis por título/tags/atualização.
- Alertas: banner amarelo quando existem links quebrados.
- Critério: em 3 segundos de leitura dá pra saber a saúde do cofre.

### Fase 6 — Tela `/config` (opcional, discutir)

- Renderiza `~/.brainfrostrc` (só leitura), com **exemplos** de comando
  `bfrost config set ...` para cada campo.
- Lista de provedores (`bfrost providers`) com estado (env var presente ou
  ausente).
- **Não grava nada.** A UI é observadora — a fonte de verdade continua sendo
  o CLI + arquivo local.

---

## Riscos e decisões abertas

1. **Paleta:** manter Frost custom (proposta) ou adotar `slate` do
   permafrost-platform pra igualdade visual? Recomendação: **manter Frost**,
   diferencia o produto e não é maior esforço.
2. **Grafo:** o `react-force-graph-2d` é canvas puro e não tema com CSS
   variables — as cores vão continuar hardcoded no `GraphCanvas.tsx`. Aceitável.
3. **Sidebar em mobile:** virar drawer via `Sheet`; hoje o layout já colapsa
   pra vertical, precisaria ajuste. Fase 2 aborda.
4. **Ligar UI ao CLI real:** as telas `/cofre` e `/config` mostram dados que
   hoje só existem no runtime do CLI. Opções: (a) UI relê o cofre no build
   como já faz — não vê `~/.brainfrostrc`; (b) `bfrost sync` gera um
   `.brainfrost/_meta.json` que a UI consome; (c) UI expõe uma rota API que
   roda o CLI localmente (só em dev). Recomendação: **(b)**.
5. **Tela `/config`:** justifica o esforço? Talvez sirva mais como link para
   docs. Decidir antes da fase 6.

---

## Critérios de aceite globais

- `npm run build` passa limpo em todas as fases.
- `bfrost list` continua funcionando (o cofre não muda de shape).
- Nada de dado pessoal na UI (regra do CONTEXTO.md).
- Nenhum componente novo importa mais que ~3 dependências além do que já
  existir; se precisar, aparece no PR com justificativa.
- Cada fase entrega uma pull request separada e testável em preview.

---

## Fora de escopo (deliberado)

- Autenticação, multiusuário, edição pela UI.
- Sincronização de cofres entre repositórios (é o CLI que faz).
- Tema claro. O BrainFrost é dark.
- Mobile-first — dark dashboard denso em telefone é ruim; a gente cuida do
  responsivo o suficiente pra não quebrar, mas o alvo é desktop.
