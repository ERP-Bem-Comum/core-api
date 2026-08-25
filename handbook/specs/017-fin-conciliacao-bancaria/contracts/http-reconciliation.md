# Contrato HTTP — Conciliação Bancária

Borda `/api/v2/financial/` (Fastify + Zod/OpenAPI — ADR-0027/0033), alinhada ao plugin financial
existente (`adapters/http/plugin.ts`). Todos os corpos validados por schema Zod; erros mapeados em
`error-mapping.ts` (PT ao humano via `cli/formatters`). Datas ISO-8601; valores monetários em
**centavos** (inteiro). Auth obrigatória; permissões por rota abaixo.

## Permissões (novas)

`reconciliation:import` · `reconciliation:read` · `reconciliation:reconcile` ·
`reconciliation:undo` · `reconciliation:close`. **Separação de funções**: distintas de
`payable:transmit` (quem gera remessa não concilia — handbook §2).

---

## US1 — Importar extrato

### `POST /api/v2/financial/bank-statements`

- **Perm**: `reconciliation:import`.
- **Body**: `{ debitAccountRef: uuid, format: 'OFX'|'CSV', content: string (base64|texto) }`.
- **201**: `{ statementId, imported: number, duplicatesDiscarded: number, period: {start, end} }`.
- **Erros**: `400` (formato não suportado / corpo inválido), `422` (arquivo malformado — nada
  persistido, FR-003), `404` (`debitAccountRef` inexistente), `409` (período fechado — `period-closed`).

### `GET /api/v2/financial/bank-statements/:id/transactions`

- **Perm**: `reconciliation:read`. **Query**: `filter=todos|entradas|saidas|conciliados|pendentes`.
- **200**: `{ transactions: [{ id, fitid, date, movement, entryType, payeeName, memo, value,
balanceAfter, reconciliationStatus }] }`.

---

## US2 — Sugerir / confirmar / rejeitar match

### `GET /api/v2/financial/statement-transactions/:id/suggestions`

- **Perm**: `reconciliation:read`.
- **200**: `{ suggestions: [{ payableId, score: 0..100, band: 'alta'|'media', criteria {...} }] }`
  (band `baixa` < 50 **não** retornada — R1/FR-011). Computado sob demanda (read-model).

### `POST /api/v2/financial/reconciliations`

- **Perm**: `reconciliation:reconcile`.
- **Body**: `{ transactionId: uuid, payableIds: uuid[1..N], difference?: { value: int, treatment:
'Interest'|'Penalty'|'Discount'|'Fee'|'Partial' } }`. `type` é derivado (1 título = `Individual`;
  N = `Multiple`; com `difference` = `Partial`).
- **201**: `{ reconciliationId, type, transactionId, items: [{ payableId, reconciledValue }],
status: 'Active' }`. Efeito: títulos `Paid→Reconciled`, transação `Reconciled`, `PayableReconciled`
  por título no outbox.
- **Erros**: `409 title-not-paid` (R2), `409 transaction-already-reconciled`, `422
reconciliation-not-balanced` (R3 — soma ≠ valor sem tratamento), `404` (transação/título inexistente).

### `POST /api/v2/financial/statement-transactions/:id/reject-suggestion`

- **Perm**: `reconciliation:reconcile`. **Body**: `{ payableId }`. **204**. Persiste rejeição
  (não reaparece). Evento UX `MatchRejeitado` (não-outbox).

---

## US3 — Desfazer (Unreconcile)

### `POST /api/v2/financial/reconciliations/:id/undo`

- **Perm**: `reconciliation:undo`. **Body**: `{ reason?: string }`.
- **200**: `{ reconciliationId, status: 'Undone' }`. Efeito: título(s) `Reconciled→Paid`, transação
  `Pending`, `Reconciliation` preservada como `Undone` (R7), `ReconciliationUndone` no outbox.
- **Erros**: `409 reconciliation-already-undone`, `409 period-closed` (R18).

---

## US4 — Múltiplo / parcial

Coberto por `POST /reconciliations` (acima) com `payableIds` de tamanho N e/ou `difference`. A
busca manual de títulos `Paid` para selecionar:

### `GET /api/v2/financial/payables?status=Paid&...filtros`

- **Perm**: `reconciliation:read`. **Query**: `supplierRef, documentNumber, description, from, to,
type, minValue, maxValue`. **200**: lista de títulos `Paid` elegíveis (FR-012).

---

## US5 — Lançamento manual / lote

### `POST /api/v2/financial/statement-transactions/:id/manual-entry`

- **Perm**: `reconciliation:reconcile`.
- **Body**: `{ type: 'Payment'|'Receipt'|'Transfer'|'FeePenaltyInterest'|'Investment'|
'Redemption', supplierRef?, categoryRef?, costCenterRef?, programRef?, description? }`.
- **201**: `{ reconciliationId, type: 'ManualEntry', manualEntryId }`. Efeito: transação
  `Reconciled`, `ManualEntryRecorded` no outbox.

### `POST /api/v2/financial/reconciliations/batch`

- **Perm**: `reconciliation:reconcile`. **Body**: `{ transactionIds: uuid[], template: {...manual
entry} }`. **201**: `{ created: number, reconciliationIds: uuid[] }`. Confirma o `LoteSugerido`.

---

## US6 — Fechar período / exportar

### `POST /api/v2/financial/reconciliation-periods/close`

- **Perm**: `reconciliation:close`. **Body**: `{ debitAccountRef, periodStart, periodEnd }`.
- **200**: `{ periodId, status: 'Closed' }`. `ReconciliationPeriodClosed` no outbox.
- **Erros**: `422 period-has-pending-transactions` (FR-013).

### `GET /api/v2/financial/reconciliation-periods/:id/export`

- **Perm**: `reconciliation:read`. **Query**: `format=ofx|csv` (XLSX/PDF fora do escopo — D-FORMATS).
- **200**: arquivo (texto OFX/CSV) com totalizações.

---

## Backward-compat

Todas as rotas são **aditivas**; nenhuma rota/contrato existente do financial muda. Versão `v2`
mantida. Schemas Zod novos em `adapters/http/schemas.ts`.
