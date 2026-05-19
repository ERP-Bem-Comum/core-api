[← Voltar para Arquitetura](./README.md)

# 06 — Estratégia de Persistência (MySQL único)

> ⚠️ **Atualizado em 2026-05-16 — pós-[ADR-0020](./adr/0020-mysql-only-supersedes-dual-dialect.md).**
> O [ADR-0018](./adr/0018-persistence-dual-dialect-drizzle.md) foi **Superseded by ADR-0020**: SQLite foi removido como dialeto e o módulo Contratos passou a usar MySQL 8.4 em todo o ciclo de vida (dev local via Docker compose, CI, prod). Versões anteriores deste documento descreviam dual-dialect — consultar git history se precisar do raciocínio histórico.

> **Decisão arquitetural fonte:** [ADR-0020](./adr/0020-mysql-only-supersedes-dual-dialect.md). Este documento é guia operacional — para o "porquê", leia a ADR.

---

## 1. Visão geral

A persistência do `core-api` segue o princípio **1 port, 1 repositório, 1 schema, 1 mapper-por-tipo**:

- **Domínio** (`src/modules/contracts/domain/`) não conhece SQL. Conversa apenas com tipos de domínio.
- **Application** (`src/modules/contracts/application/`) define ports `ContractRepository` e `AmendmentRepository` como tipos puros (sem implementação).
- **Adapter Drizzle/MySQL** (`src/modules/contracts/adapters/persistence/`) implementa os ports:
  - `schemas/mysql.ts` — schema único (declaração das tabelas + CHECKs + índices + FKs).
  - `drivers/mysql-driver.ts` — pool `mysql2/promise` + `drizzle-orm/mysql2` + migrator.
  - `repos/{contract,amendment}-repository.drizzle.ts` — SELECT-then-UPDATE-or-INSERT em transação (defesa em profundidade vs ODKU).
  - `mappers/{contract,amendment,period,money}.mapper.ts` — conversões domain ↔ row.

> **Ambiente de dev/CI/prod é MySQL 8.4** (ver [ADR-0013](./adr/0013-mysql-database-engine.md) + [ADR-0020](./adr/0020-mysql-only-supersedes-dual-dialect.md)). Em dev local, o compose Docker (entregue em `CTR-DB-COMPOSE-MYSQL`) materializa o container.

---

## 2. Mapeamentos canônicos de tipos

Mappers em `src/modules/contracts/adapters/persistence/mappers/`:

| Tipo de domínio | MySQL | Mapper responsável |
| :--- | :--- | :--- |
| `Money` (cents) | `bigint` | `money.mapper.ts` |
| `Date` (com ms) | `datetime(3)` | inline (Drizzle round-trippa `Date` nativo no `mode: 'date'`) |
| `Period.Fixed` | 3 colunas: `period_kind` `varchar(16)` + CHECK, `period_start` `datetime(3)`, `period_end` `datetime(3)` | `period.mapper.ts` |
| `Period.Indefinite` | mesmas 3 colunas (`period_end` = NULL) | `period.mapper.ts` |
| `AmendmentKind` / `AmendmentStatus` | `varchar(16)` + CHECK | direto em `amendment.mapper.ts` |
| `ContractId` / `AmendmentId` / `DocumentId` / `UserRef` (UUID v4) | `varchar(36)` PK / FK | rehidratação via smart constructors |
| `homologatedAmendmentIds` (array) | tabela junção `ctr_contract_homologated_amendments` (PK composta) | `contract.mapper.ts` + transação |

### Round-trip lossless

Mappers garantem que `domain → row → domain` preserva tudo. Sentinelas validados na suite de contrato:

- `Money` em `MAX_SAFE_INTEGER − 7` round-tripa exato (sentinela do `bigint` MySQL).
- `signedAt` com milissegundos preservados.
- `Period.Indefinite` com `period_end` NULL.
- `Amendment Homologated` com `signedDocumentRef` + `homologatedAt` + `homologatedBy` preservados.

---

## 3. Lista normativa de features SQL

Resumo (a [ADR-0020 §"Lista normativa atualizada"](./adr/0020-mysql-only-supersedes-dual-dialect.md) é a fonte da verdade):

| ✅ Permitidas | ❌ Proibidas (por razão própria) |
| :--- | :--- |
| DML básico, WHERE / ORDER / LIMIT, INNER/LEFT JOIN, COUNT/SUM/MAX/MIN/AVG | Colunas JSON nativas / `JSON_EXTRACT` / `JSON_OBJECT` |
| UNIQUE/INDEX simples e compostos, foreign keys, transações | Stored procedures, triggers, eventos agendados |
| CHECK constraints simples | `ENUM` nativo |
| `drizzle.insert(...).onDuplicateKeyUpdate(...)` (libera neste dialeto único) | Tipos espaciais |
| `db.transaction(...)` (modo default = `REPEATABLE READ`) | `AUTO_INCREMENT` em PK de domínio (UUID v4 gerado no domínio) |
| Window functions (`ROW_NUMBER() OVER`, `LAG`, `LEAD`) | Isolation level explícito |
| CTEs recursivas (`WITH RECURSIVE`) | |
| FULLTEXT INDEX / `MATCH AGAINST` (quando busca textual virar requisito real) | |

**Validação contínua**: a suite `tests/modules/contracts/adapters/persistence/{contract,amendment}-repository.suite.ts` roda os mesmos cenários contra InMemory e Drizzle/MySQL. Qualquer divergência semântica entre o port e o adapter falha o build.

---

## 4. Topologia de execução

| Ambiente | Driver | Bootstrap | Onde |
| :--- | :--- | :--- | :--- |
| Testes unitários de domínio | n/a (puro) | — | dev local + CI |
| Testes de contrato (`*.suite.ts`) | InMemory | construtor | dev local + CI |
| Testes de integração (`pnpm test:integration`) | `mysql2` em container Docker | migration aplicada no boot via `openMysql({ applyMigrations: true })` | dev local + CI (com Docker) |
| CLI da P.O. (dev manual) | `mysql2` em container Docker ou `memory` (state file JSON) | migration aplicada no boot do driver mysql | dev local |
| Staging / produção | `mysql2` em MySQL 8 gerenciado (RDS / Cloud SQL) | migrations `drizzle-kit` aplicadas via boot ou pipeline | infra cloud |

---

## 4.1 CLI e escolha de driver

A CLI (`pnpm cli:contracts <subcomando>`) aceita uma flag global `--driver` que seleciona qual ambiente de persistência vai rodar por trás dos use cases. Os use cases continuam consumindo `ContractRepository` e `AmendmentRepository` como ports puros (ver `src/modules/contracts/cli/context.ts`).

### Tabela de uso

| Comando | Driver / fonte de estado |
| :--- | :--- |
| `pnpm cli:contracts criar-contrato …` | `--driver memory` (default), state file `./cli-state.json` |
| `pnpm cli:contracts criar-contrato --driver memory --state ./qa.json …` | InMemory + state file customizado |
| `pnpm cli:contracts listar-contratos --driver memory --no-state` | InMemory efêmero (descarta no fim) |
| `pnpm cli:contracts listar-contratos --driver mysql --connection-string 'mysql://user:pass@host:port/db'` | Drizzle/MySQL real (migration aplicada no boot) |

### Regras de validação de flags

- Sem nenhuma flag = `--driver memory --state ./cli-state.json` (backward compat).
- `--state` / `--no-state` **só** valem para `--driver memory`.
- `--connection-string` **só** vale para `--driver mysql`.
- Pares mutuamente exclusivos: `--state` × `--no-state`.
- Violação → exit `64` (`EX_USAGE`) com mensagem PT-BR explicando a regra.

### Exit codes

| Código | Quando |
| :---: | :--- |
| 0 | Sucesso ou `--help`. |
| 1 | Erro de domínio ou de use case (ex.: validação de aditivo). |
| 64 (`EX_USAGE`) | Flag desconhecida, conflito de flags, subcomando inexistente, connection string mal formada. |
| 74 (`EX_IOERR`) | Falha de I/O: state file, MySQL connect/migrate. |

### Shutdown garantido

O `main.ts` envolve `cmd.run(ctx, …)` em `try/finally` e chama `ctx.shutdown()` na cláusula `finally`. Para `--driver mysql`, isso fecha o pool `mysql2` — sem connection leak.

### Quando escolher cada driver

- **`memory`** — sessões de QA manual rápidas, scripts, demonstrações curtas. State file JSON legível.
- **`mysql`** — exercitar o adapter Drizzle/MySQL em fluxos longos, validar UNIQUE/CHECK/FK em runtime real. Recomendado para sessões de QA pré-produção e para todo o smoke E2E. Em prod, único driver vivo.

---

## 5. Migrations

Geradas e aplicadas via `drizzle-kit` + `drizzle-orm/mysql2/migrator`:

### 5.1 Gerar nova migration

```bash
pnpm db:generate
# → src/modules/contracts/adapters/persistence/migrations/mysql/NNNN_*.sql
# + atualiza meta/0000_snapshot.json (rastreamento de schema)
```

O config está em `drizzle.config.ts` apontando para `schemas/mysql.ts` + `out: migrations/mysql/`.

### 5.2 Aplicar migration

Aplicação acontece **no boot do driver**: `openMysql({ applyMigrations: true })` invoca `migrate(db, { migrationsFolder })` do `drizzle-orm/mysql2/migrator`. Idempotente via tabela `__drizzle_migrations` (journal interno do drizzle-kit).

**Vantagem**: a CLI / app garante schema atualizado no startup. Operador não precisa lembrar de rodar migrate.
**Trade-off**: ~30-50ms no boot. Para CLI single-shot é invisível.

---

## 6. Build (sem toolchain C++)

Após a remoção do `better-sqlite3` em `CTR-CLEANUP-SQLITE`, o `mysql2` é JS puro — não há compilação nativa. O `Dockerfile` saiu de Alpine + `python3 make g++ libc6-compat` para Alpine apenas. Build mais rápido, imagem menor, menos surface de ataque.

### Validação local

```bash
node -e "import('mysql2/promise').then(m => console.log('mysql2 OK'))"
```

Deve imprimir `mysql2 OK`.

---

## 7. Boundary error → Result

Todo erro de I/O é convertido para `Result` no adapter, conforme regra global do CLAUDE.md (`throw` proibido fora de adapters). Pontos relevantes:

- **`openMysql()`**: retorna `Result<MysqlHandle, MysqlDriverError>`. Erros possíveis: `mysql-driver-connection-string-invalid`, `mysql-driver-connect-failed`, `mysql-driver-migrate-failed`.
- **Repositórios**: usam wrapper `safe(ctx, op)` que (a) registra o `error` real via `process.stderr.write` com contexto, (b) substitui pelo código do port (`contract-repo-unavailable` ou `amendment-repo-unavailable`). O port não vaza sinais internos do mapper, mas o operador tem visibilidade do erro original via stderr.

---

## 8. Upsert estrito por PK (SELECT-then-UPDATE-or-INSERT)

`ON DUPLICATE KEY UPDATE` do MySQL dispara em **qualquer** UNIQUE violada (não dirigível à PK como o `ON CONFLICT (col)` do Postgres/SQLite — MySQL Refman §13.2.6.2). Para garantir que tentar gravar uma row com `sequential_number` colidindo dispare erro (em vez de UPDATE silencioso da row alheia + perda do `id`), os repos usam:

```ts
await db.transaction(async (tx) => {
  const existing = await tx.select({ id }).from(table).where(eq(table.id, row.id));
  if (existing.length > 0) {
    await tx.update(table).set(row).where(eq(table.id, row.id));
  } else {
    await tx.insert(table).values(row); // falha com ER_DUP_ENTRY se UNIQUE violada
  }
});
```

1 RTT extra; defesa em profundidade contra bug futuro em código fora do use case (admin script, futuro HTTP endpoint, integrações). Decisão validada pela skill `database-theorist` ancorada em Ramakrishnan §3.2 + Date Cap. 9.

---

## 9. Tickets relacionados

- `CTR-DB-COMPOSE-MYSQL` (#1) — Docker compose com MySQL 8.4 + MinIO.
- `CTR-DB-SCHEMA-MYSQL-CTR-PREFIX` (#2) — schema com prefix `ctr_*`, CHECKs F-L1/F-L2.
- `CTR-DB-MIGRATION-MYSQL` (#3) — primeira migration via drizzle-kit, validação E2E.
- `CTR-DB-DRIVER-MYSQL` (#4) — pool runtime + repos `Drizzle/MySQL` + CLI driver wired.
- `CTR-CLEANUP-SQLITE` (#5) — remoção de SQLite, mappers paralelos viraram canônicos.
- `CTR-DOCKERFILE-MYSQL` (#6) — Dockerfile auditado contra handbook Docker; sem toolchain C++.
- `CTR-CLI-MYSQL-SMOKE` (#7) — smoke E2E completo da CLI contra MySQL real.
- `CTR-DOCS-UPDATE-FOR-ADR-0020` (#8) — atualização da documentação (este e demais arquivos).

---

## 10. Referências

- [ADR-0020](./adr/0020-mysql-only-supersedes-dual-dialect.md) — MySQL como único dialeto (vigente).
- [ADR-0018](./adr/0018-persistence-dual-dialect-drizzle.md) — Persistência Dual-Dialect (Superseded — evidência histórica).
- [ADR-0013](./adr/0013-mysql-database-engine.md) — Engine MySQL 8.
- [ADR-0014](./adr/0014-mysql-database-isolation.md) — Isolamento por database (`core.ctr_*`).
- [ADR-0006](./adr/0006-modular-monolith-core-api.md) — Modular monolith e ports & adapters.
- [Drizzle ORM docs — MySQL](https://orm.drizzle.team/docs/get-started-mysql).
