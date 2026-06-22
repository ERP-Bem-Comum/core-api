# W1 — Implementação · FIN-RECON-MANUALENTRY-LOOKUP (#191)

**Outcome:** GREEN · **Data:** 2026-06-22

Fix de 1 linha em `adapters/persistence/mappers/reconciliation.mapper.ts`:

```ts
const toType = (raw: string): ReconciliationType | null =>
  raw === 'Individual' || raw === 'Multiple' || raw === 'Partial' || raw === 'ManualEntry'
    ? raw
    : null;
```

Alinha o rehydrator de persistência ao domínio `ReconciliationType` (que já inclui `ManualEntry`) e ao
`transactionReconciliationResponseSchema`. Sem mudança de domínio nem de schema.

**RED → GREEN:** `reconciliation-mapper.test.ts` passa (1/1). `pnpm test` fail 0 (zero regressão).
