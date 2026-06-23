# W1 — Implementação · FIN-59a-2-MANUAL-PAYMENT-HTTP (#224)

**Outcome:** GREEN · **Data:** 2026-06-23

Borda HTTP da baixa manual (sobre o use-case do #223).

- **Zod** `schemas.ts`: `documentPayableParamsSchema` (id + payableId) + `manualPaymentBodySchema`
  (version + reason? opcional).
- **Plugin** `plugin.ts`: rota `POST /financial/documents/:id/payables/:payableId/manual-payment`,
  RBAC `FINANCIAL_PERMISSION.payableApprove`; actor = `req.userId`; `expectedVersion = body.version`;
  → `deps.registerManualPayment` → `loadAndSerialize` (devolve o documento com o título Pago).
- **Composição**: `FinancialHttpDeps.registerManualPayment` + `registerManualPayment(deps)` no makeDeps
  (deps base já tem repo + clock).

**Testes:** HTTP (2) — baixa do título pai (200, pai Pago/filhos Aprovados) + RBAC 403. Reusa o use-case
(domínio/persistência já cobertos no #223).

Gate: typecheck/format/lint ✅; `pnpm test` fail 0; `test:integration:financial` **53/53** (sem regressão).
