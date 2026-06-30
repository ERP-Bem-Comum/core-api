# Claude Code — cheatsheet local

Material que antes vivia no `CLAUDE.md` mas duplicava `handbook/reference/claude-code/`. Movido para cá para não consumir contexto em toda sessão. Abrir **sob demanda** quando precisar.

---

## Auto memory (memória cross-sessão)

Vive em `~/.claude/projects/<project-hash>/memory/`. `MEMORY.md` (primeiras 200 linhas / 25 KB) é carregado no startup.

| Tipo | Função |
|---|---|
| `MEMORY.md` | Índice (load integral no startup) |
| `feedback_*.md` | Correções/validações do usuário |
| `project_*.md` | Decisões em andamento, planejamento pausado |
| `reference_*.md` | Ponteiros pra Linear/Grafana/Slack |
| `user_*.md` | Perfil/preferências |

Comandos: `/memory` abre o índice. Doc: [`handbook/reference/claude-code/memory.md`](../../handbook/reference/claude-code/memory.md).

---

## Context window management

Doc: [`handbook/reference/claude-code/context-window.md`](../../handbook/reference/claude-code/context-window.md).

| Quando | Use |
|---|---|
| Mudou de tarefa não-relacionada | `/clear` |
| Sessão grande mas precisa preservar | `/compact <hint>` |
| Refactor sensível e quer reverter | `--permission-mode plan` |
| Rollback de file edits da sessão | `/rewind` |
| Vai explorar muitos arquivos | `Agent(subagent_type=Explore)` |
| Duas tarefas em paralelo | `claude --worktree <branch>` |

---

## Worktrees

Doc: [`handbook/reference/claude-code/worktrees.md`](../../handbook/reference/claude-code/worktrees.md).

| Cenário | Comando |
|---|---|
| Nova sessão em worktree isolado | `claude --worktree feature-x` |
| Cleanup automático | Claude limpa se nada foi commitado |
| Compartilhar `.env`/`secrets/` | `.worktreeinclude` no root |

**Quando NÃO usar:** duas tarefas no mesmo arquivo. Para tickets W0→W3 do mesmo módulo, `/clear` entre eles basta.

---

## Checkpointing & rewind

Doc: [`handbook/reference/claude-code/checkpointing.md`](../../handbook/reference/claude-code/checkpointing.md). Checkpoints automáticos a cada `Read`, `Edit`, `Write`, `MultiEdit`. **Edits via `Bash` (`rm`, `mv`, `sed`) NÃO são rastreados** — use `git stash` antes de operações destrutivas no Bash.

| Cenário | O que fazer |
|---|---|
| Refactor sensível | `--permission-mode plan` |
| Sessão estragou | `/rewind` → checkpoint pré-erro |
| Ver diff desde X | `/rewind` (diff visual) |
| Reverter SÓ código | `/rewind code` |
| Reverter SÓ conversa | `/rewind chat` |

---

## Bug #47936 — sub-agent stops mid-task

Sub-agents stoppam mid-task em **14-30%** das execuções com `stop_reason: null`. Issues: [#47936](https://github.com/anthropics/claude-code/issues/47936), [#6594](https://github.com/anthropics/claude-code/issues/6594), [#6159](https://github.com/anthropics/claude-code/issues/6159), [#19077](https://github.com/anthropics/claude-code/issues/19077), [#33049](https://github.com/anthropics/claude-code/issues/33049). Plano completo: [`.claude/.planning/SUBAGENT-INTERRUPTION-FIX.md`](../.planning/SUBAGENT-INTERRUPTION-FIX.md).

**Mitigação aplicada (5 camadas):**

1. **`model: opus` + `effort: high`** no `contratos-orchestrator`.
2. **`maxTurns` no frontmatter** de todos os 10 agents (orchestrator 100, peritos 60, pnpm haiku 30).
3. **`skills` no frontmatter** pre-carrega skills relevantes (reduz round-trips de `Skill()`).
4. **Checklist obrigatório embutido** no markdown do orchestrator — gate → REPORT → STATE → auto-verificação. Antipadrão: "nunca termine com tool_use; sempre com texto resumo".
5. **`SubagentStop` hook** chama `subagent-stop-validate.sh` → detecta `stop_reason: null` + REPORT ausente + STATE não atualizado, loga em `.claude/.last-subagent-stop.log`.

**Padrão "fallback admin":** quando sub-agent retorna dados em texto sem escrever REPORT/STATE, o main session escreve a partir dos dados.

---

## Commands úteis

Doc completa: [`handbook/reference/claude-code/`](../../handbook/reference/claude-code/).

| Comando | Quando usar |
|---|---|
| `/goal <condição>` | Trabalho com fim verificável |
| `/loop [interval] <prompt>` | Tarefa recorrente |
| `/rewind` | Voltar código OU conversa |
| `/clear` | Reset contexto |
| `/compact <hint>` | Comprimir preservando crítico |
| `/agents` | Inspecionar sub-agents |
| `/memory` | Editar memória cross-sessão |
| `/schedule <cron>` | Routine agendada (preview) |
| `claude --worktree <branch>` | Sessão isolada |
| `claude --permission-mode plan` | Plan mode antes de refactor |

---

## Agent teams (experimental)

Doc: [`handbook/reference/claude-code/agent-teams.md`](../../handbook/reference/claude-code/agent-teams.md). Ativação: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`. **Não testado neste projeto** (ADR pendente).

Quando faria sentido testar: tarefas onde W0/W1/W2 **não dependem sequencialmente** (research multi-ângulo, debugging com hipóteses concorrentes, cross-layer). Para W0→W1→W2→W3 fail-first tradicional, série continua melhor.

---

## Truques pouco usados (alto valor)

Features documentadas mas frequentemente esquecidas. Cada uma economiza contexto, evita um restart ou abre paralelismo.

### `/btw` — pergunta lateral sem poluir histórico

Pergunta com **visibilidade total** da conversa atual, mas **zero tools** e **sem entrar no histórico**. Resposta vai pra overlay descartável. Útil pra "qual era o nome daquele arquivo?", "o que decidimos sobre Money?" sem queimar turn. Doc: [`interactive-mode.md`](../../handbook/reference/claude-code/interactive-mode.md#side-questions-with-btw).

### `/recap` — resumo sob demanda, fora do histórico

Igual ao auto-recap (após 3 min ausente + 3 turnos), mas você dispara. Sai como command output, **não entra na conversa**. Bom pra retomar contexto sem `/compact`.

### `!` prefix — shell mode com grounding

`! git status` ou `! pnpm test -- contracts` roda no shell **fora do Claude**, mas comando + output entram no histórico como contexto. Diferente de pedir "rode X" (que gasta turn de tool_use). Tab autocompleta a partir do histórico de `!` no projeto.

### `claude --from-pr <N>` — retomar contexto de PR

Quando você criou PR via `gh pr create` dentro do Claude, a sessão fica linkada ao PR. Depois:

```bash
claude --from-pr 123
```

Ou cola URL do PR no `/resume` picker. Resume direto.

### `claude -n <nome>` ou `/rename <nome>` — sessão nomeada

```bash
claude -n CTR-OUTBOX-WAVE-1
# depois:
claude --resume CTR-OUTBOX-WAVE-1
```

Aceitar plan em plan mode também nomeia a sessão automaticamente a partir do título do plano.

### `claude --worktree "#1234"` — worktree direto de PR

Cria worktree em `.claude/worktrees/pr-1234/` puxando `pull/1234/head` do `origin`. Não precisa `gh pr checkout` antes.

```bash
claude --worktree "#1234"
```

`.worktreeinclude` (na raiz do projeto) copia automaticamente `.env`, `secrets/*.txt` etc.

### `Esc + Esc` em input vazio → "Summarize from/up to here"

Mais cirúrgico que `/compact`. Menu de checkpoints com 5 ações:

- **Restore code + conversation** — reverte tudo
- **Restore conversation** — mantém código, reverte conversa
- **Restore code** — mantém conversa, reverte código
- **Summarize from here** — comprime daqui em diante, mantém prólogo intacto
- **Summarize up to here** — comprime prólogo, mantém parte recente intacta

"Summarize up to here" é o substituto ideal de `/compact` quando o setup inicial ficou longo mas o trabalho recente é o que importa.

### `/fast` — Opus 2.5x mais rápido (preço maior)

Toggle de fast mode em Opus 4.6/4.7. Doc: [`fast-mode.md`](../../handbook/reference/claude-code/fast-mode.md). $30/$150 por MTok (vs Opus padrão), via usage credits. Não inclusos no plano. Útil em sessões de iteração rápida; **NÃO** para CI/long-running. Para Team/Enterprise o admin precisa habilitar.

### `claude --agent contratos-orchestrator` — sessão como agente

A sessão inteira roda com o system prompt + tools + modelo do orchestrator (substitui o system prompt default do Claude Code). Útil quando 100% do trabalho passa pelo roteador. Para fixar permanentemente, em `.claude/settings.json`:

```json
{ "agent": "contratos-orchestrator" }
```

### `/context` e `/memory` — diagnóstico ao vivo

- `/context` mostra breakdown atual por categoria (system, CLAUDE.md, skills, file reads, conversation) com sugestões de redução.
- `/memory` lista quais `CLAUDE.md` / `MEMORY.md` carregaram no startup.

Use antes de decidir entre `/clear` e `/compact` — decisão com dado, não no achismo.

---

## Cache invalidation — o que dói no bolso (e em latência)

**Invalidam o prefix cache** (próximo turn lento + caro):

- Trocar modelo mid-session (`/model`, `opusplan` em plan mode também)
- MCP server conectar/desconectar (acontece sem você notar)
- Adicionar deny rule de tool inteiro mid-session (ex: `Bash`, `WebFetch`); `Bash(rm *)` NÃO invalida
- `/compact`
- Upgrade do Claude Code
- Resume após upgrade (reprocessa histórico inteiro)

**Não invalidam:**

- Editar arquivos do repo
- Editar `CLAUDE.md` mid-session (mas só aplica após `/clear` ou restart)
- Trocar permission mode
- Mudar effort level
- Invocar skills/commands
- `/recap`, `/rewind` (rewind para turn já cacheado)
- Spawn de subagent (cache do parent fica intacto)

Estratégia: escolha modelo + MCP no início; use `/compact` em pontos naturais entre tarefas.

---

## Best practices aplicadas ao projeto

Resumo do [`best-practices.md`](../../handbook/reference/claude-code/best-practices.md) mapeado para o fluxo W0→W3:

| Prática | Como aplica |
|---|---|
| Sempre verificável | W0 (RED) garante critério de saída; W3 (gates) garante "done" objetivo |
| Explore → plan → code | `--permission-mode plan` antes de W1 sensível; `000-request.md` é o "plan" |
| Contexto específico | `@path/file.ts` em prompts |
| Manage context aggressively | `/clear` entre tickets, `/compact` em sessões > 100 KB |
| Subagents para exploração pesada | `Agent(subagent_type=Explore)` para ≥ 5 arquivos |
| Verify, don't trust | `pnpm test` + `typecheck` + `lint` antes de done |

**Antipadrões evitados por hook automático** (`.claude/settings.json`):

- `PreToolUse(Bash) → block-npm.sh` — `npm *` → deny com explicação.
- `PostToolUse(Edit|Write) → prettier-write.sh` — formato em cada arquivo tocado.
- `Stop → stop-typecheck.sh` (async) — typecheck em background no fim da sessão.
