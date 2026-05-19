# Estado do Ticket CTR-DB-MIGRATION-MYSQL

> Migration MySQL via drizzle-kit + aplicação real contra MySQL do compose.
> Terceiro ticket da sequência derivada de [ADR-0020](../../../../handbook/architecture/adr/0020-mysql-only-supersedes-dual-dialect.md).

| Wave | Status | Skill / Framework | REPORT |
| :--- | :--- | :--- | :--- |
| W0 — RED | ✅ completed | `node:test` + `child_process` (docker exec) | [002-tests/REPORT.md](./002-tests/REPORT.md) |
| W1 — GREEN | ✅ completed | `database-engineer` + `drizzle-kit` | [003-impl/REPORT.md](./003-impl/REPORT.md) |
| W2 — REVIEW | ✅ completed (APPROVED) | [`code-reviewer`](../../skills/code-reviewer/SKILL.md) | [004-code-review/REVIEW.md](./004-code-review/REVIEW.md) |
| W3 — QUALITY | ✅ completed | `pnpm test:integration` + gates | [005-quality/REPORT.md](./005-quality/REPORT.md) |

## Status final

**Ticket pronto para commit.**

- 14/14 CAs GREEN no `pnpm test:integration` (9 estruturais + 5 funcionais E2E).
- 431/431 pass no `pnpm test` default (5 CAs funcionais skipam via opt-in `MYSQL_INTEGRATION=1`).
- Typecheck + lint + format:check: ✅ todos clean.
- 3 bugs reais descobertos e corrigidos no W3 (mysql CLI socket, `--> statement-breakpoint`, FK > 64 chars).
- S-1 do W2 review resolvida via `MYSQL_INTEGRATION=1` opt-in.

## Próximo ticket da sequência

**CTR-DB-DRIVER-MYSQL** (#4): wirar `mysql2` + `drizzle-orm/mysql2/migrator`, resolver F-C1 (driver runtime) e F-C2 (connection pooling). A migration entregue aqui (`0000_superb_inhumans.sql`) é o contrato canônico que o migrator vai consumir.

## Notas

- Convivência temporária: `drizzle.config.ts` (SQLite) intocado; novo `drizzle.mysql.config.ts` paralelo. Unificação em `CTR-CLEANUP-SQLITE` (#5).
- CA-10..14 (funcionais) **absorvem a Suggestion #1 do W2 do ticket #2** — validamos CHECKs em runtime, não só estrutura.
- Sem dep nova (`drizzle-kit@^0.31.10` já no `package.json`).
- ADR-0020 está `Accepted` — pode prosseguir.
