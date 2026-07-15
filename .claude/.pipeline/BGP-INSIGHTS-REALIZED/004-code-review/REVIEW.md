# Code Review — BGP-INSIGHTS-REALIZED (#416) — Round 1

**Veredito:** APPROVED
**Reviewer:** `code-reviewer` (W2, read-only)
**Data:** 2026-07-15

**Escopo revisado:** `financial/public-api/realized-by-plan-projection.ts` (novo) + `index.ts` (barrel);
`budget-plans/application/ports/realized-by-plan-reader.ts` (novo);
`budget-plans/adapters/persistence/realized-by-plan-reader.{financial,in-memory}.ts` (novos);
`get-budget-plan-insights.ts`; `adapters/http/{composition,plugin,schemas}.ts`; `scripts/ci/test-integration.ts`;
3 test files; schema `financial/.../schemas/mysql.ts` (conferência de colunas).

---

## 1. JOIN 3-hop e intra-financial (CRÍTICO) — OK

- Colunas conferidas no schema: `finReconciliationItems.{reconciliationId,payableId,reconciledValueCents}`
  (bigint), `finReconciliations.{id,status}` (CHECK `IN ('Active','Undone')`), `finPayables.{id,documentId}`,
  `finDocuments.{id,budgetPlanRef}`. JOIN `items → reconciliations(status='Active') → payables →
  documents.budget_plan_ref` correto (`realized-by-plan-projection.ts:59-70`).
- **CA2 Undone excluído:** `status='Active'` no `and(...)` do INNER JOIN (`:62-64`). ✓
- **CA2 parciais:** `SUM(reconciled_value_cents)` (`:57`), não `fin_payables.value`. ✓
- **`refs` vazio:** curto-circuita antes do banco (`:51`) — não roda `IN ()`. ✓
- **mysql2 SUM string → Number** (`:57,76`). ✓
- **Zero JOIN `bgp_*` × `fin_*`:** reader vive no `financial/public-api`, só toca `fin_*`. ADR-0006/0014. ✓

## 2. Planejado inalterado / aditivo (CA4) — OK

`totalInCents` intacto em `current`/`previousYears`; só `realizedInCents` + `networksCount` adicionados.
Correlação `budget_plan_ref = String(plan.id)`; batch único `getByPlans` (anti-N+1); `?? 0` p/ ref ausente.
`networksCount = plan.budgets.length` (CA3).

## 3. Pool boot-scoped (incidente RDS 0001) — OK

`openRealizedByPlanReader` aberto 1× no boot (mysql), `applyMigrations:false`, `close()` no shutdown, nunca
por request. Error path do open limpa os readers anteriores antes do throw. Memory usa in-memory.

## 4. ACL fail-closed — OK

Adapter traduz erro do financial → `'realized-by-plan-read-unavailable'` (import só de public-api, type-only);
use case propaga; plugin mapeia → **503**. Reader indisponível ⇒ 503, nunca número parcial. RBAC preservado.

## 5. Qualidade — OK

Port `type` puro sem `close()` (lifecycle do pool não vaza ao consumidor); Result na borda; `import type`/`.ts`;
EN kebab-case; molde `payment-position`/`suppliers-without-contract` seguido. Testes cobrem CA1/CA2/CA3/CA5.

---

## Achados — 🔵 Minor (não bloqueiam)

1. **Fail-closed 503 sem teste automatizado.** O caminho reader-indisponível → `read-unavailable` → 503 está
   correto, mas nenhum teste o exercita (a fake e o memory sempre devolvem `ok`). Sugestão: caso com reader
   que devolve `err` assertando 503. → **será adicionado no W3.**
2. `InMemoryRealizedByPlanReader` ignora `refs` (devolve o seed inteiro). Inócuo (consumidor faz `.get()` de
   chaves específicas). Aceitável para double.
3. Informativo — 4º pool boot-scoped na mesma URL `core` (handle + programs + partners + realized). Consistente
   com os read ports irmãos; o registry do #407 deduplicaria. Sem ação neste ticket.

## Próximo passo

**APPROVED** → W3 (`ts-quality-checker` + integração MySQL real do reader, CA1/CA2/CA5). O Minor 1 (teste do
503) entra no W3.
