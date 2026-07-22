# W0 — RED — CORE-WORKER-RUNNER-POOL-REGISTRY

**Skill:** `tdd-strategist` · **Data:** 2026-07-10 · **Branch:** `feat/worker-runner-pool-registry` (stacked sobre `fix/pool-config-invariant`)

## Testes escritos (RED por inexistência da API)
1. `tests/shared/persistence/pool-registry.test.ts` — **CA-1..CA-5** (registry: dedup por connection-string).
2. `tests/workers/runner/group.test.ts` — **CA-6..CA-8** (runWorkerGroup: isolamento por allSettled + shutdown).

## Cobertura
| CA | Asserção |
| :- | :- |
| CA-1 | `getOrCreate(url)` cria 1 pool (ok) |
| CA-2 | `getOrCreate` 2× mesma url → MESMO pool (dedup — o núcleo do ganho de conexões) |
| CA-3 | URLs distintas → pools distintos |
| CA-4 | config inválida propaga `err('pool-config-connection-limit-invalid')`, sem criar pool |
| CA-5 | `closeAll()` fecha todos + idempotente |
| CA-6 | runner roda N loops em paralelo |
| CA-7 | 1 loop que rejeita não derruba os irmãos (allSettled) |
| CA-8 | abort → todos os loops encerram (shutdown drena) |
| CA-9 | *(x99, W1/W3)* grupo de 3 workers na mesma URL → **1 pool**; conexões ≤ connectionLimit único |

## Evidência RED
```
pool-registry.test.ts → ERR_MODULE_NOT_FOUND (#src/shared/persistence/pool-registry.ts) · fail 1
group.test.ts         → ERR_MODULE_NOT_FOUND (#src/workers/runner/group.ts) · fail 1
```

## Próximo (W1 — GREEN)
- `src/shared/persistence/pool-registry.ts`: `createPoolRegistry({connectionLimit?})` → `getOrCreate` (dedup via Map<string,Pool>, usa `buildPoolOptions`) + `closeAll`. **D2:** `connectionLimit` derivado do budget (`floor(60×margem/N)`) — afinar com `mysql-database-expert`.
- `src/workers/runner/group.ts`: `runWorkerGroup(specs, signal)` via `Promise.allSettled` (`nodejs-runtime-expert`).
- `openXMysql` aceita pool externo (drizzle sobre pool do registry).
- 6 factories `buildXWorker` + `src/workers/runner/run.ts` (resolve grupo via `WORKER_GROUP`).
- CA-9 no x99 (prova 1 pool/grupo).
