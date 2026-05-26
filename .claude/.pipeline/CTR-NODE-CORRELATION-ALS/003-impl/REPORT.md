# W1 — Implementação (GREEN)

## Arquivos

- **Novo:** `src/shared/observability/correlation.ts` — primitive ALS (`node:async_hooks`), zero dep externa. Exporta `runWithCorrelation`, `withNewCorrelation`, `currentCorrelationId`.
- **Editado:** `src/modules/contracts/worker/outbox-worker.ts` — wiring batch-level:
  - import do primitive + helper `workerTag()` (prefixo de log com id quando há escopo);
  - 5 logs `[outbox-worker]` → `${workerTag()}`;
  - cada iteração de `runLoop` roda dentro de `withNewCorrelation`; o log de erro de I/O fica dentro do escopo para carregar o id; acumulação de `totals` e `sleep` ficam fora (evita `no-loop-func` e mantém o sleep como intervalo entre batches).

## GREEN

18/18 (6 correlation + 5 only-allow + 7 worker). Stats do worker inalterados → CA5 OK.

## YAGNI respeitado

Per-event correlation, wiring nos `main.ts` e propagação no payload do evento ficaram fora (ver 000-request.md § Fora de escopo).
