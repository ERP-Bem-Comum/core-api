---
paths:
  - "src/modules/*/adapters/**/*.ts"
  - "src/modules/*/cli/**/*.ts"
  - "tests/modules/*/adapters/**/*.ts"
---

# Regras invariantes — Adapters & CLI

Aplicáveis a `src/modules/*/adapters/` e `src/modules/*/cli/`. É a única camada que pode tocar infra real (Drizzle, mysql2, S3, FS, processo externo).

- `try/catch` permitido aqui, mas **converter para `Result` na borda** antes de devolver ao application/domain.
- Implementações concretas dos ports. Cada port tem ao menos: adapter `InMemory` (testes) + adapter real (Drizzle, S3, etc.).
- **Nunca** vazar `Error` ou exception para application/domain.
- Mappers (row ↔ domínio) devem retornar `Result<T, E>` — domínio rejeita estado inválido vindo do banco.

## Driver da CLI (ADR-0020 — MySQL único)

A CLI roda contra dois backends, escolhidos por flag `--driver`:

| Driver | Repositórios | Persistência | Quando usar |
|---|---|---|---|
| `memory` (default) | `InMemoryContractRepository`, `InMemoryAmendmentRepository`, `InMemoryEventBus` | State file JSON (`./cli-state.json` ou `--state <path>`) ou ephemeral (`--no-state`) | Validação da P.O., E2E offline |
| `mysql` | Drizzle/mysql2 — pool + transação + SELECT-then-UPDATE-or-INSERT | Container Docker (dev) ou MySQL 8 managed (prod); migration aplicada no boot | Dev com persistência real, CI E2E, prod |

ADR-0020 lista features SQL **permitidas** (SELECT/INSERT/UPDATE/DELETE, JOIN, FK, transações, índices, CHECK, agregações simples, `ON DUPLICATE KEY UPDATE`, window functions, CTEs recursivas, FULLTEXT) e **proibidas** (JSON nativo, stored procs/triggers, `ENUM` nativo, tipos espaciais, `AUTO_INCREMENT` em PK de domínio, isolation level explícito).

## Skills canônicas

- `drizzle-schema-author` — modelar `mysqlTable`, índices, FKs ([`SKILL.md`](../skills/drizzle-schema-author/SKILL.md)).
- `application-cli-builder` — subcomandos de CLI ([`SKILL.md`](../skills/application-cli-builder/SKILL.md)).
- `nodejs-fs-scripter` / `nodejs-process-runner` — scripts FS e invocação de processos externos.
