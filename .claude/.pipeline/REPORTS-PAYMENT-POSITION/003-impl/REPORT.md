# W1 — Implementação (REPORTS-PAYMENT-POSITION · #243 · REP-4)

**Outcome:** GREEN. Skills: `ports-and-adapters` + `drizzle-orm-expert` (CASE WHEN) + `fastify-server-expert` (par `zod-expert`).

## Entregue

### 1. `financial/public-api` — reader boot-scoped da posição
- `src/modules/financial/public-api/payment-position-projection.ts`
  - `openPaymentPositionReader({ connectionString, clock }) → Result<{ list, close }, string>` (pool 1× no boot).
  - Query: `GROUP BY supplier_ref, cost_center_ref, category_ref` + 3 `SUM(CASE WHEN ...)`:
    PENDENTE (`status IN ('Open','Approved')`), PAGO (`= 'Paid'`), ATRASADO (`Open/Approved AND due_date < :today`).
    LEFT JOIN `fin_supplier_view`/`fin_cost_centers`/`fin_categories` p/ nomes; `WHERE status != 'Cancelled'`.
  - `today` = `PlainDate.toISOString(clock.today())` — testável via ClockFixed. `SUM` (string) coagido com `Number()`.
- `financial/public-api/index.ts` — exporta `openPaymentPositionReader` + tipos.

### 2. Módulo `reports` (estende)
- `application/ports/payment-position-read.ts` — `PaymentPositionRow` (9 cols nullable/number), erro, port.
- `adapters/persistence/payment-position-read.financial.ts` — adapter ACL sobre o `list` do reader.
- `adapters/persistence/payment-position-read.in-memory.ts` — fake.
- `adapters/http/{schemas,dto,plugin}.ts` — rota `GET /reports/payment-position`, gate `fiscal-document:read`, response Zod `.strict()` (`{ positions: [...] }`).
- `adapters/http/composition.ts` — 3º reader aberto no boot (ClockReal); `shutdown()` fecha os 3; cleanup em falha parcial encadeado.

### 3. Wiring `src/server.ts`
- Sem mudança — reusa `reportsFinancialUrl` (já passado ao `buildReportsHttpDeps`).

## Testes (W0 → GREEN)
- `payment-position.http.test.ts` — CA1/CA2/CA3 **3/3 GREEN**. REP-1/REP-2 sem regressão (6/6).
- `payment-position.drizzle-mysql.test.ts` — **CA4 GREEN no MySQL (OrbStack)**: 3 baldes corretos
  (pending 300000, paid 150000, overdue 200000 via ClockFixed), Cancelled fora, refs nulos agrupam,
  nomes via JOIN. Suíte financial 77/77.

## Decisões aplicadas
Shape flat; gate `fiscal-document:read`; Cancelled excluído; ATRASADO⊆PENDENTE; clock injetado.
