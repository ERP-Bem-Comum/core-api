# W1 — GREEN — CTR-DOCS-UPDATE-FOR-ADR-0020

**Wave:** W1 (GREEN)
**Skill:** edição direta (prose)
**Data:** 2026-05-16
**Status:** ✅ COMPLETED — 11/11 CAs GREEN, todos os gates clean

## Gates

| Gate | Resultado |
| :--- | :--- |
| docs-update.test.ts | ✅ 11/11 GREEN |
| typecheck | ✅ exit 0 |
| lint | ✅ exit 0 (após `prefer-includes` fix em docs-update.test.ts) |
| format:check | ✅ |
| suite default | ✅ 444 tests / 433 pass / 0 fail / 11 skipped |
| suite integration | ✅ 57/57 (na 2ª execução; ver §"Tech debt herdado") |

## Arquivos editados

| Arquivo | Trechos editados |
| :--- | :--- |
| `CLAUDE.md` | Stack line (better-sqlite3 → mysql2); lista de ADRs críticos (ADR-0018 → ADR-0020); comandos pnpm/npm (CLI exemplos + db:generate); seção "Topologia de execução por driver" (2 colunas → 2 drivers `memory`/`mysql`); estrutura de pastas (sem `drivers/sqlite.ts`) |
| `handbook/architecture/06-persistence-strategy.md` | **Reescrita major**: banner ⚠️ no topo apontando ADR-0020, seções 1-10 todas atualizadas para MySQL único + adicionada §8 sobre SELECT-then-UPDATE-or-INSERT |
| `handbook/architecture/README.md` | Índice da seção 06: "Dual-dialect Drizzle..." → "MySQL 8.4 único..." |
| `.claude/skills/database-engineer/SKILL.md` | Tabela "Stack de persistência" — removeu linha Dual-dialect; atualizou linhas de drivers, migrations, mappers, repos, suite, topologia, tickets |
| `.claude/skills/application-cli-builder/SKILL.md` | Refs a "memory \| sqlite \| mysql" → "memory \| mysql"; `drivers/{memory,sqlite,mysql}.ts` → `drivers/{memory,mysql}.ts` |
| `.claude/skills/tdd-tutor/SKILL.md` | `contracts.cli.sqlite.test.ts` → `contracts.cli.mysql.test.ts` |
| `.claude/skills/tdd-strategist/SKILL.md` | idem + `drizzle-sqlite.test.ts` → `drizzle-mysql.test.ts` |
| `.claude/skills/database-tutor/SKILL.md` | "Dual-dialect..." → "MySQL único..."; schemas/migrations/mappers paths |
| `.claude/skills/ports-and-adapters/SKILL.md` | "Persistência dual-dialect" → "Persistência MySQL única" + menção a SELECT-then-UPDATE-or-INSERT |
| `.claude/skills/clean-code-theorist/SKILL.md` | Exemplo "DRY vs WET pragmático" expandido com contexto histórico (mappers SQLite+MySQL como evidência do raciocínio, removidos em #5) |
| `tests/cleanup/docs-update.test.ts` | regex `.test()` → `.includes()` para lint compliance |

**Total**: 1 CLAUDE.md + 2 arquivos handbook + 7 SKILLs + 1 test = 11 arquivos.

## Pattern aplicado

- **Distinção operacional × histórica**: refs como "use X" foram atualizadas; refs como "ADR-0018 baniu Y em 2026-05-14..." foram preservadas como evidência.
- **Banner ⚠️ em `06-persistence-strategy.md`**: explica que o conteúdo foi reescrito pós-ADR-0020, com link para git history se alguém precisar do raciocínio dual-dialect.
- **`clean-code-theorist`** ganhou nota explicando que a regra "DRY radical vs WET pragmático" continua válida; só o exemplo histórico precisou ser contextualizado.

## Tech debt herdado (não-regressão do #8)

**CA-3 do smoke test (#7) é flaky**: na 1ª execução de `pnpm test:integration` falhou com `Connection lost: The server closed the connection`. Na 2ª execução, 57/57 GREEN. Padrão observado já no ticket #7. Causa provável: race entre `before()` que aplica migration + 1ª invocação `criar-contrato` (primeira conexão ao pool MySQL após boot).

**Recomendação para follow-up**: adicionar `--health-cmd` no `compose up --wait` (ou um `SELECT 1` pré-aquecedor no `before()` do smoke). Não-bloqueante para este ticket — é tech debt do #7.

## Próximo passo

W2 — REVIEW. Self-review padrão. W3 já passou em paralelo.
