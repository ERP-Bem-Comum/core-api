# W1 — GREEN · BDG-PLAN-LIFECYCLE (#318, US4)

Escopo revisado (000-request §ESCOPO REVISADO): lifecycle fiel (árvore + clonagem); Planejado×Realizado
movido p/ spec 032; CA3 = insights ano-a-ano. Fatiado internamente (W1-A→W1-D), commits WIP na go-live.

## Entregue (168 testes do módulo verdes; typecheck + lint + format)

### W1-A — domínio da state machine (`7ba7aec8`)
`BudgetPlan` +`parentId`/`scenarioName`. Transições puras `startCalibration` (filho EM_CALIBRACAO, version
major+1), `createScenery` (filho RASCUNHO, minor+1), `approve`. Guards fiéis ao legado.

### W1-B — persistência da árvore (`7ba7aec8`)
Schema `bgp_budget_plans` +`parent_id`(sem FK, soft ref auto-ref)+`scenario_name`; UNIQUE revisado
`(year, program_ref, version_major, version_minor)` — o antigo quebraria com filhos. Migration `0003` + charset.

### W1-C — clonagem profunda (`0b4f332d`, `88b9c5f0`, `fedc3f24`)
`CostStructure.clone` (função pura, id-factory, mapa oldSubcat→newSubcat — casa por id, não por nome).
`BudgetResult.clone` (copia valor, não recalcula). Helper `clonePlanContent` (budgets+árvore+results
remapeados) compartilhada por `startCalibration`/`createScenery` (use cases).

### W1-D — aprovar + borda + insights (`eea44af2`, `e724fae3`)
`approveBudgetPlan` (CA2). **Promoção = semântica limpa** (decisão: filho aprovado vira vigente; pai =
histórico; NÃO replica o `copy` peculiar do legado). Borda HTTP: `POST /:id/start-calibration` (CA1),
`POST /:id/scenery` (CA4), `POST /:id/approve` (CA2), `GET /:id/insights` (CA3 ano-a-ano). Erros de
transição → 409. `getBudgetPlanInsights` autocontido (Planejado×Realizado → spec 032).

## CAs: CA1 ✅ CA2 ✅ CA3 ✅ CA4 ✅

## Falta
- **W2** (review: `code-reviewer` + `zod-expert` + `fastify-server-expert` + `drizzle-orm-expert`).
- **W3** (gate; integração MySQL da migration `0003` deferida — #378, x99/Docker offline).
