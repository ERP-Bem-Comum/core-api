# W0/W1 · FIN-COUNTERPART-UNDO (US3 · spec 029 · #269)

> **Outcome:** RED→GREEN por fatia TDD. Skills `tdd-strategist` (W0) + `ts-domain-modeler` (W1). Módulo `financial`.

## Feito (GREEN)

### Domínio `discard`/`reopen` (T028/T030)
- Teste `tests/modules/financial/domain/expected-counterpart/discard.test.ts` (4 casos).
- `discard(counterpart)`: `Pending → Discarded` (terminal) + `TransferCounterpartDiscarded(reason='undo-origin')`; não-Pending → `counterpart-not-pending`.
- `reopen(counterpart)`: `Matched → Pending` (limpa `matchedTransactionRef`, libera novo match); não-Matched → `counterpart-not-matched` (novo erro). Sem evento próprio (o `ReconciliationUndone` da perna B carrega a trilha).

### Application `undoReconciliation` estendido (T029/T031)
- Teste `tests/modules/financial/application/use-cases/undo-reconciliation-counterpart.test.ts` (fluxo real record → [confirm] → undo).
- Ao desfazer a conciliação de ORIGEM (A), localiza a contrapartida por `origin_reconciliation_ref`:
  - **CA1** Pending → `discard` (Discarded; nada órfão em B).
  - **CA2** Matched → `reopen` (Pending) + desfaz a perna B casada (`findActiveByTransaction(matchedTransactionRef)` → `undo` do domínio) → tx B volta a `Pending`.
  - Sem contrapartida (ou já Discarded) → `undo` normal (back-compat).

### Método atômico `ReconciliationRepository.undoCounterpartOrigin`
- Port + in-memory (stores compartilhados) + Drizzle (1 tx: UPDATE A→Undone + tx A→Pending + contrapartida (Discarded/Pending) + opcional B→Undone + tx B→Pending + outbox).

## Não-regressão
Mudança de assinatura (`undoReconciliation` ganha `expectedCounterpartStore` + Pick expandido do repo) ajustada em 4 testes (http-reconciliation, reconciliation-repository.drizzle-mysql, period.use-cases, reconciliation.use-cases). Suíte **3959 pass, 0 fail**.
