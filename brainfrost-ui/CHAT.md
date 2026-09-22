# CHAT.md

Plano do chat na UI. Nada aqui é executado sem aprovação; este documento existe para
alinhar o alvo, os trade-offs e os riscos antes de escrever código.

---

## Contexto

Hoje o BrainFrost é bom pra **preparar** contexto (`bfrost ask` monta o prompt e você
cola) e pra **navegar** o cofre (site com grafo/dashboards). Falta o passo do meio: o
próprio site permitir **perguntar direto** — o cofre injeta contexto, a LLM responde,
tudo dentro da mesma janela.

O CLI já resolve isso pra quem está no terminal. A UI ainda não. Fechar esse loop
transforma o site de "explorador do cofre" em "assistente pessoal do cofre".

A pergunta que este documento resolve **não é** "vale a pena?" (vale). É **"como fazer
sem trair o design atual"**: sem servidor, sem login, sem gerenciar chave de outro.

---

## Restrições que o BrainFrost impõe

Estes são princípios já decididos em `CONTEXTO.md`; qualquer plano tem que caber neles.

1. **Sem servidor, sem login.** O site é estático na Vercel. Qualquer feature nova
   precisa ou continuar 100% no cliente, ou justificar bem a introdução de código
   server-side.
2. **Chave de API nunca fica no repo.** No CLI, chave vem do `${ENV_VAR}` em runtime.
   Na UI, o equivalente é: chave mora no browser do usuário (`localStorage`), nunca
   sobe pro repo, nunca vai pro backend do dono.
3. **O cofre pode virar público.** Portanto o mecanismo do chat também não pode
   depender de segredos comitados nem gerar tráfego "meu-usuario-específico" no repo.
4. **Neutralidade de provedor.** O CLI aceita presets + custom via `~/.brainfrostrc`.
   O chat na UI precisa oferecer a mesma flexibilidade: OpenRouter, OpenAI, Anthropic,
   Ollama local, LM Studio, o que o usuário quiser.

---

## A barreira real: CORS

O maior obstáculo técnico não é técnico do BrainFrost — é dos provedores. **Muitas APIs
de LLM bloqueiam chamadas direto do browser**, retornando erro de CORS. Isso é
intencional: elas querem que a chave viva num backend, não exposta em JavaScript.

### Matriz de acesso (compilada em 2026-09-21)

| Provedor           | Chamada direto do browser? | Observação                                                     |
| ------------------ | -------------------------- | -------------------------------------------------------------- |
| **OpenRouter**     | ✅ sim                     | Aceita `HTTP_REFERER` + `X-Title`; foi feito pra ser BYOK.     |
| **Ollama local**   | ✅ sim                     | Server local; CORS liberado se rodar com `OLLAMA_ORIGINS=*`.   |
| **LM Studio**      | ✅ sim                     | Idem — servidor local que o próprio usuário controla.          |
| **Groq**           | ✅ sim                     | Anunciou suporte a browser em 2024; requer headers específicos.|
| **OpenAI direto**  | ❌ não                     | CORS bloqueado. Só via proxy ou biblioteca server-side.        |
| **Anthropic direto** | ⚠️ possível              | Aceita header `anthropic-dangerous-direct-browser-access: true`, mas com aviso explícito. |
| **Compat OpenAI-genérica** | ⚠️ depende         | Ex.: qualquer LLM rodando localmente sob endpoint OpenAI.      |

O **OpenRouter** é o divisor de águas: aceita browser + revende praticamente qualquer
modelo (Claude, GPT, Gemini, Llama). Para 90% dos casos, `chave do OpenRouter` + `modelo
= "anthropic/claude-sonnet-4.5"` cobre.

---

## Arquitetura proposta — BYOK CORS-friendly (Caminho A)

Zero backend novo. Tudo no browser.

```
┌──────────────────────────────────────────────────────────┐
│ browser do usuário                                       │
│                                                          │
│  ┌────────────────┐   ┌──────────────────────────────┐  │
│  │ /chat (React)  │──▶│ chatClient(config, messages) │  │
│  └────────────────┘   └──────────────┬───────────────┘  │
│         ▲                            │                   │
│         │                            ▼                   │
│  ┌──────┴──────┐            ┌────────────────┐          │
│  │ Zustand     │            │ fetch(url, {   │          │
│  │ store       │            │   headers,     │──────────┼──▶ OpenRouter / Ollama /
│  │ (config +   │            │   body        │          │    LM Studio / Groq /
│  │  histórico) │            │ })            │          │    Anthropic-direto
│  └─────────────┘            └────────────────┘          │
│         │                                                │
│         ▼                                                │
│  localStorage                                           │
│  (chave + URL + modelo)                                │
└──────────────────────────────────────────────────────────┘
```

**Fluxo de chamada:**

1. Usuário abre `/chat`, escreve pergunta.
2. Store lê config do `localStorage` (URL, headers, modelo, tipo de API).
3. Primeira mensagem: `chatClient` monta `CONTEXTO + pergunta` (mesma lógica do
   `bfrost ask`). Próximas: só pergunta + histórico (mesma lógica do `--continue`).
4. `fetch` sai do browser direto pra API do provedor.
5. Resposta volta, é gravada no store (histórico), renderizada em Markdown.

**Nada disso passa por servidor do BrainFrost.** A Vercel só serve o HTML/JS estático.

---

## Componentes a construir

### 1. `lib/chat-client.ts`

Adaptador que traduz `messages[]` para o formato de cada API. Reusa a lógica do
`brainfrost-cli/src/providers.js` (formato openai / anthropic / ollama) mas escrito em
TS pro browser.

- `sendChat(config, messages)` retorna `{ text, raw }`.
- Detecta tipo pelo `config.api` (`openai` / `anthropic` / `ollama` / `openrouter`).
- Expande headers com valores do config; se header conter `${VAR}`, avisa que
  variável de ambiente não funciona no browser (só CLI).

### 2. `lib/chat-store.ts` (Zustand persist)

```ts
interface ChatConfig {
  label: string          // ex.: "OpenRouter Claude"
  api: "openai" | "anthropic" | "ollama" | "openrouter"
  url: string
  model: string
  apiKey: string         // vive só em localStorage
  headers?: Record<string,string>
}

interface ChatSession {
  id: string
  configLabel: string
  layers: string[] | null  // camadas usadas no contexto inicial
  startedAt: string
  messages: { role: "user"|"assistant", content: string }[]
}
```

- `configs: ChatConfig[]` — usuário pode salvar várias (ex.: OpenRouter, Ollama local).
- `activeConfigLabel: string`
- `sessions: ChatSession[]` — histórico persistido.
- Métodos: `saveConfig`, `deleteConfig`, `newSession`, `appendMessage`.

### 3. `app/chat/page.tsx` + `components/chat/*`

- Página `chat` na sidebar (novo item no `SidebarNav`).
- **Se nenhuma config salva**: mostra `EmptyState` com botão "conectar sua LLM" que
  abre modal de config.
- **Se tem config**: layout 2 áreas — histórico em cima (scroll), input embaixo (sticky).
- Botão "camadas do contexto" abre `CommandPalette`-style para escolher quais camadas
  entram na primeira mensagem (padrão: todas).
- Botão "nova conversa" limpa a sessão atual.
- Botão "trocar config" no header do chat.
- Mobile: input sticky ao rodapé com safe-area, histórico ocupa o resto.

### 4. `components/chat/ConfigDrawer.tsx`

Modal (Dialog do shadcn) com formulário de config:
- Preset dropdown ("OpenRouter", "OpenAI browser", "Anthropic browser", "Ollama local",
  "LM Studio", "Custom") — cada um preenche os campos.
- Campo `apiKey` com tipo `password` e botão "mostrar".
- **Aviso persistente** em vermelho: "sua chave vai ficar no `localStorage` deste
  navegador. Qualquer script que rode aqui pode lê-la. Não use este mecanismo em
  máquinas compartilhadas."
- Ao salvar: testa a config com uma chamada `messages: [{role:"user", content:"ping"}]`;
  só grava se a resposta chegar.

### 5. `/config` (existente) ganha uma seção "Chat na UI"

Lista as configs salvas (com chave mascarada), mostra qual está ativa, permite trocar.
`bfrost meta` **não** conhece essas configs — elas são estado do browser, não do CLI.
Boa prática documentada no README.

---

## Fluxo de mensagens

### Primeira mensagem
```
messages = [
  { role: "user", content: `<header padrão>\n## CONTEXTO\n\n<camadas>\n\n## PERGUNTA\n\n<pergunta>` }
]
```

### Seguintes
```
messages = [
  ...historico,          // inclui a primeira user+assistant
  { role: "user", content: pergunta_nova }  // sem CONTEXTO
]
```

Idêntico ao `bfrost ask --continue`. A economia de tokens é grande.

---

## Segurança

Riscos que o desenho reconhece:

- **XSS.** Se algum dia um `.md` do cofre injetar JavaScript renderizado no reader, um
  atacante lê o `localStorage` e vaza a chave. Mitigação: `react-markdown` já sanitiza
  por padrão; não adotar plugins que permitam HTML raw. Documentar no CONTEXTO.md.
- **Extensão maliciosa do browser.** Fora do nosso controle; aviso na tela de config
  explicita.
- **Máquina compartilhada.** `localStorage` persiste até limpar. Botão "esquecer
  chave" claro no `/config`.
- **Chave vazando em log de rede.** Requisição sai do browser com header `Authorization`
  ou `x-api-key` — só o provedor vê. Nenhum backend intermediário nosso.

Documentação que precisa aparecer:
- Aviso na tela de config (não ignorável).
- Bloco no README na seção "Segurança".

---

## Fases de execução

Cada fase entrega valor sozinha e pode ir num PR.

### Chat-1 — Fundação e config
- `lib/chat-store.ts` (Zustand persist).
- `lib/chat-client.ts` com adapters `openai`, `anthropic`, `ollama`, `openrouter`.
- `components/chat/ConfigDrawer.tsx` (modal de conectar LLM).
- Preset dropdown com 4-5 opções conhecidas.
- Teste de conectividade ao salvar.

**Critério:** conseguir salvar uma config OpenRouter e ver aparecer em `/config`
listada.

### Chat-2 — Chat one-shot
- `app/chat/page.tsx` com layout 2 áreas.
- Envia pergunta + CONTEXTO inteiro; renderiza resposta em Markdown.
- Sem histórico multiturno ainda — cada pergunta é standalone.

**Critério:** perguntar "resuma o padrão MERGE" e ver a resposta usando as camadas
`padroes_arquitetura` + `contexto_trabalho`.

### Chat-3 — Multiturno + seleção de camadas
- Histórico persistido no store.
- Botão "camadas do contexto" com multi-select (default: todas).
- Botão "nova conversa".

**Critério:** manter uma conversa de 4-5 mensagens sem re-enviar CONTEXTO; economia de
tokens visível.

### Chat-4 — Mobile e polimento
- Input sticky com safe-area em iOS.
- Ajustes de densidade em telefone.
- Empty state polido para "sem config".
- Erros amigáveis (CORS, chave inválida, modelo inexistente).

**Critério:** conversa de 3 mensagens funcionando bem num telefone real.

---

## Riscos e decisões abertas

1. **Anthropic direto no browser.** O header
   `anthropic-dangerous-direct-browser-access: true` funciona mas o nome já diz — é
   desencorajado pela Anthropic. Melhor recomendar OpenRouter e deixar como
   "avançado".
2. **Streaming.** Todas as APIs suportam SSE. Vale? Ganho de UX enorme, custo em
   código médio. Fica para Chat-3 ou depois.
3. **Rate limit e erros.** O usuário vai bater em 429 eventualmente. Precisamos de UI
   pra isso? Sim, mensagem clara com sugestão ("aguarde X segundos"). Baixo esforço.
4. **Custos.** O usuário paga do próprio bolso; nada da nossa parte. Mas mostrar um
   contador de tokens/custo estimado ajuda a decisão. Pós-MVP.
5. **Compartilhar conversa.** Alguém vai querer link pra conversa. Como o histórico
   vive só no browser, não é trivial. Pode virar exportação em Markdown.
6. **Import/export de configs.** Backup de configs entre browsers. Baixo esforço, alto
   valor. Pós-MVP.
7. **Multi-cofre / mudança de cofre.** Se o BrainFrost algum dia rodar contra outro
   cofre, o chat precisa saber. Fora de escopo agora.

---

## Fora de escopo (deliberado)

- Backend proxy — se aparecer necessidade real de Anthropic/OpenAI diretos, avaliamos
  numa Fase Chat-5 separada. Por enquanto OpenRouter cobre.
- Autenticação de usuários — o BrainFrost é single-user por design.
- Cofre compartilhado — outra decisão em aberto no `CONTEXTO.md`.
- Assistant tools / function calling — extensão futura, não muda o esqueleto.

---

## Alternativas consideradas

- **Backend proxy (Caminho B).** Rejeitado como primeiro passo — introduz backend,
  gestão de chave, risco de vazamento. Só volta se OpenRouter não bastar.
- **Servidor local (BrainFrost CLI expondo API).** O CLI rodando `bfrost serve` numa
  porta local, UI conectando nela. Tira o problema de CORS (o server local aceita) e
  reusa toda a lógica JS do CLI. Interessante, mas exige que o usuário rode o CLI em
  paralelo — regride a experiência de "abrir o site e conversar".
- **Client híbrido (browser + fallback proxy).** Detectar CORS-fail e fallback pro
  proxy da Vercel. Complexidade alta pra ganho marginal.

---

## Como fica o produto depois

Antes: CLI para preparar prompt + UI para explorar cofre.  
Depois: CLI mantido (poder), UI ganha chat (velocidade). Um dono conversa direto pelo
site enquanto lê as camadas ao lado, ou usa CLI quando quer output cru pra grep/pipe.
