# W1 — Implementação · FIN-59a-1-MANUAL-PAYMENT (#223)

**Outcome:** GREEN · **Data:** 2026-06-23

Baixa manual de título por título (carve-out do #59, sem CNAB).

- **Domínio** `document.ts`: op `payPayableManually(ApprovedDocument, payables, payableId, by, at, reason?)`
  → flipa UM título `Approved→Paid` (irmãos intactos), evento `PayableManuallyPaid`. Documento segue
  `Approved` (rollup p/ Pago é fatia futura). Guards `payable-not-found`/`payable-not-approved`.
- **Evento** `events.ts`: `PayableManuallyPaid` (+ union + `DOCUMENT_EVENT_TYPES` + `TIMELINE_EVENT_TYPES`
  exaustivos — entra na trilha do operador).
- **Erros** `errors.ts`: `payable-not-found` + `payable-not-approved`.
- **Migration `0020`**: relaxa `ck_fin_tl_event_type` p/ incluir `PayableManuallyPaid` (a baixa aparece
  na trilha; coluna `event_type` tem CHECK).
- **Use-case** `register-manual-payment.ts`: rehydrate ids → findById → `parseApproved` → `payPayableManually`
  → trilha (actor) → `repo.save(agg, entries, expectedVersion, events)` (evento na MESMA tx — #127).

**Testes:** domínio (4) + use-case (3, in-memory) + integração Drizzle (1, no runner) — prova a migration
(trilha aceita `PayableManuallyPaid`) + persistência por-payable (pai `Paid`, filhos `Approved`).
Gate: typecheck/format/lint ✅; `pnpm test` fail 0; `test:integration:financial` **53/53**.
