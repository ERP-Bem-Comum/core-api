# REPORTS-ANALYSIS-PAYABLES — escopo (REP-3 "Análise de Planejamento" · épico #114)

> Slice **REP-3** do épico Relatórios **#114** (o gap: REP-1/2/4 entregues). Estende `reports` +
> nova leitura agregada temporal no `financial/public-api`. Size **L**. Branch `feat/reports-analysis-payables`.

## Contexto (via Explore)
Contrato legado fixado em `handbook/legacy_docs/openapi.yaml`:
- `GET reports/analysis/payables` → **`AnalysisReport`**: `{ totalValueOfPeriod, data: [{ id, name, total,
  itens: [{ monthYear, total }], CostCenter: [...] }] }` — agrupado por dimensão, com quebra mensal e
  sub-quebra por centro de custo.
- `GET reports/analysis/chart` → `[{ id, name, total }]` (resumo por dimensão, sem série).

Fonte: read-model `fin_payable_view` (#235). Nomes via LEFT JOIN `fin_categories`/`fin_cost_centers`.
Nenhum reader temporal existe → **criar** `openPayablesAnalysisReader` (agregação por mês via
`DATE_FORMAT(due_date,'%Y-%m')`, ADR-0020 permite função de data; janela pura reusável em
`financial/domain/dashboard/variation.ts` `monthWindow`).

## Decisões (precedente REP-2/REP-4 + contrato legado)
- **Dimensão primária = Categoria** (`data[].id/name` = category), com **CostCenter** como sub-quebra
  (fiel ao `AnalysisReport.CostCenter`). Programa como agrupamento fica fora (nome vem de
  `programs/public-api` — 2º ACL; follow-up).
- **RBAC:** `authorize(FINANCIAL_PERMISSION.read)` = `fiscal-document:read` (precedente MERGED REP-2/REP-4).
- **Filtros suportados (subset):** `dueStart`/`dueEnd` (período, half-open `[start,end)` como o
  `dashboard`) + `status` (opcional). **Omitidos (documentado):** `budgetPlanId` (BLOQUEADO — payable não
  tem budgetPlanRef; dep. Camada 3), `accountId`/`entityId`/`subCategoryId`/`programId` (follow-up).
- **`analysis/chart`** aceita os mesmos filtros de período (divergência menor do legado sem-params — mais
  útil; documentada). Chart = totais por categoria (subconjunto do `data[]`).
- **Sem eixo "planejado"** — o `AnalysisReport` legado é só payables; comparação planejado×realizado é
  outra frente (bloqueada até budget-plans expor read-port).
- Refs nulos (category/cost_center null) agrupam em grupo "sem categoria/CC" (id/name null). `Cancelled`
  excluído da soma (como no payment-position).

## Escopo (in)
1. **`financial/public-api`:** `openPayablesAnalysisReader({ connectionString }) → Result<{ list, close }, string>`
   (boot-scoped). `list(filter: { dueStart, dueEnd, status? }) → rows` agregando `fin_payable_view`
   `WHERE due_date >= :start AND due_date < :end [AND status = :status] AND status != 'Cancelled'`,
   `GROUP BY category_ref, cost_center_ref, DATE_FORMAT(due_date,'%Y-%m')`, `SUM(value_cents)`,
   LEFT JOIN nomes. Row plana `{ categoryRef, categoryName, costCenterRef, costCenterName, monthYear, totalCents }`.
2. **Módulo `reports` (estende):** port `AnalysisReadPort.list(filter)` + adapter ACL + in-memory + 2 rotas
   (`GET /reports/analysis/payables` + `/reports/analysis/chart`, gate `fiscal-document:read`, query Zod
   validada) + DTO que **aninha** as rows planas em `AnalysisReport` (categoria → itens[] mensais +
   costCenters[]) e monta o chart (totais por categoria) + composition abre o reader no boot.

## Fora de escopo
- Eixo planejado/`budgetPlanId` (bloqueado). Agrupamento por programa (2º ACL — follow-up). CSV/PDF
  (front monta do JSON). Receivables (#179). Paginação (`page`/`limit` do legado — análise é agregada, não lista).

## Critérios de aceite
- **CA1** `GET /api/v2/reports/analysis/payables?dueStart&dueEnd[&status]` retorna `AnalysisReport`
  (totalValueOfPeriod + data[] por categoria com itens[] mensais + costCenters[]).
- **CA2** RBAC: sem `fiscal-document:read` → 403; com → 200. Query inválida (datas ausentes/malformadas) → 400.
- **CA3** `GET /api/v2/reports/analysis/chart` retorna `[{ id, name, total }]` por categoria (mesmo período).
- **CA4** Agregação validada no MySQL real (x99): soma por categoria×CC×mês correta, `Cancelled` fora,
  filtro de período `[start,end)`, nomes via JOIN, refs nulos agrupam.

## Pipeline
| Wave | Skill/agente | Atividade |
| :-- | :-- | :-- |
| W0 | `tdd-strategist` | RED — 2 rotas (fastify.inject) + agregação temporal |
| W1 | `ports-and-adapters` + `drizzle-orm-expert` (GROUP BY temporal) + `fastify-server-expert` (par `zod-expert` na query) | reader + endpoints + DTO nesting + wiring |
| W2 | `code-reviewer` (+ `security-backend-expert`) | audit read-only |
| W3 | `ts-quality-checker` | gate + integração MySQL (x99) |

## DoD
Gate W3 verde + 2 endpoints no `/api/v2` com RBAC + query validada + agregação validada no x99. Fecha a
slice REP-3; não fecha #114 (restam 5).
