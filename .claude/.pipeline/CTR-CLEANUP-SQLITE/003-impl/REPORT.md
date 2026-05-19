# W1 — GREEN — CTR-CLEANUP-SQLITE

**Wave:** W1 (GREEN)
**Skill:** `nodejs-fs-scripter` (delete) + `database-engineer` (rename)
**Data:** 2026-05-16
**Status:** ✅ COMPLETED — 18/18 cleanup CAs GREEN, todos os gates clean

## Gates finais

| Gate | Resultado |
| :--- | :--- |
| `tests/cleanup/sqlite-removal.test.ts` | ✅ 18/18 GREEN |
| `pnpm run typecheck` | ✅ exit 0 |
| `pnpm run lint` | ✅ exit 0 |
| `pnpm run format:check` | ✅ "All matched files use Prettier code style!" |
| `pnpm test` | ✅ 431 tests / 420 pass / 0 fail / 11 skipped |
| `pnpm test:integration` | ✅ 47/47 pass em 4s |

## Operações realizadas

### DELETE (14 arquivos)

- `src/.../drivers/sqlite-driver.ts`
- `src/.../schemas/sqlite.ts`
- `src/.../mappers/{contract,amendment,period,date}.mapper.ts` (SQLite legados)
- `src/.../repos/{contract,amendment}-repository.drizzle.ts` (SQLite legados)
- `src/.../migrations/sqlite/` (pasta inteira: `0000_fearless_spyke.sql` + `meta/`)
- `src/.../cli/drivers/sqlite.ts`
- `drizzle.config.ts` (SQLite — substituído pelo rename)
- `tests/.../drizzle-sqlite.test.ts`
- `tests/cli/contracts.cli.sqlite.test.ts`
- `tests/cli/helpers/temp-db.ts`

### RENAME (5 arquivos + types/funções dentro)

| De | Para |
| :--- | :--- |
| `mappers/period.mapper.mysql.ts` | `mappers/period.mapper.ts` |
| `mappers/contract.mapper.mysql.ts` | `mappers/contract.mapper.ts` |
| `mappers/amendment.mapper.mysql.ts` | `mappers/amendment.mapper.ts` |
| `repos/contract-repository.drizzle-mysql.ts` | `repos/contract-repository.drizzle.ts` |
| `repos/amendment-repository.drizzle-mysql.ts` | `repos/amendment-repository.drizzle.ts` |
| `drizzle.mysql.config.ts` | `drizzle.config.ts` |

**Types/funções renomeados:**
- `ContractMapperMysqlError` → `ContractMapperError`
- `AmendmentMapperMysqlError` → `AmendmentMapperError`
- `PeriodMapperMysqlError` → `PeriodMapperError`
- `ContractRowMysql` → `ContractRow`
- `ContractInsertMysql` → `ContractInsert`
- `AmendmentRowMysql`, `AmendmentInsertMysql` → sem sufixo
- `PeriodColumnsMysql` → `PeriodColumns`
- `contractFromRowMysql`, `contractToInsertMysql` → sem sufixo
- `amendmentFromRowMysql`, `amendmentToInsertMysql` → sem sufixo
- `periodFromColumnsMysql`, `periodToColumnsMysql` → sem sufixo
- `createDrizzleMysqlContractRepository` → `createDrizzleContractRepository`
- `createDrizzleMysqlAmendmentRepository` → `createDrizzleAmendmentRepository`

### REFACTOR de call sites (5 arquivos)

- `src/.../cli/drivers/mysql.ts` — imports apontam pros nomes canônicos.
- `src/.../cli/context.ts` — `CliContextError` perde `SqliteDriverError`; switch perde caso `sqlite`.
- `src/.../cli/main.ts` — exit code table perde `sqlite-driver-*`; usage text atualizada.
- `src/.../cli/formatters/error.ts` — remove mensagens SQLite, atualiza mensagens de driver/flags.
- `src/.../cli/parse-driver-flags.ts` — `DriverKind` vira `'memory' | 'mysql'`; flags `--db`/`--in-memory` saem; entra `--connection-string`.

### REFACTOR de tests (3 arquivos)

- `tests/.../cli/parse-driver-flags.test.ts` — bloco `sqlite driver` removido; bloco `mysql driver` atualizado para `--connection-string`; novo bloco `drivers removidos` cobre `--driver sqlite` → `cli-driver-unknown`.
- `tests/regression/reports-2026-05-15.test.ts` — REGR #5 (SQLite leak) inteiro removido; REGR #6 troca `--driver sqlite --in-memory` por `--driver memory --no-state`.
- `tests/.../adapters/persistence/{mysql-driver,drizzle-mysql}.test.ts` — imports atualizados para repos/mappers canônicos.
- `tests/.../adapters/persistence/migrations/mysql.test.ts` — CA-1/CA-2 atualizados para `drizzle.config.ts` + `db:generate`.

### CONFIG

- `package.json`: deletado `better-sqlite3`, `@types/better-sqlite3`, `pnpm.onlyBuiltDependencies`. Script `db:generate:mysql` → `db:generate`; `db:generate:sqlite` deletado.
- `.npmrc`: deletado `public-hoist-pattern[]=drizzle-orm`. Mantido `dedupe-peer-dependents=true` como guardrail.
- `tsconfig.json`: `include` agora referencia só `drizzle.config.ts` (sem o legado).
- `pnpm install` removeu `@types/better-sqlite3`. `better-sqlite3` 12.10.0 ainda no `node_modules/.pnpm` (transitive cleanup leva 1 ciclo).

## Conteúdo do commit semântico sugerido

```
refactor(contracts): remove SQLite (cleanup pós-ADR-0020)

- delete 14 arquivos SQLite (driver, schema, mappers, repos, cli driver, migrations, tests)
- rename 5 arquivos MySQL paralelos para canônicos (sem sufixo .mysql./- mysql)
- refactor call sites: context, main, parse-driver-flags, formatters/error, cli driver mysql
- refactor tests: parse-driver-flags, regression #5/#6, integração imports
- config: package.json (drop better-sqlite3 + @types + onlyBuiltDependencies),
         .npmrc (drop public-hoist-pattern drizzle-orm),
         tsconfig.json (drop drizzle.config.ts legado include),
         drizzle.mysql.config.ts → drizzle.config.ts,
         db:generate:mysql → db:generate
- cleanup tests: 18/18 GREEN no `tests/cleanup/sqlite-removal.test.ts`
- gates: typecheck + lint + format ✅; pnpm test 420/0/11; pnpm test:integration 47/47

Pipeline: W0→W1
Closes ticket CTR-CLEANUP-SQLITE (#5 da sequência ADR-0020).
```
