# W0 — Testes RED (REPORTS-SUPPLIERS-NO-CONTRACT · #240 · REP-2)

**Outcome:** RED (falha por inexistência da API). Skill: `tdd-strategist`.

## Testes escritos

### Borda HTTP (unit, `fastify.inject`, memory driver)
`tests/modules/reports/adapters/http/suppliers-without-contract.http.test.ts`
- **CA1** — 200 com lista agregada por fornecedor (`supplierRef, name, totalCents, payableCount`); prova `name: null` p/ supplier sem projeção.
- **CA2** — RBAC: sem `fiscal-document:read` → 403.
- **CA3** — contrato de saída fechado (4 colunas por item).

### Integração (MySQL real — CA4)
`tests/modules/financial/public-api/suppliers-without-contract.drizzle-mysql.test.ts` (gate `MYSQL_INTEGRATION=1`, suíte `financial`)
- **CA4** — semeia `fin_payable_view` (5 payables) + `fin_supplier_view` (1 supplier); valida:
  - S1 sem contrato: Open + **Cancelled** → `payableCount=2`, `totalCents=150000` (todos os status contam), `name` via LEFT JOIN.
  - S1 **com** contrato → excluído. S2 sem projeção em supplier_view → incluído com `name=null`. `supplier_ref` null → excluído.
  - `beforeEach` limpa as DUAS views (agregação de estado absoluto = dona das próprias precondições).

## Prova RED
- `pnpm run typecheck`: `Cannot find module '#src/modules/financial/public-api/suppliers-without-contract-projection.ts'` + `'#src/modules/reports/application/ports/suppliers-without-contract-read.ts'`.
- Borda: `tests 3 / fail 3` — `Route not found` (`GET /api/v2/reports/suppliers-without-contract` inexistente).
