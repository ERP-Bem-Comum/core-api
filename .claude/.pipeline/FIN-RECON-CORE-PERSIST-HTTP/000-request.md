# FIN-RECON-CORE-PERSIST-HTTP — escopo

**GitHub:** #123 (sub-issue da feature #60; entrega parte do #61) · **Branch:** `017-fin-conciliacao-bancaria` · **Size:** L

> Persistência + borda da **conciliação** (US2/US3/US4) sobre o domínio do #122 (`Reconciliation.confirm`/`undo`)
> e as transições `Payable.reconcile`/`unreconcile` (#122). Usa o extrato persistido (#120) e o título `Paid` (016).

## Em escopo (fatia vertical)

1. **Use-case** `confirmReconciliation(deps)(input)` — alvo central do W0:
   - `input = { transactionId, payableIds, difference?: { valueCents, treatment }, reconciledBy }`.
   - Fluxo: carrega transação (valor + `debit_account_ref` + status) → **guard FR-015** (`account-closed` se cedente `Closed`) →
     carrega snapshots dos títulos → domínio `Reconciliation.confirm` (R2 títulos `Paid`; R3 fechamento 100%) →
     **tx única**: persiste conciliação+itens, `Paid→Reconciled` nos títulos, transação `Pending→Reconciled` →
     `outbox.append(PayableReconciled[])`. Nunca automático (R1).
2. **Use-case** `undoReconciliation(deps)(input)` — `Active→Undone` (preserva registro, R7); títulos `Reconciled→Paid`;
   transação `Reconciled→Pending`; `outbox.append(ReconciliationUndone)`.
3. **Use-case** `searchPaidPayables(deps)(filter)` — read: lista títulos `status='Paid'` (alvo do GET).
4. **Ports** `ReconciliationRepository` (`confirm`/`findById`/`undo` — unit-of-work atômico), `PayableReconciliationView`
   (`findSnapshotsByIds`/`searchPaid`), extensão de `BankStatementRepository` (`findTransaction`) + in-memory de cada.
5. **Schema** `fin_reconciliations` + `fin_reconciliation_items` + `fin_rejected_suggestions`; **migration `0006`**
   (`db:generate:financial` + CHARSET/COLLATE).
6. **Adapters Drizzle** (tx única no `confirm`/`undo`; UPDATE condicional `WHERE status=...` com `affectedRows`).
7. **Borda HTTP** `POST /api/v2/financial/reconciliations`, `POST /…/:id/undo`, `GET /…/payables?status=Paid` + Zod +
   composition + error-mapping. Permissões `reconciliation:write`/`:read`.
8. **Outbox** `PayableReconciled`/`ReconciliationUndone` (públicos em `public-api/events.ts`; só produtor — ADR-0015).

## Fora de escopo

Match/score e rejeição de sugestão (#121 — `fin_rejected_suggestions` só ganha tabela aqui, sem use-case). Lançamento
manual/lote (#124). Fechar período/exportar (#125). Conciliação parcial avançada de juros/multa (#141 — só o campo
`difference` básico aqui).

## Critérios de aceite

- **CA1 (confirm individual)**: transação `Pending` + 1 título `Paid` de valor = transação → `Reconciliation` `Active`
  tipo `Individual`; título→`Reconciled`; transação→`Reconciled`; 1 evento `PayableReconciled`.
- **CA2 (confirm múltiplo)**: 2 títulos `Paid` somando = transação → tipo `Multiple`; 2 eventos.
- **CA3 (confirm parcial)**: títulos + `difference` = transação → tipo `Partial`; `difference` persistida.
- **CA4 (não balanceado)**: soma ≠ transação → `err('reconciliation-not-balanced')`; sem efeitos colaterais.
- **CA5 (título não Paid)**: título `Open` → `err('title-not-paid')`.
- **CA6 (guard FR-015)**: cedente `Closed` → `err('account-closed')`; nenhum write.
- **CA7 (undo)**: `Active`→`Undone` (registro preservado); títulos `Reconciled→Paid`; transação→`Pending`;
  1 evento `ReconciliationUndone`.
- **CA8 (undo já desfeito)**: → `err('reconciliation-already-undone')`.
- **CA9 (searchPaidPayables)**: retorna só títulos `status='Paid'`.
- **CA10 (HTTP)**: `POST /reconciliations` → 201; `POST /:id/undo` → 200; `GET /payables?status=Paid` → 200 lista;
  RBAC `reconciliation:write`/`:read`; separação de funções nos testes. (W1)
- **CA11 (integração, Docker)**: atomicidade da tx única (conciliação+itens+status do título+status da transação);
  UPDATE condicional não duplica conciliação; round-trip. (W1)

## Definition of Done

W0 RED (use-cases, no gate) → W1 GREEN (ports+in-memory+use-cases+schema+migration+Drizzle+HTTP) → W2 → W3
(gate sem Docker) + `test:integration:financial` (Docker) verde antes do merge. Migration por `db:generate:financial`.
Idioma EN (C1). Tasks: T026, T032–T039, T041, T042, T044–T046, T048, T049, T051–T053, T076–T078 (FR-015).
