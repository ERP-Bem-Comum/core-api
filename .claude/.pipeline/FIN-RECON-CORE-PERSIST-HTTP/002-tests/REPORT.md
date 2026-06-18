# W0 — RED · FIN-RECON-CORE-PERSIST-HTTP (#123)

**Agente:** tdd-strategist · **Resultado:** 🔴 RED · **Branch:** `017-fin-conciliacao-bancaria`

## Estratégia

Fatia vertical L: schema → repos → use-cases → borda HTTP → integração. **Alvo do W0** (gate-visível, puro de
Docker) são os **3 use-cases** que amarram o contrato sobre o domínio #122 (`Reconciliation.confirm`/`undo`):
`confirmReconciliation`, `undoReconciliation`, `searchPaidPayables`. Mapper/Drizzle/HTTP/índices entram no W1.

## Citação canônica (IX)

- **TDD (Beck)**, p. 3 (test-first).
- `.claude/rules/application.md`: "use cases são factory functions `(deps) => (input) => Promise<Result>`;
  validar → fetch → domain → persist → publish (eventos só após save ok)." — molde dos 3 use-cases.

## Arquivo de teste (RED)

- `tests/modules/financial/application/use-cases/reconciliation.use-cases.test.ts` — CA1–CA9 com fakes inline
  (reconciliationRepo / payables / statements / cedenteStore / outbox / clock).

## Prova RED

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../application/use-cases/confirm-reconciliation.ts'
ℹ tests 1 · pass 0 · fail 1
```

## Contrato esperado (alvo do W1)

- `confirmReconciliation(deps)(input)`:
  - `deps = { reconciliationRepo, payables: PayableReconciliationView, statements (findTransaction), cedenteStore, clock, outbox }`.
  - `input = { transactionId, payableIds, difference?, reconciledBy }`.
  - Fluxo: `statements.findTransaction` (valor+ref+status; `Pending`) → **guard FR-015** (`cedenteStore.findById`;
    `Closed`→`account-closed`) → `payables.findSnapshotsByIds` → `Reconciliation.confirm` (R2/R3) →
    `reconciliationRepo.confirm(reconciliation, transactionId)` (tx única: conciliação+itens + `Paid→Reconciled` +
    transação `Pending→Reconciled`) → `outbox.append(PayableReconciled[])`.
  - Erros: `statement-transaction-not-found` · `transaction-already-reconciled` · `cedente-account-not-found` ·
    `account-closed` · `payable-not-found` · `ReconciliationError` (`empty-reconciliation`/`title-not-paid`/
    `reconciliation-not-balanced`) · repo/view/outbox failures.
- `undoReconciliation(deps)(input)` — `findById` → `Reconciliation.undo` → `reconciliationRepo.undo` (tx única:
  `Reconciled→Paid` + transação `Reconciled→Pending`) → `outbox.append(ReconciliationUndone)`. `reconciliation-not-found`.
- `searchPaidPayables(deps)(filter)` — `payables.searchPaid()`.
- **Ports novos**: `ReconciliationRepository`, `PayableReconciliationView`; extensão `BankStatementRepository.findTransaction`.
- **Schema**: `fin_reconciliations` + `fin_reconciliation_items` + `fin_rejected_suggestions`; migration `0006`.
- **Outbox/events**: incluir `PayableReconciled`/`ReconciliationUndone` no union/append.
- **Borda HTTP**: `POST /reconciliations`, `POST /:id/undo`, `GET /payables?status=Paid`; permissões `reconciliation:write`/`:read`.

## Próxima wave

W1 (`ports-and-adapters` + `drizzle-schema-author` + padrão Fastify+Zod) — implementar a fatia até GREEN; HTTP test +
integração Docker (atomicidade da tx única + UPDATE condicional).
