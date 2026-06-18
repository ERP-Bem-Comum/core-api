# FIN-RECON-CORE-DOMAIN — escopo

**GitHub:** #122 (sub-issue da feature #60; também entrega parte do #61 — desfazimento) · **Size:** M
**Spec:** `specs/017-fin-conciliacao-bancaria/`

> **Nota de sequência:** reordenado para **antes** do #120/#121. Motivo: o #120 (persistência+HTTP)
> precisa de infra MySQL/Docker + da conta-cedente da **016** (`fin_cedente_accounts`, ainda não
> implementada). Este ticket é **domínio puro, desbloqueado** — o coração do BC (reconcile/unreconcile).
> Persistência (#120/#123), match (#121) e os tickets DB-heavy seguem quando a infra/016 estiver pronta.
>
> **Handoff registrado p/ #120 (achado W2 do #119):** normalizar `entryType` bruto → union EN (ou
> `Other`) antes de persistir (CHECK de `fin_statement_transactions.entry_type`). Incorporar no `000-request.md` do #120.

## Objetivo

Modelar, em **domínio puro** (`src/modules/financial/domain/reconciliation/` + transição no
`domain/payable/`), o agregado `Reconciliation` e as transições de título `Paid↔Reconciled`.

## Em escopo

1. **VO `ReconciliationId`** (branded, padrão module-as-namespace).
2. **Transições no payable** (`domain/payable/payable.ts`):
   - `reconcile(p): Result<Payable, 'title-not-paid'>` — `Paid→Reconciled`.
   - `unreconcile(p): Result<Payable, 'title-not-reconciled'>` — `Reconciled→Paid`.
3. **Agregado `Reconciliation`** (`reconciliation/reconciliation.ts`), referencia transação/títulos **por id**:
   - `confirm(input): Result<{ reconciliation; events }, ReconciliationError>`:
     - `type` derivado: 1 título sem diferença = `Individual`; N = `Multiple`; com `difference` = `Partial`.
     - **R2**: todo `PayableSnapshot.status === 'Paid'` senão `title-not-paid`.
     - **R3**: `Σ items.reconciledValueCents + (difference?.valueCents ?? 0) === transactionValueCents`
       senão `reconciliation-not-balanced`.
     - `items` = um por título (valor cheio do título); emite `PayableReconciled` **por item**.
     - sem títulos → `empty-reconciliation`.
   - `undo(reconciliation, { undoneBy, occurredAt, reason? }): Result<{ reconciliation; events }, ReconciliationError>`:
     - **R7**: status `Active→Undone` (NUNCA deleta); preenche `audit.undoneAt/By`; emite `ReconciliationUndone`.
     - já `Undone` → `reconciliation-already-undone`.
4. **Eventos** (`reconciliation/events.ts`): `PayableReconciled`, `ReconciliationUndone` (EN-passado, discriminados por `type`).

Valores/enums em **EN** (C1). `DifferenceTreatment = 'Interest'|'Penalty'|'Discount'|'Fee'|'Partial'`.

## Fora de escopo

`Batch`/`ManualEntry` (#124). Persistência/tx/outbox/HTTP (#123). Score/sugestão (#121).

## Critérios de aceite

- **CA1 (Individual)**: 1 título `Paid` (R$ 80,00) + transação R$ 80,00 → `ok`, type `Individual`, 1
  `PayableReconciled`, reconciliation `Active`.
- **CA2 (Multiple)**: 2 títulos `Paid` (60 + 40) + transação 100 → `ok`, type `Multiple`, 2 `PayableReconciled`.
- **CA3 (R2)**: título não-`Paid` (`Approved`) → `err('title-not-paid')`.
- **CA4 (R3)**: soma dos títulos ≠ transação, sem `difference` → `err('reconciliation-not-balanced')`.
- **CA5 (Partial)**: título 8000 + `difference` 450 `Interest` = transação 8450 → `ok`, type `Partial`.
- **CA6 (vazio)**: sem títulos → `err('empty-reconciliation')`.
- **CA7 (undo/R7)**: reconciliation `Active` → `undo` → `Undone` (preservado), `audit.undoneBy` setado, 1 `ReconciliationUndone`.
- **CA8 (undo idempotência)**: `undo` em já-`Undone` → `err('reconciliation-already-undone')`.
- **CA9 (payable transitions)**: `reconcile` em `Paid`→`Reconciled`; em não-`Paid`→`title-not-paid`;
  `unreconcile` em `Reconciled`→`Paid`; em não-`Reconciled`→`title-not-reconciled`.

## Definition of Done

W0 RED → W1 GREEN (`ts-domain-modeler`) → W2 review → W3 gate verde. Domínio puro: `Result<T,E>`, sem
`throw`/`class`, branded types, erros string-literal-union EN. Citação IX: D-TRANSITION (Vernon p.450,
já em `research.md`); TDD (Beck) no W0.
