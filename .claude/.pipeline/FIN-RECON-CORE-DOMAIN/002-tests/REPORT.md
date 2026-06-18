# W0 — RED · FIN-RECON-CORE-DOMAIN (#122)

**Agente:** tdd-strategist · **Resultado:** 🔴 RED (testes falham por inexistência da API)

## Citação canônica (IX)

- **TDD (Beck)**, p. 3 (mesma base do #118): o teste falha primeiro; a API nasce no W1.
- **DDD (Vernon)**, p. 450 (D-TRANSITION, em `research.md`): a invariante "título conciliado ⇒
  conciliação ativa" é *true invariant* (consistência transacional) — modelada neste agregado.

## Arquivos de teste (RED)

- `tests/modules/financial/domain/reconciliation/reconciliation.test.ts` — `confirm` (CA1–CA6) + `undo` (CA7/CA8).
- `tests/modules/financial/domain/payable/payable-reconcile.test.ts` — `reconcile`/`unreconcile` (CA9).

## Prova RED

```
✖ payable-reconcile.test.ts    ERR_MODULE_NOT_FOUND .../domain/payable/payable.ts
✖ reconciliation.test.ts       ERR_MODULE_NOT_FOUND .../domain/reconciliation/reconciliation-id.ts
ℹ tests 2 · pass 0 · fail 2
```

## Contrato esperado (alvo do W1)

### `domain/reconciliation/`
- `reconciliation-id.ts` — branded `ReconciliationId` (module-as-namespace).
- `types.ts` — `ReconciliationType = 'Individual'|'Multiple'|'Partial'`, `ReconciliationStatus = 'Active'|'Undone'`, `DifferenceTreatment`, `PayableSnapshot {id,status,valueCents}`, `ReconciliationItem`, `Reconciliation` (com `audit {reconciledAt,reconciledBy,undoneAt?,undoneBy?,undoReason?}`), `ConfirmInput`, `ConfirmOutput`, `UndoInput`, `UndoOutput`.
- `events.ts` — `PayableReconciled` (por item) + `ReconciliationUndone` (EN-passado, discriminados por `type`).
- `errors.ts` — `ReconciliationError = 'title-not-paid' | 'reconciliation-not-balanced' | 'reconciliation-already-undone' | 'empty-reconciliation'`.
- `reconciliation.ts`:
  - `confirm(input): Result<ConfirmOutput, ReconciliationError>` — type derivado; R2 (todo snapshot `Paid`); R3 (Σ itens + diferença = transação); 1 `PayableReconciled`/item; vazio → `empty-reconciliation`.
  - `undo(reconciliation, {undoneBy, occurredAt, reason?}): Result<UndoOutput, ReconciliationError>` — `Active→Undone` (R7, preserva); já-`Undone` → `reconciliation-already-undone`; emite `ReconciliationUndone`.

### `domain/payable/payable.ts`
- `reconcile(p: Payable): Result<Payable, 'title-not-paid'>` — `Paid→Reconciled`.
- `unreconcile(p: Payable): Result<Payable, 'title-not-reconciled'>` — `Reconciled→Paid`.

Enums em **EN** (C1). Domínio puro: `Result<T,E>`, sem `throw`/`class`, branded, erros string-literal-union EN.

## Próxima wave

W1 (skill `ts-domain-modeler`) — implementar agregado + transições + eventos até GREEN. **Sem**
persistência/tx/outbox/HTTP (#123), match (#121), Batch/ManualEntry (#124).
