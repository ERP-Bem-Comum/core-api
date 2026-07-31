---
paths:
  - "src/modules/*/adapters/**/*.ts"
  - "tests/modules/*/adapters/**/*.ts"
---

# Regras invariantes — Adapters

Aplicáveis a `src/modules/*/adapters/`. É a única camada que pode tocar infra real (Drizzle, mysql2, S3, FS, processo externo).

- `try/catch` permitido aqui, mas **converter para `Result` na borda** antes de devolver ao application/domain.
- Implementações concretas dos ports. Cada port tem ao menos: adapter `InMemory` (testes) + adapter real (Drizzle, S3, etc.).
- **Nunca** vazar `Error` ou exception para application/domain.
- Mappers (row ↔ domínio) devem retornar `Result<T, E>` — domínio rejeita estado inválido vindo do banco.

## Driver de persistência: `memory` vs `mysql` (ADR-0020 — MySQL único)

A CLI embutida foi removida (CLI-RETIRE-EMBEDDED / ADR-0037). A escolha de backend agora é da **borda
HTTP** (`src/server.ts`), por env var por módulo (ex.: `CONTRACTS_DRIVER=mysql` + `CONTRACTS_DATABASE_URL`),
e do **worker de outbox** (`worker/run.ts`, sempre mysql). Os mesmos dois adapters seguem valendo:

| Driver | Repositórios | Persistência | Quando usar |
|---|---|---|---|
| `memory` (default) | `InMemory*Repository` + `InMemoryOutbox` | Em processo, efêmero | Testes (`fastify.inject`), boot HTTP sem DB |
| `mysql` | Drizzle/mysql2 — pool + transação + SELECT-then-UPDATE-or-INSERT | MySQL 8 (Docker dev / managed prod); migration no boot do writer pool | Dev com persistência real, CI E2E, prod |

ADR-0020 lista features SQL **permitidas** (SELECT/INSERT/UPDATE/DELETE, JOIN, FK, transações, índices, CHECK, agregações simples, `ON DUPLICATE KEY UPDATE`, window functions, CTEs recursivas, FULLTEXT) e **proibidas** (JSON nativo, stored procs/triggers, `ENUM` nativo, tipos espaciais, `AUTO_INCREMENT` em PK de domínio, isolation level explícito).

## Mapeamentos canônicos domínio → MySQL ([ADR-0020](../../handbook/architecture/adr/0020-mysql-only-supersedes-dual-dialect.md))

| Tipo de domínio        | Coluna MySQL                                                              |
| ---------------------- | ------------------------------------------------------------------------- |
| `Money` (cents)        | `BIGINT`                                                                  |
| `Date` (timestamp)     | `DATETIME(3)` — UTC via `default-time-zone=+00:00`                        |
| `Period`               | **3 colunas**: `period_kind VARCHAR(16)+CHECK`, `period_start`, `period_end` (nullable) |
| Enum de domínio        | `VARCHAR(16) + CHECK` — **nunca** `ENUM` nativo                          |
| ID brandado            | `VARCHAR(36)` como PK — legibilidade vence os 16 bytes                    |
| Coleção de IDs         | **tabela de junção** com PK composta — nunca array nem JSON               |

## Escrita, leitura e a regra de ouro

- **Um único escritor por database** ([ADR-0014](../../handbook/architecture/adr/0014-mysql-database-isolation.md)). `core.*` só o core-api escreve. **Eventos via outbox são o único canal cross-database** — nunca `SELECT` na tabela de outro módulo.
- **Pool é boot-scoped, via registry** — `src/shared/persistence/pool-registry.ts`. URLs idênticas colapsam num único pool por processo. Nasceu de incidente real de exaustão de conexões no RDS; não abra pool por módulo nem por repositório.
  > O read/write split writer/reader do [ADR-0026](../../handbook/architecture/adr/0026-mysql-read-write-split-connection.md) é **norma decidida e ainda não implementada** — `grep -rn "createPool" src/` não encontra split algum. Não escreva código assumindo que os dois pools existem.

## Outbox e projeções

- **O `INSERT` na outbox vai DENTRO da mesma transação** da mudança de domínio ([ADR-0015](../../handbook/architecture/adr/0015-mysql-outbox-pattern.md)): o evento existe **se e somente se** o estado foi persistido. "Publicar depois do save" não satisfaz — precisa ser atômico (`appendOutboxInTx`).
- MySQL **não tem** `LISTEN/NOTIFY`: a leitura do outbox é **polling**, sempre.
- **O outbox É o log append-only canônico** ([ADR-0022](../../handbook/architecture/adr/0022-read-models-via-projection-over-event-stream.md)) — não criar event-store separado. Read-model é **projeção** alimentada pelo event-delivery, **nunca** query direta na tabela de entrega. Projetor **idempotente por `eventId`**; o read-model é derivado e pode ser truncado e reconstruído.
- **Idempotência de projeção** ([ADR-0045](../../handbook/architecture/adr/0045-financial-supplier-read-model.md)): `ON DUPLICATE KEY UPDATE` + **guard de recência** por `occurred_at` — absorve at-least-once e evento fora de ordem atomicamente, sem SELECT-then-UPDATE.

## Eventos de integração cross-módulo

- O payload é montado **no adapter de persistência, a partir do snapshot do agregado** — nunca do evento de domínio. O domínio **não muda** para servir integração ([ADR-0043](../../handbook/architecture/adr/0043-partners-supplier-integration-events.md) §Opção A).
- Serializado com `JSON.stringify` em `varchar` — sem JSON nativo (ADR-0020).
- **Campo aditivo NUNCA quebra o `schema_version = 1`**: acrescentar não exige bump; consumidores existentes ignoram o campo novo ([ADR-0046](../../handbook/architecture/adr/0046-contracts-contractor-ref-integration-events.md)).

## Storage de documentos ([ADR-0019](../../handbook/architecture/adr/0019-document-storage-s3-with-minio-dev.md))

> **1 port, 1 adapter, 1 SDK, 2 endpoints, 0 emulação custom.**

`@aws-sdk/client-s3` é o **único** cliente — sem wrapper caseiro, sem `s3rver`/FlatDoc. MinIO e AWS S3 usam o mesmo código; muda só a config: `forcePathStyle: true` para MinIO, `false` para S3.

## Leitura de documento fiscal ([ADR-0050](../../handbook/architecture/adr/0050-document-reader-cascade-supersedes-0034.md))

- O `DocumentReaderPort` **recebe bytes** (`Buffer`/`Uint8Array`) ou uma `StorageKey` resolvida server-side — **nunca uma URL vinda do cliente** (anti-SSRF, anti-vazamento de URL assinada).
- Cascata: XML estruturado → parser de texto nativo → OCR externo → **erro explícito**. **Nunca valor errado silencioso** — é invariante fiscal.
- O domínio recebe **campos tipados** + `resolvedVia`, **não texto bruto** (minimização, LGPD art. 6 III). **Log nunca contém bytes, texto ou resultado.**

## Skills canônicas

- `drizzle-schema-author` — modelar `mysqlTable`, índices, FKs ([`SKILL.md`](../skills/drizzle-schema-author/SKILL.md)).
- `nodejs-fs-scripter` / `nodejs-process-runner` — scripts FS e invocação de processos externos.
