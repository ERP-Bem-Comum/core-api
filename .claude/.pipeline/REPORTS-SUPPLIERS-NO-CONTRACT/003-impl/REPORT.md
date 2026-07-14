# W1 — Implementação (REPORTS-SUPPLIERS-NO-CONTRACT · #240 · REP-2)

**Outcome:** GREEN. Skills: `ports-and-adapters` + `drizzle-orm-expert` (query) + `fastify-server-expert` (par `zod-expert`).

## Entregue

### 1. `financial/public-api` — reader boot-scoped da agregação
- `src/modules/financial/public-api/suppliers-without-contract-projection.ts`
  - `openSuppliersWithoutContractReader({ connectionString }) → Result<{ list, close }, string>` (pool 1× no boot; molde `openCollaboratorProjectionReader`/`buildPartnersReadPort`).
  - Query: `SELECT supplier_ref, fsv.name, SUM(value_cents), COUNT(*) FROM fin_payable_view LEFT JOIN fin_supplier_view WHERE contract_ref IS NULL AND supplier_ref IS NOT NULL GROUP BY supplier_ref, name`. Todos os status (inclui Cancelled). Molde: `document-summary-by-ids-view.drizzle.ts:79-108`.
  - `SUM` (DECIMAL→string no mysql2) coagido com `Number()`; `COUNT(*)` já number.
- `src/modules/financial/public-api/index.ts` — exporta `openSuppliersWithoutContractReader` + tipos.

### 2. Módulo `reports` (estende)
- `application/ports/suppliers-without-contract-read.ts` — `SupplierWithoutContract` (4 cols), erro, port.
- `adapters/persistence/suppliers-without-contract-read.financial.ts` — adapter ACL sobre o `list` do reader do financial.
- `adapters/persistence/suppliers-without-contract-read.in-memory.ts` — fake.
- `adapters/http/{schemas,dto,plugin}.ts` — rota `GET /reports/suppliers-without-contract`, gate `authorize(FINANCIAL_PERMISSION.read)` = `fiscal-document:read`, response Zod (`{ suppliers: [...] }`).
- `adapters/http/composition.ts` — `ReportsCompositionConfig` ganhou `partnersUrl`/`financialUrl`; abre **os dois** readers no boot; `shutdown()` fecha ambos; cleanup do pool do partners se o do financial falhar.

### 3. Wiring `src/server.ts`
- `REPORTS_DATABASE_URL` (fallback `PARTNERS_DATABASE_URL`) + `REPORTS_FINANCIAL_DATABASE_URL` (fallback `FINANCIAL_DATABASE_URL`).

## Testes (W0 → GREEN)
- `suppliers-without-contract.http.test.ts` — CA1/CA2/CA3 **3/3 GREEN** (memory driver). REP-1 sem regressão (3/3).
- `suppliers-without-contract.drizzle-mysql.test.ts` — **CA4 GREEN no MySQL (OrbStack)**: SUM inclui Cancelled (150000), count=2, nome via LEFT JOIN, S sem projeção → name null, exclusões (com contrato / supplier null) corretas. Suíte financial 76/76.

## Decisões aplicadas
Gate `fiscal-document:read`; todos os status na soma (superset literal). Divergência `contract_ref IS NULL` documentada.
