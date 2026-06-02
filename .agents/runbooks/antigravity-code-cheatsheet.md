# Antigravity CLI — cheatsheet local

Material que antes vivia no `CLAUDE.md` mas duplicava `handbook/reference/claude-code/`. Adaptado para o ecossistema do **Antigravity CLI** (`agy`) e movido para cá para não consumir contexto em toda sessão. Abrir **sob demanda** quando precisar.

---

## Auto memory (memória cross-sessão)

Vive em `~/.gemini/antigravity-cli/memory/`. O arquivo `MEMORY.md` (carregado no startup) mantém o contexto de longo prazo do projeto.

| Tipo             | Função                                        |
| ---------------- | --------------------------------------------- |
| `MEMORY.md`      | Índice (load integral no startup)             |
| `feedback_*.md`  | Correções/validações do usuário               |
| `project_*.md`   | Decisões em andamento, planejamento pausado   |
| `reference_*.md` | Ponteiros para documentações e links externos |
| `user_*.md`      | Perfil/preferências do desenvolvedor          |

Comandos: `/memory` abre a interface de memória.

---

## Context window & Session management

| Quando                               | Use                       |
| ------------------------------------ | ------------------------- |
| Mudou de tarefa não-relacionada      | `/clear`                  |
| Sessão grande mas precisa compactar  | `/compact`                |
| Quer alinhar decisões de design      | `/grill-me`               |
| Executar tarefas demoradas/autônomas | `/goal <condição>`        |
| Reverter file edits da sessão        | `/rewind`                 |
| Executar comandos em paralelo        | `agy --worktree <branch>` |

---

## Worktrees

| Cenário                         | Comando                           |
| ------------------------------- | --------------------------------- |
| Nova sessão em worktree isolado | `agy --worktree feature-x`        |
| Cleanup automático              | `agy` limpa se nada foi commitado |
| Compartilhar `.env`/`secrets/`  | `.worktreeinclude` no root        |

---

## Bug mitigations (sub-agent stops mid-task)

Sub-agents podem parar prematuramente com `stop_reason: null`.
**Mitigação aplicada:**

1. **`model: gemini-3.5-pro`** (ou Ultra) no `contratos-orchestrator`.
2. **`maxTurns`** configurado para evitar loops infinitos.
3. **`skills`** pré-carregadas para evitar overhead.
4. **Checklist obrigatório** embutido no orchestrator.
5. **`AfterAgent` hook** executa `subagent-stop-validate.sh` → detecta interrupções e valida se o `REPORT.md` e `STATE.md` foram gravados.

---

## Commands úteis no Antigravity CLI

| Comando                   | Quando usar                                              |
| ------------------------- | -------------------------------------------------------- |
| `/goal <condição>`        | Trabalho com fim verificável e execução detalhada        |
| `/clear`                  | Reset de contexto                                        |
| `/grill-me`               | Alinhamento interativo de design                         |
| `/agents`                 | Inspecionar painel de sub-agents ativos                  |
| `/statusline`             | Escolher itens exibidos na status bar                    |
| `/settings` ou `/config`  | Ajustar opções no Settings Editor Overlay                |
| `/keybindings`            | Personalizar atalhos de teclado                          |
| `agy inspect`             | Resumo de contexto do projeto e configurações carregadas |
| `agy --worktree <branch>` | Abrir sessão isolada                                     |
| `agy --sandbox=false`     | Configurar sandboxing de terminal                        |

---

## Best practices aplicadas ao projeto

| Prática                     | Como aplica                                                            |
| --------------------------- | ---------------------------------------------------------------------- |
| Sempre verificável          | W0 (RED) garante critério de saída; W3 (gates) garante "done" objetivo |
| Explore → plan → code       | `000-request.md` é o "plan" estruturado                                |
| Contexto específico         | Referência de arquivos explícita nos prompts                           |
| Manage context aggressively | `/clear` entre tickets                                                 |
| Verify, don't trust         | `pnpm test` + `typecheck` + `lint` antes de concluir                   |

**Antipadrões evitados por hooks locais** (`.agents/hooks.json`):

- `BeforeTool` com `block-npm.sh` — bloqueia comandos `npm *` para garantir uso do `pnpm` (ADR-0012).
- `BeforeTool` com `block-cross-project-docker.sh` — impede mexer no Docker legacy.
- `AfterTool` com `prettier-write.sh` — auto-formata arquivos editados/escritos com Prettier.
- `AfterAgent` com `stop-typecheck.sh` — executa typecheck de background no fim do turno.
