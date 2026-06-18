# W0 — RED · FIN-RECON-PERIOD-EXPORT (#125)

**Agente:** tdd-strategist · **Resultado:** 🔴 RED · **Branch:** `017-fin-conciliacao-bancaria`

## Estratégia

Último ticket (US6). Fatia M/L: domínio período → store/exporter → use-cases (close/export) → guard wiring →
schema+migration → borda HTTP. **Alvo do W0** (gate, puro): o **domínio `closePeriod`** (T063) — regra FR-013
(fecha só sem pendências) + range válido. Store/exporter/use-cases/guard/HTTP entram no W1.

## Citação canônica (IX)

- **spec.md US6** (`:188`): período fechado não aceita novas importações nem alterações (`period-closed`);
  fechar exige tudo conciliado/justificado (`period-has-pending-transactions`); export OFX/CSV.
- **data-model.md** (`:151`): `fin_reconciliation_periods` (debit_account_ref, period_start/end, status Open|Closed,
  closed_at/by; UNIQUE `(debit_account_ref, period_start, period_end)`).

## Arquivo de teste (RED)

- `tests/modules/financial/domain/reconciliation/period.test.ts` — CA1 (close sem pendências + evento),
  CA2 (pendências → erro), CA3 (range inválido → erro).

## Prova RED

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../domain/reconciliation/reconciliation-period-id.ts'
ℹ tests 1 · pass 0 · fail 1
```

## Contrato esperado (alvo do W1)

- `domain/reconciliation/reconciliation-period-id.ts` (VO) + `period.ts`:
  `closePeriod(input) → Result<{ period (status 'Closed', closedAt/By), events: [ReconciliationPeriodClosed] },
  'invalid-period-range' | 'period-has-pending-transactions'>`.
- Evento `ReconciliationPeriodClosed` (+ union outbox/public-api).
- Ports `ReconciliationPeriodStore` (`isClosed`/`close`/`findById`) + `ReconciliationExporter` (OFX/CSV puro) + adapters.
- Use-cases `close-reconciliation-period.ts` (conta `Pending` no range → domínio → persiste → outbox) e
  `export-reconciliation.ts`.
- **Guard `period-closed`** em `importBankStatement`/`confirmReconciliation`/`recordManualEntry`/`undoReconciliation`.
- Schema `fin_reconciliation_periods` + migration `0008`; borda HTTP close/export.

## Próxima wave

W1 (`ts-domain-modeler` p/ domínio; `ports-and-adapters` + `drizzle-schema-author` p/ persistência; `nodejs-fs-scripter`/puro p/ exporter OFX-CSV; Fastify+Zod p/ borda).
