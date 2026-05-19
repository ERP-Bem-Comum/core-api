# Ticket CTR-CLEANUP-SQLITE

> **Sequência:** 5º ticket da derivação de [ADR-0020](../../../handbook/architecture/adr/0020-mysql-only-supersedes-dual-dialect.md).
> Antecessores: `CTR-DB-COMPOSE-MYSQL` (#1), `CTR-DB-SCHEMA-MYSQL-CTR-PREFIX` (#2), `CTR-DB-MIGRATION-MYSQL` (#3), `CTR-DB-DRIVER-MYSQL` (#4).
> Sucessores: `CTR-DOCKERFILE-MYSQL` (#6), `CTR-CLI-MYSQL-SMOKE` (#7), `CTR-DOCS-UPDATE-FOR-ADR-0020` (#8).

---

## Objetivo

Remover **todos** os vestígios do SQLite do código de produção e dos tests. ADR-0020 já decidiu MySQL como dialeto único; este ticket executa a limpeza.

**O que entra:**

1. **DELETE** dos artefatos SQLite (driver, schema, mappers, repos, CLI driver, migrations, tests, helper de tmp file).
2. **RENAME** dos artefatos MySQL paralelos para o nome canônico (sem sufixo `.mysql.` ou `-mysql`).
3. **REFACTOR** dos call sites afetados (`CliContext`, `parseDriverFlags`, exit codes, mensagens PT-BR).
4. **REFACTOR** do test `tests/cli/contracts.cli.sqlite.test.ts` para usar `--driver memory` (preservar coverage da CLI; smoke MySQL fica para #7).
5. **CLEANUP** de config (`package.json`, `.npmrc`, `tsconfig.json`).

**O que NÃO entra:**

- Smoke E2E real com `--driver mysql` na CLI — fica em #7.
- Atualização de SKILLs e CLAUDE.md exaustiva — fica em #8.
- Dockerfile sem toolchain C++ — fica em #6.

---

## Princípio condutor

> **Apagar é mais arriscado que adicionar.** Antes de cada DELETE, garantir que (a) o artefato MySQL equivalente está no lugar, (b) todos os call sites foram refatorados, (c) os tests que dependiam dele foram atualizados ou removidos.

A defesa contra regressão é a suíte completa (`pnpm test` + `pnpm test:integration`), que precisa continuar GREEN no fim do ticket.

---

## Decisões

### D1 — `money.mapper.ts` é COMPARTILHADO; mantém

Os mappers `money.mapper.ts` é dialect-agnostic (input `number`, output `Money` via smart constructor). Já é usado por ambos SQLite e MySQL. **Mantém intacto.**

### D2 — `date.mapper.ts` SAI

Era usado apenas pelos mappers SQLite (`amendment.mapper.ts`, `period.mapper.ts`, `contract.mapper.ts`). MySQL trabalha com `Date` direto (sem epoch-ms conversion). **Delete.**

### D3 — Estratégia de rename: 1 commit por par delete+rename, ou commit único?

Commit único no final. O ticket faz waves W0..W3 internas; o commit final consolida tudo. Rename via `mv` shell (não há `.git/` no repo path? — verificar; se houver, usar `git mv`).

### D4 — `drizzle.mysql.config.ts` → `drizzle.config.ts`

O `drizzle.config.ts` legado (SQLite) sai. O `drizzle.mysql.config.ts` vira o canônico, sem sufixo. Atualizar `tsconfig.json#include`.

### D5 — Script pnpm: `db:generate:mysql` → `db:generate`

Sufixo `:mysql` deixa de fazer sentido (só há 1 dialeto). Sem perda de informação — o `drizzle.config.ts` ainda declara `dialect: 'mysql'` internamente.

### D6 — `tests/cli/contracts.cli.sqlite.test.ts` é refatorado para `--driver memory`

O arquivo tem 263 linhas com tests E2E reais da CLI. Refatorar para `--driver memory` em vez de `--driver sqlite` preserva 100% do coverage de CLI sem depender de Docker. Renomear arquivo para `contracts.cli.memory.test.ts`.

Smoke E2E real com MySQL fica em #7 (`CTR-CLI-MYSQL-SMOKE`).

### D7 — `tests/cli/helpers/temp-db.ts` SAI

Helper criado especificamente para alocar arquivo SQLite temporário. Sem uso após D6.

### D8 — `parse-driver-flags.ts` perde a variante `sqlite`

`DriverKind` vira `'memory' | 'mysql'`. Flags `--db <path>` e `--in-memory` saem (eram exclusivas do SQLite). O `--driver memory` continua aceitando `--state <path>` e `--no-state`.

### D9 — `.npmrc` mantém `dedupe-peer-dependents=true`, REMOVE `public-hoist-pattern[]=drizzle-orm`

Sem `better-sqlite3` como peer, só sobra `mysql2`. O drizzle-orm volta a ter 1 só cópia naturalmente. O `dedupe-peer-dependents` continua útil como guardrail genérico.

### D10 — `package.json` perde deps SQLite

Sai: `better-sqlite3`, `@types/better-sqlite3` (devDep), entry `pnpm.onlyBuiltDependencies` (era só para `better-sqlite3`), script `db:generate:sqlite`.

### D11 — Renames preservam imports relativos

Como os arquivos MySQL paralelos passam de `*.mysql.ts` para `*.ts`, todos os imports em testes e CLI são atualizados. Auditar exhaustivamente no W2.

### D12 — Types renomeados

- `ContractMapperMysqlError` → `ContractMapperError`
- `AmendmentMapperMysqlError` → `AmendmentMapperError`
- `PeriodMapperMysqlError` → `PeriodMapperError`
- `ContractRowMysql` → `ContractRow`
- `ContractInsertMysql` → `ContractInsert`
- `AmendmentRowMysql`, `AmendmentInsertMysql` idem
- `PeriodColumnsMysql` → `PeriodColumns`
- Funções: `contractFromRowMysql` → `contractFromRow`, etc.
- Repos: `createDrizzleMysqlContractRepository` → `createDrizzleContractRepository`
- Repos: `createDrizzleMysqlAmendmentRepository` → `createDrizzleAmendmentRepository`

---

## Critérios de Aceitação (18 CAs)

### Estruturais — DELETE (8 CAs)

- **CA-1**: `src/modules/contracts/adapters/persistence/drivers/sqlite-driver.ts` NÃO existe.
- **CA-2**: `src/modules/contracts/adapters/persistence/schemas/sqlite.ts` NÃO existe.
- **CA-3**: `src/modules/contracts/adapters/persistence/migrations/sqlite/` (pasta inteira) NÃO existe.
- **CA-4**: `src/modules/contracts/cli/drivers/sqlite.ts` NÃO existe.
- **CA-5**: `tests/modules/contracts/adapters/persistence/drizzle-sqlite.test.ts` NÃO existe.
- **CA-6**: `tests/cli/contracts.cli.sqlite.test.ts` NÃO existe (renomeado para `contracts.cli.memory.test.ts`).
- **CA-7**: `tests/cli/helpers/temp-db.ts` NÃO existe.
- **CA-8**: `drizzle.config.ts` legado NÃO existe (substituído pelo `drizzle.config.ts` que era o `drizzle.mysql.config.ts`).

### Estruturais — RENAME (5 CAs)

- **CA-9**: `mappers/contract.mapper.ts` existe e exporta `contractFromRow`, `contractToInsert`, `ContractRow`, `ContractInsert`, `ContractMapperError` (era o `.mapper.mysql.ts`).
- **CA-10**: `mappers/amendment.mapper.ts` existe e exporta `amendmentFromRow`, `amendmentToInsert`, `AmendmentRow`, `AmendmentInsert`, `AmendmentMapperError`.
- **CA-11**: `mappers/period.mapper.ts` existe e exporta `periodFromColumns`, `periodToColumns`, `PeriodColumns`, `PeriodKindRaw`, `PeriodMapperError`.
- **CA-12**: `repos/contract-repository.drizzle.ts` existe e exporta `createDrizzleContractRepository(handle: MysqlHandle): ContractRepository`.
- **CA-13**: `repos/amendment-repository.drizzle.ts` existe e exporta `createDrizzleAmendmentRepository(handle: MysqlHandle): AmendmentRepository`.

### Funcionais — CLI/Config (5 CAs)

- **CA-14**: `parseDriverFlags` aceita apenas `memory | mysql`. `--driver sqlite` retorna `cli-driver-unknown` (ou variante semelhante).
- **CA-15**: `package.json#dependencies` NÃO contém `better-sqlite3`; `package.json#devDependencies` NÃO contém `@types/better-sqlite3`.
- **CA-16**: `package.json#scripts.db:generate` existe e aponta para `drizzle.config.ts` (sem sufixo `:mysql`); `db:generate:sqlite` NÃO existe.
- **CA-17**: `.npmrc` mantém `dedupe-peer-dependents=true`, REMOVE `public-hoist-pattern[]=drizzle-orm`.
- **CA-18**: nenhuma string `better-sqlite3`, `SqliteHandle`, `SqliteDriverError`, `sqlite-driver-*` em `src/**/*.ts` (grep -r retorna vazio).

---

## Quality gates (intersectados com os CAs)

- `pnpm run typecheck` ✅
- `pnpm run lint` ✅
- `pnpm run format:check` ✅
- `pnpm test` (suite default offline): 0 fail. Total esperado: ~447 - 24 (testes SQLite removidos) - 16 (drizzle-sqlite removido) = ~407 testes.
- `pnpm test:integration`: 47/47 GREEN (sem regressão na suite MySQL).

---

## Cobertura ↔ camadas

| Camada | CAs |
| :--- | :--- |
| Adapters/persistence (delete) | CA-1, CA-2, CA-3 |
| Adapters/persistence (rename) | CA-9, CA-10, CA-11, CA-12, CA-13 |
| CLI (delete) | CA-4 |
| CLI (refactor) | CA-14 |
| Tests | CA-5, CA-6, CA-7 |
| Config | CA-8, CA-15, CA-16, CA-17 |
| Audit exhaustivo | CA-18 |

---

## Riscos & mitigações

- **R1: Quebrar a suíte contratual reusável** (`runContractRepositoryContract`, `runAmendmentRepositoryContract`). Mitigação: a suíte só consome `ContractRepository`/`AmendmentRepository` (ports) — agnóstica ao driver. Após rename, continua consumindo. Validar no W3 pelo `pnpm test:integration`.
- **R2: Tests de regressão (`reports-2026-05-15.test.ts`) usam SQLite**. Mitigação: refatorar para `--driver memory` ou conferir se já não dependem do SQLite especificamente.
- **R3: `tsconfig.json` deixa de incluir `drizzle.config.ts` legado e passa a incluir o renomeado**. Mitigação: atualizar include no mesmo commit.
- **R4: Imports relativos em arquivos renomeados quebram**. Mitigação: cobertura pelo `tsc --noEmit` no W3.
- **R5: Remover `better-sqlite3` da deps mas algum lugar ainda importa**. Mitigação: CA-18 (grep exhaustivo) + `pnpm install` faz catch.
- **R6: `pnpm.onlyBuiltDependencies: ["better-sqlite3"]`** — sair antes do `pnpm install` final.

---

## Plano de Waves

| Wave | Skill / Foco | Output |
| :--- | :--- | :--- |
| **W0 RED** | `pipeline-maestro` + assertions estruturais | Testes que verificam o estado pós-cleanup (existência/ausência de arquivos, conteúdo de package.json). Começam RED (arquivos SQLite ainda existem). |
| **W1 GREEN** | `nodejs-fs-scripter` (delete) + `database-engineer` (rename) | DELETE dos arquivos SQLite + RENAME dos MySQL + refactor dos call sites. Tests do W0 ficam GREEN. |
| **W2 REVIEW** | `code-reviewer` | Audit: nenhum vestígio de SQLite + renames consistentes + tests do refactor cobrindo coverage equivalente. |
| **W3 QUALITY** | `ts-quality-checker` + suite completa | typecheck + lint + format + suite default + suite integration. |

---

## Pós-condições para tickets seguintes

- `CTR-DOCKERFILE-MYSQL` (#6): Dockerfile pode sair de `node:24-alpine` para algo sem toolchain C++ (não precisa mais compilar `better-sqlite3`).
- `CTR-CLI-MYSQL-SMOKE` (#7): a CLI agora só tem `memory` ou `mysql` — o smoke MySQL é o único caminho "real" de persistência.
- `CTR-DOCS-UPDATE-FOR-ADR-0020` (#8): após cleanup, SKILLs/CLAUDE.md/handbook ficam livres de menção a SQLite/dual-dialect/ADR-0018; #8 atualiza docs.
