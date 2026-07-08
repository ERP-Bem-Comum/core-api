# W0 — Testes RED · PAR-CONTRACT-COUNT-BACKFILL (#110)

**Agente:** skill `tdd-strategist` · **Outcome:** RED (por inexistência da API)

## Fundamento canônico (acdg-skills)

> "In idempotent operations, the outcome doesn't change after the first application, even if the operation is subsequently applied multiple times."
> — Sam Newman, *Building Microservices*, p.500 (`shared-references/architecture/building-microservices--sam-newman.md:6572`, grounding 2/2 verificado)

É o fundamento do **CA2**: o backfill recompõe o valor **absoluto** (`setCount`), não soma delta — re-execução converge ao mesmo estado.

## Semântica travada no recon (fonte da verdade p/ CA1)

`applyContractCountEvent` (`src/modules/partners/application/use-cases/apply-contract-count-event.ts:24`): `ContractCreated → +1`, `ContractEnded`/`ContractCancelled → −1`. Logo `activeCount(ref) = #{Created} − #{Ended+Cancelled}` = contratos vivos por contraparte. O read novo no `contracts/public-api` (W1) deve espelhar isso.

## Testes escritos (RED)

`tests/jobs/partners/contract-count-backfill.test.ts` — lógica **pura** de `backfillContractCounts`:

1. **CA1** — recompõe contagem absoluta por contraparte (`applied=2`, `getCount(a)=2`, `getCount(b)=1`).
2. **CA2** — idempotência: rodar 2× mantém `getCount(a)=2` (se fosse `applyDelta` → 4).
3. **Reconcilia drift (#129)** — seed `{a:99}` + backfill `{a:2}` → `getCount(a)=2` (absoluto, nunca 101).

## Prova de RED

```
✖ tests/jobs/partners/contract-count-backfill.test.ts
  code: 'ERR_MODULE_NOT_FOUND'
  url: '.../src/jobs/partners/contract-count-backfill/backfill.ts'
ℹ pass 0 · fail 1
```

Falha por inexistência de `backfill.ts` + método `setCount` no `ContractCountStore` — API a implementar no W1.

## Decisão de pirâmide (test-pyramid)

A regra de contagem do read do `contracts/public-api` é uma **query `GROUP BY` sobre `ctr_*`** → coberta por **teste de integração** (contra MySQL) no W3 (`test:integration`), não por unit. O unit do W0 cobre a lógica de aplicação (setCount absoluto/idempotente/reconciliador), que é onde vive o risco de CA2.

## Escopo a implementar no W1

- `ContractCountStore.setCount({contractorRef, activeCount})` — port + adapters `.in-memory.ts` e `.drizzle.ts` (`INSERT … ON DUPLICATE KEY UPDATE activeCount = <absoluto>`).
- `contracts/public-api` — read de contagem de contratos vivos por `contractorRef`.
- `src/jobs/partners/contract-count-backfill/{backfill.ts, run.ts}` — lógica pura + composition root (env `PARTNERS_DATABASE_URL` + `CONTRACTS_DATABASE_URL`).
