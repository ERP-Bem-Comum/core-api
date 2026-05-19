# Ticket CTR-DB-DRIVER-MYSQL

> **Sequência:** 4º ticket da derivação de [ADR-0020](../../../handbook/architecture/adr/0020-mysql-only-supersedes-dual-dialect.md).
> Antecessores: `CTR-DB-COMPOSE-MYSQL` (#1, infra), `CTR-DB-SCHEMA-MYSQL-CTR-PREFIX` (#2, schema TS), `CTR-DB-MIGRATION-MYSQL` (#3, migration SQL).
> Sucessores: `CTR-CLEANUP-SQLITE` (#5), `CTR-DOCKERFILE-MYSQL` (#6), `CTR-CLI-MYSQL-SMOKE` (#7), `CTR-DOCS-UPDATE-FOR-ADR-0020` (#8).

---

## Objetivo

Wirar o driver MySQL **em runtime**: pool `mysql2`, instância `drizzle-orm/mysql2`, aplicação de migration via `drizzle-orm/mysql2/migrator`, repositórios `Drizzle/MySQL` para `Contract` e `Amendment`, e ativação do CLI driver `--driver mysql` (que hoje é stub e retorna `cli-mysql-driver-not-wired`).

**O que este ticket NÃO faz:**
- Smoke end-to-end completo da CLI rodando subcomandos contra MySQL — fica em `CTR-CLI-MYSQL-SMOKE` (#7).
- Remoção dos adapters SQLite (eles seguem vivos até `CTR-CLEANUP-SQLITE` #5).
- Outbox MySQL persistente — `EventBus` continua in-memory neste ticket (ticket separado quando necessário).

---

## Princípio condutor

> **Paralelo, não invasivo.** Adicionar adapters MySQL ao lado dos SQLite, sem mexer no SQLite. O CLI driver `mysql.ts` passa de stub a funcional. A camada de `domain/`, `application/`, `mappers/` e `schemas/mysql.ts` (já existente do ticket #2) **não é modificada** — mappers são compatíveis dialect-agnostic.

A migration entregue em #3 (`0000_superb_inhumans.sql`) é o **contrato canônico** que o `drizzle-orm/mysql2/migrator` consome no boot do driver. Idempotente via journal.

---

## Decisões

### D1 — Dependência `mysql2`

- Adicionar `mysql2@^3.x` em `dependencies` (não `devDependencies` — é runtime do app).
- pnpm.onlyBuiltDependencies não precisa de entry — `mysql2` é JS puro, não compila.
- Pinar minor: `mysql2: "^3.11.0"` (versão LTS estável).

### D2 — Adapter `mysql-driver.ts`

Análogo a `sqlite-driver.ts`. API:

```ts
type MysqlConnectOptions = Readonly<{
  connectionString: string;       // mysql://user:pass@host:port/db
  applyMigrations?: boolean;      // default true; false em ambientes onde migrate roda fora
  poolLimit?: number;             // default 10
}>;

type MysqlHandle = Readonly<{
  db: MySql2Database<typeof schema>;
  schema: typeof schema;          // schemas/mysql.ts
  close: () => Promise<void>;     // fecha o pool
}>;

type MysqlDriverError =
  | 'mysql-driver-connection-string-invalid'
  | 'mysql-driver-connect-failed'
  | 'mysql-driver-migrate-failed';

export const openMysql = async (opts: MysqlConnectOptions): Promise<Result<MysqlHandle, MysqlDriverError>>;
```

Implementação:
1. Valida `connectionString` (formato `mysql://...`). Erro: `mysql-driver-connection-string-invalid`.
2. `createPool(connectionString, { connectionLimit })` do `mysql2/promise`.
3. `drizzle(pool, { schema, mode: 'default' })`.
4. Se `applyMigrations !== false`: chama `migrate(db, { migrationsFolder: 'src/modules/contracts/adapters/persistence/migrations/mysql' })`. Erro: `mysql-driver-migrate-failed`.
5. Retorna handle com `close` que faz `pool.end()`.

`try/catch` no boundary: toda exceção do `mysql2` ou do migrator vira `Result.err`. Stderr registra o `cause` antes de substituir pelo código.

### D3 — Connection string parsing

`mysql2` aceita string URI nativamente (`mysql://user:pass@host:port/database?option=value`). Não vamos reescrever parser.

Validação: regex simples para pegar erro precoce — `^mysql:\/\/[^:]+:[^@]+@[^:/]+:\d+\/\w+`. Tolera query string opcional. Validação mais rigorosa fica com o próprio `mysql2`.

### D4 — Repositórios `Drizzle/MySQL`

Arquivos novos:
- `src/modules/contracts/adapters/persistence/repos/contract-repository.drizzle-mysql.ts`
- `src/modules/contracts/adapters/persistence/repos/amendment-repository.drizzle-mysql.ts`

Decisões internas:
- **Upsert**: Drizzle MySQL expõe `.onDuplicateKeyUpdate({ set })` (equivalente a `INSERT ... ON DUPLICATE KEY UPDATE`). Por ADR-0020 §"Agora permitidas", isso é OK. **Preferir** essa API ao SELECT-THEN-INSERT/UPDATE manual.
- **Transações**: `await db.transaction(async (tx) => {...})`. Modo default = isolation `REPEATABLE READ` do MySQL (configurado no compose). Sem `tx.setIsolationLevel(...)` (ADR-0020 proíbe).
- **Async**: todas as operações são `async` (driver mysql2 é async). Diferente do SQLite (better-sqlite3 é sync). `safe()` helper continua igual — já é `async`.
- Mesmas conversões de erro do SQLite: stderr + `contract-repo-unavailable` / `amendment-repo-unavailable`.

### D5 — Mappers reutilizados

`mappers/contract.mapper.ts:11` já comenta: *"Tipos inferidos do schema (mesmos para SQLite e MySQL — Drizzle usa nomes de coluna idênticos nos dois dialetos)."*

**Verificação no W1**: rodar `tsc --noEmit` após plugar os mappers nos repos MySQL. Se `ContractRow`/`ContractInsert` derivado do `schemas/sqlite.ts` for compatível com inserção em `schemas/mysql.ts.contracts`, OK. Se houver drift (ex.: tipo de coluna divergente), criar `ContractRowMysql` separado importando de `schemas/mysql.ts`.

**Esperado:** sem drift. Schema TS tem mesmos nomes e tipos `varchar/bigint/datetime` equivalentes.

### D6 — `cli/drivers/mysql.ts` deixa de ser stub

Análogo a `sqlite.ts`:
- `buildMysqlContext(connectionString)`:
  1. `openMysql({ connectionString, applyMigrations: true })`
  2. Se erro, retorna `err(MysqlDriverError)`.
  3. Cria repos `Drizzle/MySQL`, `InMemoryEventBus`, `ClockReal`.
  4. `persist` é no-op (cada save já persiste no MySQL).
  5. `shutdown` chama `handle.close()`.

`CliContextError` em `context.ts` ganha as variantes de `MysqlDriverError`. Atualizar `EXIT_CODES` em `main.ts`.

### D7 — Migration aplicada no boot

Não criar `pnpm db:migrate:mysql` separado. A migration roda automaticamente no `openMysql({ applyMigrations: true })`. Razões:
- Simétrico ao SQLite (`openSqlite` aplica DDL inline).
- Idempotente — drizzle-kit journal (`meta/_journal.json`) garante que rodar 2x não duplica.
- CLI driver mysql é point-of-entry para qualquer caller (CLI ou futuro HTTP); migration consistente.

Sub-flag `applyMigrations: false` existe para testes que controlam o lifecycle externamente.

### D8 — Testes E2E só ao nível de repo/driver

Neste ticket cobrimos:
- **Driver level**: `openMysql` retorna handle válido, aplica migrations idempotentemente, fecha pool.
- **Repo level**: `Drizzle/MySQL` repos passam em `runContractRepositoryContract` + `runAmendmentRepositoryContract` (suites compartilhadas).

E2E da CLI (`pnpm cli:contracts -- --driver mysql --connection-string mysql://... criar-contrato …`) fica para `CTR-CLI-MYSQL-SMOKE` (#7).

Razão: separação de responsabilidades. Este ticket prova que **a camada de persistência MySQL funciona** (igual `CTR-ADAPTER-DRIZZLE-DUAL` provou SQLite). #7 prova que **a CLI inteira funciona contra MySQL**.

### D9 — Opt-in via `MYSQL_INTEGRATION=1`

Mesma estratégia do ticket #3: testes que dependem de Docker MySQL up fazem `t.skip()` quando `MYSQL_INTEGRATION≠1`. O target `pnpm test:integration` já existe (entregue em #3) — atualizar para incluir o glob desta suite:

```json
"test:integration": "... 'tests/modules/contracts/adapters/persistence/{migrations,*.test.ts}'"
```

Ou mais simples: ampliar o glob para `tests/modules/contracts/adapters/persistence/**/*.test.ts`.

### D10 — Pool config

Defaults razoáveis:
- `connectionLimit: 10`
- `waitForConnections: true` (default do mysql2)
- `queueLimit: 0` (sem limite — testes não vão estourar)
- `enableKeepAlive: true`, `keepAliveInitialDelay: 10_000` (boa prática para pools longos)

Tunning fica para ticket de performance se vier necessidade.

---

## Critérios de Aceitação (14 CAs)

### Estruturais (sem dependência de Docker — 4 CAs)

- **CA-1**: `package.json#dependencies.mysql2` é `^3.x`.
- **CA-2**: `src/modules/contracts/adapters/persistence/drivers/mysql-driver.ts` exporta `openMysql`, `type MysqlHandle`, `type MysqlConnectOptions`, `type MysqlDriverError` com as assinaturas declaradas em D2.
- **CA-3**: `src/modules/contracts/adapters/persistence/repos/contract-repository.drizzle-mysql.ts` exporta `createDrizzleMysqlContractRepository(handle: MysqlHandle): ContractRepository`.
- **CA-4**: `src/modules/contracts/adapters/persistence/repos/amendment-repository.drizzle-mysql.ts` exporta `createDrizzleMysqlAmendmentRepository(handle: MysqlHandle): AmendmentRepository`.

### Funcionais — driver level (3 CAs, opt-in `MYSQL_INTEGRATION=1`)

- **CA-5**: `openMysql({ connectionString: 'mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core' })` retorna `ok(handle)` em container MySQL healthy.
- **CA-6**: Conexão inválida (`mysql://invalid:invalid@127.0.0.1:3306/inexistente`) retorna `err('mysql-driver-connect-failed')`.
- **CA-7**: Connection string mal formada (`http://...`) retorna `err('mysql-driver-connection-string-invalid')`.

### Funcionais — migrator (1 CA, opt-in)

- **CA-8**: `openMysql({ applyMigrations: true })` é idempotente — duas chamadas seguidas no mesmo container não dão erro; `INFORMATION_SCHEMA.tables` mostra as 3 tabelas `ctr_*` ao final.

### Funcionais — repo level (4 CAs, opt-in)

- **CA-9**: `createDrizzleMysqlContractRepository` passa em `runContractRepositoryContract` (todas as asserções da suite contratual).
- **CA-10**: `createDrizzleMysqlAmendmentRepository` passa em `runAmendmentRepositoryContract`.
- **CA-11**: Upsert via `onDuplicateKeyUpdate` em ContractRepository preserva `sequentialNumber` UNIQUE — segundo save com mesmo id atualiza, segundo save com mesmo `sequentialNumber` mas id diferente FALHA com erro de constraint.
- **CA-12**: Transação atômica em ContractRepository — falha ao inserir junction row causa rollback do save do contrato (o save do contrato e da junction são na mesma transação).

### Funcionais — CLI integration (2 CAs, opt-in)

- **CA-13**: `buildMysqlContext('mysql://...')` retorna `ok(ctx)` com `contractRepo`, `amendmentRepo`, `eventBus`, `clock`, `persist`, `shutdown`.
- **CA-14**: `ctx.shutdown()` chama `handle.close()` sem erro (pool fechado).

---

## Cobertura ↔ camadas

| Camada | CAs |
| :--- | :--- |
| Dependência | CA-1 |
| Driver (estrutural) | CA-2 |
| Driver (runtime) | CA-5, CA-6, CA-7, CA-8 |
| Repos (estrutural) | CA-3, CA-4 |
| Repos (suite contrato) | CA-9, CA-10 |
| Repos (constraints) | CA-11, CA-12 |
| CLI driver | CA-13, CA-14 |

Total: 14 CAs (4 estruturais + 10 funcionais).

---

## Riscos & mitigações

- **R1: Drift de tipo entre mappers e `schemas/mysql.ts`.** Mappers importam tipos do `schemas/sqlite.ts`. Se MySQL der tipo divergente (ex.: `datetime` retorna `Date` vs SQLite `number`), o repo MySQL falha. Mitigação: `tsc --noEmit` no W3 + suite contratual no W2.
- **R2: `mysql2` versão sem `enableKeepAlive`.** Verificar `pnpm view mysql2 versions` que `^3.11.0` tem essa opção (estável desde 3.0).
- **R3: Migration falha ao rodar 2x.** Drizzle-kit journal garante idempotência. Mitigação: CA-8 valida explicitamente.
- **R4: Pool não fecha em SIGINT.** Não cobrir neste ticket — handler de signal é coisa do `main.ts` no #7.
- **R5: `tsc --noEmit` falha por algum tipo do mysql2 sem `@types`.** `mysql2` traz `.d.ts` próprio desde 3.0; não precisamos de `@types/mysql2`.

---

## Plano de Waves

| Wave | Skill / Foco | Output |
| :--- | :--- | :--- |
| **W0 RED** | `pipeline-maestro` + `node:test` | Testes em `tests/modules/contracts/adapters/persistence/{drizzle-mysql.test.ts, mysql-driver.test.ts}` cobrindo 14 CAs. RED esperado: 4 estruturais falham (módulos não existem); 10 funcionais skipam por opt-in. |
| **W1 GREEN** | `database-engineer` + `ports-and-adapters` | `mysql-driver.ts`, 2 repos `drizzle-mysql.ts`, refactor `cli/drivers/mysql.ts`, install `mysql2`, atualizar `package.json`/`tsconfig`. 4 CAs estruturais GREEN; 10 funcionais GREEN sob `MYSQL_INTEGRATION=1`. |
| **W2 REVIEW** | `code-reviewer` (Maestro) | Audit read-only: contratos de erro, transação atômica, mappers reuse, pool lifecycle. APPROVED ou CHANGES_REQUESTED. |
| **W3 QUALITY** | `ts-quality-checker` + `pnpm test:integration` | typecheck + lint + format + suite default (estruturais green, funcionais skip) + suite integration (14/14 green). |

---

## Dependências externas

- Container `core-api-mysql` healthy via `docker compose up -d mysql --wait` (entregue em #1).
- Migration `0000_superb_inhumans.sql` em `src/.../migrations/mysql/` (entregue em #3).
- Schema TS `schemas/mysql.ts` (entregue em #2).

---

## Pós-condições para tickets seguintes

- `CTR-CLEANUP-SQLITE` (#5) ganha um "novo padrão estabelecido": após este ticket, MySQL está totalmente funcional, então #5 pode deletar `schemas/sqlite.ts`, mappers SQLite-specific e adapters SQLite com confiança.
- `CTR-CLI-MYSQL-SMOKE` (#7) recebe um `buildMysqlContext` funcional. Bastará rodar CLI subcomandos contra ele.
- `CTR-DOCS-UPDATE-FOR-ADR-0020` (#8) terá o estado final consistente para atualizar SKILLs e CLAUDE.md sem citar stubs.
