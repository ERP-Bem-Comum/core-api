# W0 — Testes RED (CTR-DEVOPS-HARDENING)

**Skill:** nodejs-runtime-expert (fatia NODE — único código de produção)
**Data:** 2026-06-02

As fatias PNPM/CI e DOCKER são config/infra (sem teste unitário — validadas no gate W3). A fatia NODE tem código de produção e seguiu fail-first:

| Teste (novo) | Alvo | RED inicial |
| :-- | :-- | :-- |
| `tests/shared/runtime/shutdown-once.test.ts` (4 casos) | `makeShutdownOnce` idempotente | `ERR_MODULE_NOT_FOUND` (`#src/shared/runtime/shutdown-once.ts` inexistente) |
| `tests/shared/runtime/last-resort.test.ts` CA4/CA5 | stack trace completo em `uncaughtException` | CA4 falhava: `String(cause)` descartava os frames |

Cobertura: idempotência sequencial + concorrente (SIGTERM + uncaughtException no mesmo ciclo) e preservação de stack de `Error` (vs `String` para não-Error).
