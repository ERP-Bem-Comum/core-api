# W1 — GREEN — CORE-WORKER-RUNNER-POOL-REGISTRY

**Agentes:** `ports-and-adapters` + `nodejs-runtime-expert` + `general-purpose` (extração das 6 factories) · **Data:** 2026-07-10 · **Branch:** `feat/worker-runner-pool-registry`

## Implementação
1. **`src/shared/persistence/pool-registry.ts`** — `createPoolRegistry`: `getOrCreate` deduplica pool por connection-string (via `Map`), usa `buildPoolOptions` (invariante `maxIdle`); `closeAll` idempotente. **CA-1..5**.
2. **`src/workers/runner/group.ts`** — `runWorkerGroup` via `Promise.allSettled` (isolamento de loop) + shutdown por `AbortSignal`. **CA-6..8**.
3. **4 × `openXMysqlOnPool`** (contracts/auth/financial/partners) — cria o drizzle+schema sobre um pool EXTERNO (do registry); `close` no-op (registry é dono). Só nos 4 módulos usados por workers (YAGNI).
4. **`src/workers/runner/specs.ts`** — 6 factories (`SpecBuilder`) + `GROUPS` (outbox/projections/email). Extraídas fielmente dos 6 `run.ts`: outbox usam o wrapper `runLoop` do módulo + `readWorkerConfig`; projeções/email usam `shared/outbox`; email roda 2 loops (auth + partners opcional).
5. **`src/workers/runner/run.ts`** — composition root: resolve `WORKER_GROUP` → 1 registry → specs do grupo → `runWorkerGroup` + `closeAll` no shutdown; exit codes (78 config, 1 falha, 0 ok).

## Evidência
```
CA-1..5 (registry)          5/5
CA-6..8 (runWorkerGroup)    3/3
CA-9 (dedup real no x99)    ✔ "3 getOrCreate mesma url → 1 pool; conexões do pool único (não 3×)"
pnpm test (repo inteiro)    tests 3826 · pass 3803 · fail 0 · skipped 18 · todo 5
typecheck / lint / format:check  verdes
```
**CA-9 no x99**: MySQL 8.4 efêmero + túnel SSH `-L 3306`; `MYSQL_INTEGRATION=1`. 3 `getOrCreate` na mesma URL → mesma referência de pool; 4 conexões concorrentes servidas por 1 pool; contagem viva ≤ `connectionLimit` (não 3×). É a prova do ganho da issue #407 contra o Incident-0001.

## Nota de escopo (Fatia 1)
Os 6 `run.ts` standalone **permanecem funcionando** — o runner é adicional. A troca do deploy (compose 6→3 + taskdefs Fargate) para usar o runner é a **Fatia 2** (`CORE-WORKER-CONSOLIDATION-DEPLOY`). Zero regressão nesta fatia.

## Divergências do agente (bem-julgadas)
Aliases de `LoggerEventDelivery` (existe em contracts e partners); `PROJECTION_LOOP` const (mesmos valores dos run.ts); `env` estruturalmente assignável a `NodeJS.ProcessEnv` dos parsers de e-mail. Nenhuma substantiva.
