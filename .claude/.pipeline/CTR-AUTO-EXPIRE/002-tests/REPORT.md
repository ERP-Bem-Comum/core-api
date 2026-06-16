# W0 — CTR-AUTO-EXPIRE — REPORT (RED) ✓

**Skill:** tdd-strategist · **Outcome:** RED · **Data:** 2026-06-16

## Testes criados

- `tests/modules/contracts/domain/contract/expire-guard.test.ts` — guarda D+1 (domínio puro).
- `tests/jobs/contracts/sweeper/sweeper.test.ts` — sweep one-shot (job, padrão ADR-0041).

## Resultado

```
node --test … expire-guard.test.ts sweeper.test.ts
→ tests 5 · pass 3 · fail 2
```

### RED 1 — guarda D+1 (CA2)

`expire(active, at == currentPeriod.end)` **deve** rejeitar `ContractCannotExpireYet`. **Falha hoje**: a guarda
`src/modules/contracts/domain/contract/contract.ts:251` usa `PlainDate.isBefore(atDate, end)` → expira em `at == end`.
A decisão D+1 da P.O. exige **rejeitar quando `at <= end`** (o último dia conta inteiro; só expira no dia seguinte).
Os 3 casos de **caracterização** passam (at>end expira · at<end rejeita · Indefinite rejeita) — fixam o comportamento a manter.

### RED 2 — sweep one-shot (CA1/CA5)

Import de `runSweep` (`src/jobs/contracts/sweeper/sweeper.ts`) → `ERR_MODULE_NOT_FOUND` (não existe). Define a API que o W1 implementa.

## API a implementar no W1

1. **Domínio:** endurecer `contract.ts:251` → `if (!PlainDate.isAfter(atDate, end)) return err(contractCannotExpireYet(...))` (rejeita `at <= end`).
2. **Port:** `ContractRepository.findExpirable(cutoff: PlainDate, limit: number): Promise<Result<readonly ActiveContract[], ContractRepositoryError>>` + adapters (in-memory + Drizzle com `FOR UPDATE SKIP LOCKED`).
3. **Job (ADR-0041):** `src/jobs/contracts/sweeper/{sweeper.ts,config.ts,run.ts}` — `runSweep(deps, config)`: `findExpirable(clock.today(), batchSize)` → para cada `expire(active, clock.now())` + `save(contract, [event])` → `Result<{ expired, scanned }>`.
4. **Persistência:** índice composto `(status, current_period_kind, current_period_end)` + migration (`pnpm run db:generate`).
5. **Timezone:** cutoff D+1 em `America/Sao_Paulo`.
6. **Script:** `package.json` `job:contracts:sweep`.

## Mapa CA → teste

| CA | Coberto por | Estado |
|---|---|---|
| CA1 (sweep expira + outbox) | sweeper.test.ts | 🔴 RED |
| CA2 (guarda `at <= end`) | expire-guard.test.ts | 🔴 RED |
| CA3 (Indefinite não expira) | expire-guard.test.ts | 🟢 (caracterização) |
| CA4 (vigência atual c/ aditivo) | domínio usa `currentPeriod`; teste explícito no W1 | ⏳ |
| CA5 (batchSize / `SKIP LOCKED`) | sweeper.test.ts (batch) + integração mysql no W1 | 🔴 RED (lote) / ⏳ (lock real) |
