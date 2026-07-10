# W3 — GATE — CORE-WORKER-RUNNER-POOL-REGISTRY

**Skill:** `ts-quality-checker` · **Data:** 2026-07-10 · **Resultado: VERDE**

| Gate | Comando | Resultado |
| :-- | :-- | :-- |
| Typecheck | `pnpm run typecheck` | ✅ (exit 0) |
| Lint | `pnpm run lint` | ✅ (exit 0) |
| Format | `pnpm run format:check` | ✅ (exit 0) |
| Testes | `pnpm test` | ✅ **tests 3826 · pass 3803 · fail 0** · skipped 18 · todo 5 |
| **CA-9 (efeito)** | `MYSQL_INTEGRATION=1` no x99 | ✅ 3 getOrCreate mesma url → 1 pool; conexões do pool único (não 3×) |

## Escopo (Fatia 1 concluída)
Código do worker-runner pronto: `PoolRegistry`, `runWorkerGroup`, 4 `openXMysqlOnPool`, 6 factories (`GROUPS`), `run.ts`. Todos os 9 CAs verdes.

## Fatia 2 (deploy — ticket separado `CORE-WORKER-CONSOLIDATION-DEPLOY`)
- `compose.yaml`: 6 serviços de worker → 3 (`WORKER_GROUP=outbox|projections|email`), cada um exportando as envs do grupo + rodando `src/workers/runner/run.ts`.
- Taskdefs Fargate no ERP-INFRA: 6 → 3.
- Validação de shutdown/isolamento no x99.
- Opcional: reduzir os 6 `run.ts` standalone a delegação (remover a duplicação).

## DoD
Gate W3 verde + CA-9 no x99. Fatia 1 (código) de #407 concluída.
