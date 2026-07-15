# W0 — Testes RED (REPORTS-ANALYSIS-PAYABLES · REP-3 · #114)

**Outcome:** RED (falha por inexistência da API). Skill: `tdd-strategist`.

## Testes escritos

### Borda HTTP (`fastify.inject`, memory)
`tests/modules/reports/adapters/http/analysis.http.test.ts`
- **CA1** — `analysis/payables` → `AnalysisReport` aninhado: `totalValueOfPeriod` + `data[]` por categoria
  com `itens[]` mensais + `costCenters[]` (o adapter recebe rows planas e o DTO aninha).
- **CA2** — RBAC: sem `fiscal-document:read` → 403; sem `dueStart`/`dueEnd` → **400** (query Zod).
- **CA3** — `analysis/chart` → `[{ id, name, total }]` por categoria (chaves fechadas).

### Integração (MySQL real — CA4)
`tests/modules/financial/public-api/payables-analysis.drizzle-mysql.test.ts` (gate `MYSQL_INTEGRATION=1`)
- **CA4** — semeia `fin_payable_view` (6) + `fin_categories` (2) + `fin_cost_centers` (1); filtro período
  `[2026-07-01, 2026-09-01)`. Valida 3 grupos (A/CC1/jul=100000, A/CC1/ago=50000, B/null/jul=30000);
  exclui antes-do-período, `>= dueEnd` (half-open) e `Cancelled`; nomes via LEFT JOIN.

## Prova RED
- `typecheck`: `Cannot find module '.../payables-analysis-projection.ts'` + `.../analysis-read.ts'`.
- Borda: `tests 3 / fail 3` — `Route not found`.
