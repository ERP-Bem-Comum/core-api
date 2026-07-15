# BGP-INSIGHTS-REALIZED — W0 (RED) REPORT (#416)

## Objetivo

Pinar, via testes que FALHAM pela API/semântica ausente, o "Realizado real" no
`GET /budget-plans/:id/insights`: Realizado = Σ `reconciled_value_cents` das reconciliações
**Active** dos títulos cujo documento tem `budget_plan_ref = id do plano` (inclui parciais,
exclui Undone), por ano, + `networksCount = plan.budgets.length`. Arquitetura (B): reader novo
no `financial/public-api`, consumido pelo budget-plans via port/ACL. Sem migration.

## Arquivos criados

- `tests/modules/financial/public-api/realized-by-plan.drizzle-mysql.test.ts` — integração MySQL do
  reader (gate `MYSQL_INTEGRATION`, suíte `financial`). Import **dinâmico** de `openRealizedByPlanReader`
  dentro do gate (precedente #437) para não quebrar o link ESM do `pnpm test` puro. Semeia direto nas
  tabelas cruas (molde `payment-position`).
- `tests/modules/budget-plans/application/use-cases/get-budget-plan-insights.test.ts` — unit do insights
  com **fake** do reader (não mock); assere `realizedInCents` + `networksCount`.
- `tests/modules/budget-plans/adapters/http/insights.routes.test.ts` — HTTP `fastify.inject`
  (driver `memory`), molde `item-projections.routes.test.ts`.

## Arquivo alterado

- `scripts/ci/test-integration.ts` — registrado `realized-by-plan.drizzle-mysql.test.ts` na suíte
  `financial` (senão nasce órfão — precedente #316/#423).

## Mapa CA → teste

| CA | Onde | Asserção |
| :- | :- | :- |
| CA1 (soma por plano; sem conciliados → 0) | integração `realized-by-plan` + unit + http | `getByPlans([P1]) → 16000`; `current.realizedInCents === 0` sem lastro |
| CA2 (parciais entram; Undone não conta) | integração `realized-by-plan` | R$60 de R$100 → 6000; Undone excluído; total 10000+6000=16000 |
| CA3 (networksCount = plan.budgets.length; sem redes → 0) | unit + http | `networksCount === 2`; plano sem budgets → `0` |
| CA4 (Planejado inalterado, aditivo; RBAC preservado) | unit + http | `totalInCents` intacto; GET sem token → 401 |
| CA5 (batch de refs; ref sem conciliação → 0/ausente) | integração `realized-by-plan` | `getByPlans([P1,P2,P3])` → P1=10000, P2=5000, `P3 ?? 0 === 0` |

## Saída REAL do RED

Rodada dirigida (3 arquivos):

```
ℹ tests 6 · pass 2 (RBAC 401 preservado + suite-node) · fail 4 (RED intencional) · skipped 0
[financial:realized-by-plan] MYSQL_INTEGRATION não definido — pulando integração.   ← skip limpo
```

Falhas (todas por campo ausente — `undefined !== esperado`, nunca sintaxe/import):

- `insights.routes.test.ts:138` + `:162` → `body.networksCount` undefined
- `get-budget-plan-insights.test.ts:59` + `:125` → `r.value.networksCount` undefined

`pnpm test` completo: `tests 4023 · pass 4000 · fail 4 · skipped 19`. As 4 falhas são exatamente as
acima; os 19 skips são baseline pré-existente (LGPD/compose/integração). Nenhum vermelho alheio. A
integração real (CA1/CA2/CA5 com MySQL) é do W3 — aqui só skip limpo.

## Contratos pinados para o W1

1. **Reader (financial/public-api):** `openRealizedByPlanReader({ connectionString })` boot-scoped →
   `Result<RealizedByPlanReader, string>` com
   `RealizedByPlanReader = { getByPlans(refs: readonly string[]) => Promise<Result<ReadonlyMap<string, number>, string>>; close(): Promise<void> }`.
   Chave do Map = `budget_plan_ref`; refs sem conciliação **ausentes** do Map (o teste aceita ausente OU 0).
   Exportar no barrel `financial/public-api/index.ts`. Query = JOIN 3-hop intra-financial:
   `fin_reconciliation_items` → `fin_reconciliations (status='Active')` → `fin_payables (document_id)` →
   `fin_documents (budget_plan_ref)`, `WHERE budget_plan_ref IN (:refs) GROUP BY budget_plan_ref`,
   `SUM(reconciled_value_cents)`.
2. **Use case:** dep com chave **exata** `realizedReader` — `getBudgetPlanInsights({ planRepo, realizedReader })`
   (strip-types não typa; o nome precisa bater). Correlação plano↔ref: `budget_plan_ref = String(plan.id)`.
   Saída += `realizedInCents` em `current` **e** cada `previousYears` (0 quando ref ausente do Map), e
   `networksCount = plan.budgets.length` no topo. `totalInCents` (Planejado) **inalterado**. 1 batch `getByPlans`.
3. **Port/ACL (budget-plans):** `application/ports/realized-by-plan-reader.ts` (type puro);
   `adapters/persistence/realized-by-plan-reader.financial.ts` (ACL, recebe `getByPlans` já ligada) +
   `.in-memory.ts` (fake, Map vazio ⇒ 0).
4. **Schema HTTP:** `yearTotalSchema` += `realizedInCents: z.number().int()`;
   `budgetPlanInsightsResponseSchema` += `networksCount: z.number().int().nonnegative()`.
5. **Composição memory:** `buildBudgetPlansHttpDeps({driver:'memory'})` injeta o `realizedReader` in-memory
   (Map vazio ⇒ 0), senão o use case quebra ao ler `deps.realizedReader.getByPlans`.

## Pontos de atenção para o W1

- **`.strict()` no response:** o `budgetPlanInsightsResponseSchema` atual **não** é `.strict()` (z.object =
  strip). Não pinei strictness (não sobre-especificar). Se o W1 tornar strict, incluir os 2 campos novos no
  schema (senão a serialização derruba). O reader vive 100% no financial; budget-plans só consome via port
  (ADR-0014; zero JOIN `bgp_*` × `fin_*`).
- **Sem alteração no `budget-plan-dto.ts`:** a rota `/insights` devolve `result.value` direto — a forma do
  use case = a forma do DTO. Alinhar use case + schema basta.
