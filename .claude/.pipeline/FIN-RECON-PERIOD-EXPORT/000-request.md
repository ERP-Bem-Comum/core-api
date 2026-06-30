# FIN-RECON-PERIOD-EXPORT — escopo

**GitHub:** #125 (sub-issue da feature #60 — **último ticket**) · **Branch:** `017-fin-conciliacao-bancaria` · **Size:** M/L

> Fechamento de período (US6): "selo" contábil. Fecha um período só com tudo conciliado/justificado;
> período fechado **bloqueia** importação/conciliação/desfazimento (R18); exporta a conciliação em OFX/CSV.

## Nota O1 (analyze)

O guard `period-closed` referenciado por US1 (importar) / US3 (desfazer) **só passa a valer com este ticket**.
Logo, #125 também **liga o guard** nos use-cases que mutam um período: `importBankStatement`,
`confirmReconciliation`, `recordManualEntry`, `undoReconciliation`.

## Em escopo (fatia vertical)

1. **Domínio** `closePeriod` (`domain/reconciliation/period.ts`) — alvo do W0 (T063):
   - VO `ReconciliationPeriodId`; range válido (`period_start ≤ period_end` → `invalid-period-range`).
   - `closePeriod(input)`: se há transação `Pending` no período → `period-has-pending-transactions`; senão
     `ReconciliationPeriod` `Closed` + evento `ReconciliationPeriodClosed`.
2. **Port** `ReconciliationPeriodStore` (`isClosed(debitAccountRef, date)`, `close(period)`, `findById`) + repos
   in-memory/Drizzle; **Port** `ReconciliationExporter` (OFX/CSV, Node puro sem lib) + adapter.
3. **Use-cases** `closeReconciliationPeriod` (conta transações `Pending` no range via repo → domínio → persiste →
   outbox) e `exportReconciliation` (lê transações conciliadas do período → OFX/CSV com totalizações).
4. **Guard `period-closed`** nos use-cases mutantes (import/confirm/manual/undo): consulta `isClosed` antes de agir.
5. **Schema** `fin_reconciliation_periods` (+ UNIQUE `(debit_account_ref, period_start, period_end)`) + **migration `0008`**.
6. **Borda HTTP** `POST /api/v2/financial/reconciliation-periods/close` (`reconciliation:close`) +
   `GET /…/:id/export?format=ofx|csv` (`reconciliation:read`) + Zod + error-mapping.
7. **Outbox** `ReconciliationPeriodClosed` (público em `public-api/events.ts`).

## Fora de escopo

Reabertura de período com justificativa (mencionada na US6, mas sem rota no contrato — follow-up). Export XLSX/PDF
(FR-016, exige lib). Filtros avançados de export.

## Critérios de aceite

- **CA1 (domínio close)**: período sem `Pending` → `ReconciliationPeriod` `Closed` + evento `ReconciliationPeriodClosed`.
- **CA2 (pendências)**: há transação `Pending` no range → `err('period-has-pending-transactions')`.
- **CA3 (range)**: `period_start > period_end` → `err('invalid-period-range')`.
- **CA4 (guard period-closed)**: importar/conciliar/manual/desfazer em período `Closed` → `err('period-closed')`.
- **CA5 (export)**: período conciliado → OFX e CSV (texto) com as transações + totalizações; `unsupported-format` fora de {ofx,csv}.
- **CA6 (HTTP)**: `POST /reconciliation-periods/close` → 200 `{ periodId, status:'Closed' }` (422 se pendências);
  `GET /:id/export?format=ofx|csv` → 200 arquivo. RBAC `reconciliation:close`/`:read`. (W1)
- **CA7 (integração, Docker)**: close persiste período (UNIQUE), guard `period-closed` rejeita import no período fechado. (W1)

## Definition of Done

W0 RED (domínio close, no gate) → W1 GREEN (port/store/exporter + use-cases + guard wiring + schema + migration 0008 +
HTTP) → W2 → W3 (gate sem Docker) + `test:integration:financial` (Docker) verde. Idioma EN (C1). Tasks: T063–T071.
