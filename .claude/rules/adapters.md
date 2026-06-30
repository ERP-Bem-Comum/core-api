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

## Skills canônicas

- `drizzle-schema-author` — modelar `mysqlTable`, índices, FKs ([`SKILL.md`](../skills/drizzle-schema-author/SKILL.md)).
- `nodejs-fs-scripter` / `nodejs-process-runner` — scripts FS e invocação de processos externos.
