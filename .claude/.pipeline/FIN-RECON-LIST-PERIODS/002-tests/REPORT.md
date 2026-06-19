# W0 — Testes RED · FIN-RECON-LIST-PERIODS (#173)

**Agente**: tdd-strategist · **Data**: 2026-06-19 · branch `feat/fin-recon-list-periods`.

Listar períodos de conciliação por conta (obter periodId p/ exportar OFX/CSV fora do fechamento).
`ReconciliationPeriodStore` tinha `close`/`findById`/`isClosed` mas **não** `listByAccount` → S-M (não só rota).

| Camada | Teste RED |
| --- | --- |
| Application | `use-cases/list-reconciliation-periods.test.ts` (2 casos): lista da conta; conta sem períodos → vazio |
| Borda HTTP | `adapters/http/list-periods.http.test.ts` (smoke): sem períodos → 200 `[]`; sem `reconciliation:read` → 403 |
