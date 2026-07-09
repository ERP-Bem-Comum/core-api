# W1 — Implementação GREEN · BDG-CONSOLIDATED-CSV (#319, US5)

Skills/agentes: `ts-domain-modeler` (application) + `drizzle-orm-expert` (query `listApprovedRoots`) +
`nodejs-fs-scripter` (CSV via `csv.ts`) + `fastify`↔`zod` (borda). Um módulo/sessão (budget-plans).

## Estado: GREEN ✅

- Suíte **budget-plans: 198/198**. Projeto: **3680 tests, 0 fail, 18 skipped** (integração gateada) — zero regressão.
- `typecheck` ✓ · `lint` ✓ · `format:check` ✓.

## Arquitetura (separação limpa)

Application **carrega dados** → adapter HTTP **formata CSV**. A application não importa de `adapters/`
nem produz string PT-BR; o CSV (com `R$`/`;`/BOM) vive só no adapter.

## O que foi implementado

### Domínio/Port
- `BudgetPlanRepository.listApprovedRoots({year, programRef?})` — raízes APROVADAS (`parentId IS NULL`),
  ORDER BY id. Traduz `version=1 AND APROVADO` do legado. Adapters **drizzle** (WHERE + `asc(id)` + hidratação
  de budgets em lote) + **in-memory** (filtro + `localeCompare`).

### Application (use cases)
- `get-consolidated-result.ts` (CA1) — JSON resumo `{year, totalCents, plans[]}`; `totalCents` = Σ `BudgetPlan.total`
  (espelha `data.totalInCents` do legado).
- `get-plan-export.ts` (CA2/CA3) — `PlanExportSection` (serializável) + loader compartilhado `loadPlanExportSection`
  (rótulo `ano nome-programa versão`, parceiro por ref, subcategorias da árvore, valores por orçamento×subcategoria) +
  `getPlanExport` (guards `budget-plan-not-found` 404 / `plan-not-approved-for-consolidation` 409).
- `get-consolidated-export.ts` (CA2) — seções de todas as raízes aprovadas do ano.

### Adapter HTTP
- `budget-plan-csv.ts` (puro) — `BUDGET_PLAN_CSV_HEADER` (20 colunas legado), `formatCentsBRL` (pt-BR, U+00A0),
  `buildSectionRows` (produto budgets×subcategorias; valor em **JAN**, `R$ 0,00` FEV..DEZ), `sectionsToCsv`
  (via `toCsv` do util canônico — BOM + CRLF + `;` + anti-fórmula).
- **3 rotas** (`plugin.ts`, RBAC `read`): `GET /budget-plans/consolidated-result` (JSON, 200),
  `.../consolidated-result/csv` (inline text/csv), `GET /budget-plans/:id/generate-csv` (inline text/csv).
  Estáticas registradas antes de `/:id` (find-my-way prioriza estático). Helper `sendCsv` (Content-Type +
  Content-Disposition attachment). Erro `plan-not-approved-for-consolidation` → 409 no mapa canônico.
- Schemas Zod (`schemas.ts`): `consolidatedQuerySchema` (year obrigatório + programRef opcional),
  `consolidatedResultResponseSchema`, `generatePlanCsvParamSchema`.
- Wiring em `composition.ts` (3 use cases nos `BudgetPlansHttpDeps`, memory + mysql).

## Testes (W0 + e2e)
- `budget-plan-csv.test.ts` (projeção pura, paridade), `get-consolidated-result.test.ts` (agregação),
  `get-plan-export.test.ts` (loader + guards). **Novo e2e** `consolidated.routes.test.ts` (7 casos:
  CA1/CA2/CA3 + 400 sem year + 401 sem token + 409 não-aprovado + 404 ausente).

## Pendente (W2/W3)
- W2: audit multi-agente (code-reviewer core + zod-expert + drizzle-orm-expert query + fastify-server-expert).
- W3: `test:integration:budget-plans` — validar `listApprovedRoots` + loader no MySQL 8.4 real (x99).
