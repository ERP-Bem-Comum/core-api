# W0 — Testes RED (REPORTS-PAYMENT-POSITION · #243 · REP-4)

**Outcome:** RED (falha por inexistência da API). Skill: `tdd-strategist`.

## Testes escritos

### Borda HTTP (`fastify.inject`, memory)
`tests/modules/reports/adapters/http/payment-position.http.test.ts`
- **CA1** — 200 com linhas por (fornecedor, CC, categoria) + 3 baldes (`pendingCents/paidCents/overdueCents`); grupo com refs nulos.
- **CA2** — RBAC: sem `fiscal-document:read` → 403.
- **CA3** — contrato fechado (9 colunas por linha).

### Integração (MySQL real — CA4)
`tests/modules/financial/public-api/payment-position.drizzle-mysql.test.ts` (gate `MYSQL_INTEGRATION=1`, suíte `financial`)
- **CA4** — semeia `fin_payable_view` (5) + `fin_supplier_view` + `fin_cost_centers` + `fin_categories`; ClockFixed hoje=2026-07-14. Valida:
  - grupo S1/CC1/CAT1: `pending=300000` (Open+Approved), `paid=150000`, `overdue=200000` (só Approved com due_date<hoje), nomes via JOIN.
  - Cancelled fora; grupo (null,null,null): `pending=5000/paid=0/overdue=5000`.
  - `beforeEach` limpa as 4 tabelas (dona das próprias precondições).

## Prova RED
- `typecheck`: `Cannot find module '.../payment-position-projection.ts'` + `.../payment-position-read.ts'`.
- Borda: `tests 3 / fail 3` — `Route not found` (`GET /api/v2/reports/payment-position` inexistente).
