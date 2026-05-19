# Estado do Ticket CTR-DB-DRIVER-MYSQL

> Wiring runtime do MySQL: pool mysql2 + drizzle-orm/mysql2 + migrator + repos + ativação do `--driver mysql` na CLI.
> Quarto ticket da sequência derivada de [ADR-0020](../../../../handbook/architecture/adr/0020-mysql-only-supersedes-dual-dialect.md).

| Wave | Status | Skill / Framework | REPORT |
| :--- | :--- | :--- | :--- |
| W0 — RED | ✅ completed | `pipeline-maestro` + `node:test` | [002-tests/REPORT.md](./002-tests/REPORT.md) |
| W1 — GREEN | ✅ completed | `database-engineer` + `ports-and-adapters` + `database-theorist` | [003-impl/REPORT.md](./003-impl/REPORT.md) |
| W2 — REVIEW | ✅ completed (APPROVED) | self-review (agent truncou output 2×) | [004-code-review/REVIEW.md](./004-code-review/REVIEW.md) |
| W3 — QUALITY | ✅ completed | `pnpm test:integration` + gates | [005-quality/REPORT.md](./005-quality/REPORT.md) |

## Status final

**Ticket pronto para commit.**

- 14/14 CAs GREEN no `pnpm test:integration` (47 tests / 47 pass / 0 fail em 3.8s).
- Suite default `pnpm test`: 436 pass / 0 fail / 11 skipped.
- Typecheck + lint + format:check: ✅ todos clean.
- 7 bugs reais descobertos e corrigidos no W1 (3 cópias do drizzle-orm, drift de mappers, backticks shell, `before` sem `after`, race entre suites, paralelismo, ODKU semantics).
- Decisão arquitetural SELECT-then-UPDATE-or-INSERT validada pelo `database-theorist`.

## Próximo ticket da sequência

**CTR-CLEANUP-SQLITE** (#5): deletar `schemas/sqlite.ts`, mappers/repos/driver SQLite. Renomear `.mapper.mysql.ts` → `.mapper.ts`, `repos/*.drizzle-mysql.ts` → `repos/*.drizzle.ts`. Atualizar CLAUDE.md, CLI help. Revisar `.npmrc` (hoist drizzle-orm deixa de ser necessário).

## Notas

- **Não invasivo**: SQLite adapters seguem vivos (deleção em CTR-CLEANUP-SQLITE #5).
- **`EventBus` continua in-memory**: outbox MySQL não é escopo aqui.
- **Migration roda no boot do driver**: `openMysql({ applyMigrations: true })`, idempotente via journal.
- **Mappers reutilizáveis** entre SQLite e MySQL (verificar drift no W1).
- **`mysql2@^3.11.0`** — versão LTS estável, traz `.d.ts` próprio, sem necessidade de `@types/*`.
