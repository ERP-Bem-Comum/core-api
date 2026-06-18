# FIN-RECON-MANUAL-BATCH — escopo

**GitHub:** #124 (sub-issue da feature #60) · **Branch:** `017-fin-conciliacao-bancaria` · **Size:** M/L

> Lançamento **manual** (transação sem título — ex.: tarifa) + conciliação em **lote** (US5). Cria
> `Reconciliation` tipo `ManualEntry` e transação `Reconciled`; publica `ManualEntryRecorded`.

## Decisão A1 (analyze) — critério de agrupamento do lote

`confirmBatch` é **dirigido pelo operador**: recebe `transactionIds[]` explícitos + um `template` de
lançamento manual, e cria N conciliações `ManualEntry` numa operação. A **auto-detecção** de padrões
recorrentes (`LoteSugerido`, FR-014) é **read/UX diferida** (sem endpoint de sugestão aqui — espelha o
tratamento de `MatchSugerido` no #121). Não há agrupamento automático nesta fatia.

## Em escopo (fatia vertical)

1. **Domínio** `confirmManualEntry` (`domain/reconciliation/manual-entry.ts`) — alvo do W0:
   - VO `ManualEntryId`; `ManualEntryType ∈ Payment|Receipt|Transfer|FeePenaltyInterest|Investment|Redemption`.
   - Cria `Reconciliation` tipo `ManualEntry` (`items: []`, `manualEntry` no boundary), `status Active`;
     emite `ManualEntryRecorded`. Guard `manual-entry-value-not-positive` (valor > 0).
2. **Extensão** do agregado `Reconciliation` (#122): campo `manualEntry: ManualEntry | null` + type `ManualEntry`.
3. **Use-cases** `recordManualEntry(deps)(input)` (carrega transação `Pending` → guard FR-015 → `confirmManualEntry`
   com `valueCents` da transação → persiste tx única → outbox) e `confirmBatch(deps)(input)` (N transações × template).
4. **Schema** `fin_manual_entries` + **migration `0007`** (`db:generate:financial` + CHARSET/COLLATE).
5. **Adapters** in-memory + Drizzle: persistir manual entry + conciliação + flip transação `Pending→Reconciled`
   (unit-of-work, espelha #123, mas **sem** flip de título).
6. **Borda HTTP** `POST /api/v2/financial/statement-transactions/:id/manual-entry` (201) e
   `POST /api/v2/financial/reconciliations/batch` (201) + Zod + dto + error-mapping. Permissão `reconciliation:write`.
7. **Outbox** `ManualEntryRecorded` (público em `public-api/events.ts`).

## Fora de escopo

`LoteSugerido` auto-detecção (UX/futuro). Fechar período + exportar (#125). Undo de manual entry reusa o `undo`
do #123 (sem trabalho novo aqui além de garantir compatibilidade).

## Critérios de aceite

- **CA1 (domínio manual entry)**: `confirmManualEntry` válido → `Reconciliation` tipo `ManualEntry`, `items=[]`,
  `manualEntry` preenchido, `status Active`, 1 evento `ManualEntryRecorded` com `valueCents`.
- **CA2 (guard valor)**: valor ≤ 0 → `err('manual-entry-value-not-positive')`.
- **CA3 (recordManualEntry)**: transação `Pending` + guard FR-015 (cedente não `Closed`) → conciliação criada;
  transação `Reconciled`; evento no outbox. Transação já conciliada → `transaction-already-reconciled`.
- **CA4 (confirmBatch)**: N transações `Pending` + template → N conciliações `ManualEntry`; `created=N`.
- **CA5 (HTTP)**: `POST /manual-entry` → 201 `{ reconciliationId, type:'ManualEntry', manualEntryId }`;
  `POST /reconciliations/batch` → 201 `{ created, reconciliationIds }`; RBAC `reconciliation:write`. (W1)
- **CA6 (integração, Docker)**: unit-of-work — `fin_manual_entries` + `fin_reconciliations` + transação `Reconciled`
  na mesma tx; round-trip. (W1)

## Definition of Done

W0 RED (domínio, no gate) → W1 GREEN (extensão Reconciliation + use-cases + schema + migration 0007 + adapters +
HTTP) → W2 → W3 (gate sem Docker) + `test:integration:financial` (Docker) verde. Idioma EN (C1). Tasks: T054–T062.
