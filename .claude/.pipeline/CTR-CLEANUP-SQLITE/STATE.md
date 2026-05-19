# Estado do Ticket CTR-CLEANUP-SQLITE

> Cleanup completo do SQLite: delete dos artefatos, rename dos MySQL paralelos para canônicos, refactor dos call sites.
> Quinto ticket da sequência derivada de [ADR-0020](../../../../handbook/architecture/adr/0020-mysql-only-supersedes-dual-dialect.md).

| Wave | Status | Skill / Framework | REPORT |
| :--- | :--- | :--- | :--- |
| W0 — RED | ✅ completed | `pipeline-maestro` + `node:test` (assertions estruturais) | [002-tests/REPORT.md](./002-tests/REPORT.md) |
| W1 — GREEN | ✅ completed | `nodejs-fs-scripter` + `database-engineer` | [003-impl/REPORT.md](./003-impl/REPORT.md) |
| W2 — REVIEW | ✅ completed (APPROVED) | self-review (padrão herdado de #4) | [004-code-review/REVIEW.md](./004-code-review/REVIEW.md) |
| W3 — QUALITY | ✅ completed | `pnpm test` + `pnpm test:integration` + gates | [005-quality/REPORT.md](./005-quality/REPORT.md) |

## Status final

**Ticket pronto para commit.**

- Cleanup CAs: 18/18 GREEN.
- Suite default: 420 pass / 0 fail / 11 skipped.
- Suite integration: 47/47 pass.
- typecheck + lint + format: ✅.
- Delete: 14 arquivos SQLite removidos.
- Rename: 5 arquivos MySQL→canônicos + ~14 types/funções sem sufixo.
- Refactor: 5 call sites + 3 tests.
- Config: package.json, .npmrc, tsconfig.json, drizzle.config.ts limpos.

## Próximo ticket

**`CTR-DOCKERFILE-MYSQL` (#6)**: revisar Dockerfile (provavelmente tinha toolchain C++ para compilar `better-sqlite3` — pode sair).

## Notas

- **Delete-heavy ticket**: 14 arquivos DELETE + 6 RENAMES + refactor de 5 call sites.
- **money.mapper.ts é compartilhado** — mantém.
- **date.mapper.ts só servia SQLite** — DELETE.
- **`tests/cli/contracts.cli.sqlite.test.ts` (263 linhas)** será refatorado para `--driver memory` (preserva coverage CLI); renomeia para `contracts.cli.memory.test.ts`.
- Smoke MySQL real fica para `CTR-CLI-MYSQL-SMOKE` (#7).
- `.npmrc`: mantém `dedupe-peer-dependents`, remove `public-hoist-pattern[]=drizzle-orm` (só 1 peer ativo).
- `drizzle.mysql.config.ts` → `drizzle.config.ts`; script `db:generate:mysql` → `db:generate`.
