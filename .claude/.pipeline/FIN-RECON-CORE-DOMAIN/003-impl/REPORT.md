# W1 — GREEN · FIN-RECON-CORE-DOMAIN (#122)

**Agente:** ts-domain-modeler · **Resultado:** 🟢 GREEN (12/12 testes do ticket)

## Arquivos criados (domínio puro)

- `domain/reconciliation/reconciliation-id.ts` — branded `ReconciliationId`.
- `domain/reconciliation/types.ts` — `Reconciliation`, `PayableSnapshot`, `ReconciliationItem`, `Difference`, `ReconciliationAudit`, `Confirm/Undo Input/Output` (enums **EN** — C1).
- `domain/reconciliation/events.ts` — `PayableReconciled` + `ReconciliationUndone` (EN-passado).
- `domain/reconciliation/errors.ts` — `ReconciliationError` (4 variantes EN kebab-case).
- `domain/reconciliation/reconciliation.ts` — `confirm` + `undo`.
- `domain/payable/payable.ts` — `reconcile` (`Paid→Reconciled`) + `unreconcile` (`Reconciled→Paid`).

## Prova GREEN

```
▶ reconciliation — confirm   ✔ CA1–CA6 (Individual/Multiple/Partial, R2, R3, empty)
▶ reconciliation — undo      ✔ CA7/CA8 (R7 preserva, already-undone)
▶ payable — reconcile/unreconcile  ✔ CA9
ℹ tests 12 · pass 12 · fail 0
```

Sanity adiantado: `typecheck` ✅ e `lint` ✅ (após corrigir 2 nits **no arquivo de teste**:
`exactOptionalPropertyTypes` no `difference` opcional → spread condicional; `ReadonlyArray<T>` → `readonly T[]`).

## Decisões de implementação

- **`confirm`**: `empty-reconciliation` se vazio; R2 (todo snapshot `Paid` senão `title-not-paid`);
  `items` = valor cheio por título; R3 (`Σ itens + diferença === transação` senão
  `reconciliation-not-balanced`); `type` derivado (diferença→`Partial`; N→`Multiple`; 1→`Individual`);
  1 `PayableReconciled`/item. **R1 (nunca automático)**: a operação só roda sob comando do use-case (#123).
- **`undo`**: `Active→Undone` via cópia (`{...rec, status:'Undone', audit:{...}}`) — **nunca deleta** (R7);
  `already-undone` se repetido; 1 `ReconciliationUndone`.
- **payable**: transições puras por cópia imutável; erros `title-not-paid`/`title-not-reconciled`.
- Pureza: `Result<T,E>`, sem `throw`/`class`; `immutable<T>`/`readonly`; referência a título/transação
  **por id** (D-AGGREGATES, Vernon p.458).

## Escopo respeitado

`Batch`/`ManualEntry` (#124), persistência/tx/outbox/HTTP (#123), match (#121) **fora**. A reversão do
status do título no desfazimento é orquestração do use-case (#123) via `payable.unreconcile`.

## Próxima wave

W2 (skill `code-reviewer`) — audit read-only.
