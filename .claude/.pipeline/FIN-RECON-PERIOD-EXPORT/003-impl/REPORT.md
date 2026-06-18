# W1 — GREEN · FIN-RECON-PERIOD-EXPORT (#125)

**Skills:** ts-domain-modeler · ports-and-adapters · drizzle-schema-author · exporter Node puro · Fastify+Zod
**Resultado:** 🟢 GREEN · **Branch:** `017-fin-conciliacao-bancaria`

## Fatia vertical entregue (US6 — fechar período + exportar) — último ticket da feature

### Domínio

- `reconciliation-period-id.ts` (VO) + `period.ts`: `closePeriod` (FR-013: fecha só sem `Pending`; range válido)
  + evento `ReconciliationPeriodClosed`. `ReconciliationPeriod` (status Open|Closed, closedAt/By).

### Aplicação

- `close-reconciliation-period.ts` — conta `Pending` no range (via `listTransactionsByPeriod`) → domínio → persiste → outbox.
- `export-reconciliation.ts` — carrega período → lista transações do range → `exporter` (OFX/CSV).
- **Guard `period-closed` (R18)** ligado em `importBankStatement` / `confirmReconciliation` / `recordManualEntry` /
  `undoReconciliation` (consultam `periods.isClosed` antes de mutar). **Nota O1 atendida.**

### Persistência / borda

- **Ports** `ReconciliationPeriodStore` (`close`/`findById`/`isClosed`) + `ReconciliationExporter`; extensão
  `BankStatementRepository.listTransactionsByPeriod`. Adapters in-memory + Drizzle.
- `schemas/mysql.ts` — `fin_reconciliation_periods` (UNIQUE `(debit_account_ref, period_start, period_end)`) +
  **migration `0008`** (CHARSET/COLLATE manual). Mapper de período.
- Exporter `adapters/export/reconciliation-exporter.ts` — CSV via `toCsv` (RFC 4180 + anti-injeção) + OFX manual; totalizações.
- Borda `POST /reconciliation-periods/close` (`reconciliation:close`) + `GET /:id/export?format=ofx|csv`
  (`reconciliation:read`, resposta texto). Outbox `ReconciliationPeriodClosed`.

## Prova de verde

| Gate | Resultado |
| :--- | :--- |
| `pnpm run typecheck` | ✅ |
| `pnpm run format:check` | ✅ |
| `pnpm run lint` | ✅ |
| `pnpm test` (sem Docker) | ✅ **2843 pass / 0 fail** / 18 skipped (gated) |
| `pnpm run test:integration:financial` (Docker) | ✅ **32 pass / 0 fail** (CA7 período + demais) |

### Critérios de aceite

- **CA1–CA3** (domínio close: sem pendências→Closed; pendências→erro; range inválido→erro) — ✅ gate.
- **CA4** (guard `period-closed` bloqueia lançamento manual em período fechado) — ✅ gate (use-cases).
- **CA5** (export OFX/CSV com totalizações; formato inválido→erro; período inexistente→not-found) — ✅ gate.
- **CA6** (HTTP: close 200/422, export 200 text/csv, RBAC 403) — ✅ gate.
- **CA7** (integração: close persiste + UNIQUE re-close + `isClosed` por data + export) — ✅ Docker.

## Notas para W2

- **Guard R18 cross-cutting**: 4 use-cases consultam `periods.isClosed`. `import` checa início+fim do extrato;
  `confirm`/`manual` checam a data da transação; `undo` carrega a transação p/ a data (skip se não achada).
- **Reabertura de período** com justificativa (mencionada na US6) ficou fora — sem rota no contrato; follow-up.
- **`undo` ganhou deps** `statements`+`periods` (narrowing Pick). `confirmReconciliation.reconciliationRepo` segue `Pick<_,'confirm'>`.

## Próxima wave

W2 (`code-reviewer`) — audit read-only, máx. 3 rounds.
