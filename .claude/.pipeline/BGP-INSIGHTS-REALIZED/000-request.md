# BGP-INSIGHTS-REALIZED — escopo (#416)

> O Plano Insight (`GET /budget-plans/:id/insights`) passa a devolver o **Realizado real** (hoje é mock do
> front) — soma dos títulos **CONCILIADO** vinculados ao plano. Size **M**. Branch
> `feat/416-plan-realized-reconciled`. Prioridade da P.O. (Bloco 1 — Orçamento).

## Decisão de produto (P.O., 2026-07-15)

- **Realizado = soma dos títulos conciliados do plano.** Corte = **CONCILIADO** (não Pago).
- **Incluir parciais:** Realizado = `Σ reconciled_value_cents` das reconciliações **Active** do plano
  (título de R$100 conciliado em R$60 entra com R$60 — é o realizado econômico).
- **Por ano:** o Realizado vem por ano, espelhando o Planejado (`current` + `previousYears`), para o card
  comparar Planejado × Realizado ano-a-ano.
- **Média de N Estados:** expor só `networksCount` (`plan.budgets.length`); a média o front calcula.
- **Mesma fonte serve o relatório Realizado×Planejado** (futuro, congelado) — o reader é único.

## Decisão de arquitetura — (B) reader no `financial/public-api`, consumido via ACL

**Escolhida (B), não (A) consumo de evento.** Fundamento (Explore + ADR):

1. **Precedente idêntico em produção:** `reports` já consome `openPaymentPositionReader`/
   `openPayablesAnalysisReader`/`openSuppliersWithoutContractReader` do `financial/public-api` via ACL
   (`financial/public-api/index.ts:39-59`). Um `openRealizedByPlanReader` encaixa exatamente nesse molde.
2. **O estado "conciliado" vive inteiro no `financial`** — o financial responde melhor "quanto foi
   realizado neste plano". O JOIN `fin_reconciliation_items → fin_payables.document_id →
   fin_documents.budget_plan_ref` é **intra-módulo** (permitido).
3. **ADR-0022 NÃO veta (B).** O ADR proíbe derivar read-model por **query direta no outbox/tabela de
   entrega** (`adr/0022*.md:37,52`), não agregação síncrona sobre tabelas de domínio. Os readers
   `payment-position`/`payables-analysis` já agregam on-read sobre `fin_payable_view` e estão aceitos.
4. **(A) custa mais e sem ganho hoje:** exigiria enriquecer os eventos de conciliação com `budgetPlanRef`
   (ausente — `reconciliation/events.ts:10-17`), criar o **primeiro** consumidor/worker + read-model no
   budget-plans (que hoje só produz), tratar `ReconciliationUndone` para reverter. Sem pressão de
   performance, não se justifica. (Se doer no futuro: materializar `fin_realized_by_plan_view` alimentado
   por evento enriquecido — meio-caminho de A. Fora deste ticket.)

**Fronteira (decisão da P.O.):** o `/insights` do budget-plans passa a mostrar Realizado — contraria o
comentário `get-budget-plan-insights.ts:11-12` ("Planejado×Realizado é reports/032"). A P.O. decidiu que o
Insight mostra Realizado; o insights passa a consumir o reader do financial via ACL (ADR-0006 `:80`
sanciona). Atualizar o comentário.

## Estado (Explore — nada de migration)

- Como um título fica CONCILIADO: referenciado por `fin_reconciliation_items.reconciled_value_cents`
  (`mysql.ts:750-755`) de uma `fin_reconciliations` com `status='Active'` (`:717-744`; VO `'Active'|'Undone'`).
  O `confirm` cria Active; o `undo` vira Undone e reverte `Reconciled→Paid`. Evento `PayableReconciled`
  por título (`reconciliation.ts:115-124`).
- `budget_plan_ref` **só no documento** (`fin_documents.budget_plan_ref`, `mysql.ts:88`); o payable/view
  **não** projeta. O `fin_payable_view` nem rastreia `Reconciled`. → a soma exige o JOIN 3-hop
  **intra-financial** (items Active → payables.document_id → documents.budget_plan_ref).
- Insights hoje: `get-budget-plan-insights.ts` devolve só Planejado `{ current, previousYears }`
  (schema `adapters/http/schemas.ts:185-194`). `composition.ts:258` monta com `{ planRepo }`.
- budget-plans **não tem consumidor de evento** hoje (só produtor) — reforça a escolha (B).

## Escopo (in)

**A. `financial/public-api` — reader novo (query intra-módulo):**
1. `financial/public-api/realized-by-plan-projection.ts` — `openRealizedByPlanReader({connectionString})`
   boot-scoped (molde `payment-position-projection.ts`), método
   `getByPlans(refs: readonly string[]) → Result<ReadonlyMap<string, number>, string>` (batch anti-N+1;
   devolve realizedCents por budget_plan_ref). Query: `SUM(fin_reconciliation_items.reconciled_value_cents)`
   com JOIN `fin_reconciliations` (status='Active') + `fin_payables` (para o document_id) + `fin_documents`
   (budget_plan_ref), `WHERE budget_plan_ref IN (:refs)`, `GROUP BY budget_plan_ref`. Refs ausentes = 0.
   Export no barrel `financial/public-api/index.ts`.

**B. `budget-plans` — consumidor (ACL):**
2. `budget-plans/application/ports/realized-by-plan-reader.ts` — port type puro
   (`getByPlans(refs) → Result<Map, E>`).
3. `budget-plans/adapters/persistence/realized-by-plan-reader.financial.ts` — adapter ACL (recebe a função
   `getByPlans` já ligada, nunca connection-string) + `.in-memory.ts` (fake, seed por ref).
4. `get-budget-plan-insights.ts` — nova dep `realizedReader`; para cada plano exibido (`current` + os
   `previousYears`), busca o realizado por `budget_plan_ref` (= id do plano) em 1 batch; adiciona
   `realizedInCents` a cada `YearTotal` + `networksCount = plan.budgets.length` no topo. Atualizar o
   comentário de fronteira `:11-12`.
5. `adapters/http/schemas.ts:185-194` — `yearTotalSchema` += `realizedInCents`; response += `networksCount`.
6. `adapters/http/plugin.ts` / DTO — repassar os campos novos.
7. `composition.ts` — injetar o reader do financial (boot-scoped, aberto no boot, fechado no shutdown;
   env `BUDGET_PLANS_...`/`FINANCIAL_DATABASE_URL`); driver memory usa o in-memory.

## Fora de escopo

- Materializar `fin_realized_by_plan_view` / enriquecer eventos (opção A — só se performance exigir).
- A "média" em si (front calcula com o N). Relatório Realizado×Planejado (congelado; usará o mesmo reader).
- Realizado por rede/estado (só por plano/ano). Migration (leitura pura).

## Critérios de aceite (Dado/Quando/Então)

- **CA1** — `GET /budget-plans/:id/insights` devolve, para `current` e cada `previousYears`, `realizedInCents`
  = soma dos `reconciled_value_cents` (reconciliações **Active**) dos títulos cujo documento tem
  `budget_plan_ref = id daquele plano`. Plano sem conciliados → `realizedInCents: 0`.
- **CA2** — **Parciais entram:** título R$100 conciliado em R$60 (parcial) → contribui R$60. Título
  totalmente conciliado → valor cheio. Reconciliação `Undone` **não** conta.
- **CA3** — `networksCount` = número de redes do plano (`plan.budgets.length`); plano sem redes → 0
  (explica o "0" que a P.O. viu, agora real).
- **CA4** — RBAC/rota preservados; Planejado (`current`/`previousYears` totalInCents) **inalterado**
  (aditivo). Response `.strict()` preservado.
- **CA5** — Reader validado em **MySQL real**: o JOIN 3-hop soma certo por plano, exclui `Undone`, inclui
  parciais, agrupa por `budget_plan_ref`; batch de refs (anti-N+1); EXPLAIN sem full-scan patológico.
  Cross-módulo só via public-api; **zero JOIN** `bgp_*` × `fin_*`.

## Pipeline

| Wave | Skill/agente | Atividade |
| :-- | :-- | :-- |
| W0 | `tdd-strategist` | RED — reader financial (integração MySQL: soma/parciais/undone/batch) + insights (unit: realizedInCents+networksCount) + HTTP (fastify.inject) |
| W1 | `drizzle-orm-expert` (JOIN/agregação no reader) + `ports-and-adapters` (port/ACL no budget-plans) | reader + port + adapter + consumer + DTO; sem migration |
| W2 | `code-reviewer` (+ `security-backend-expert`: pool boot-scoped, sem JOIN cross-BC) | audit read-only |
| W3 | `ts-quality-checker` | gate + integração MySQL (x99/OrbStack não-destrutivo) |

## DoD

Gate W3 verde + CA1–CA5 + Realizado real (parciais, por ano) + networksCount + Planejado inalterado +
reader único reusável pelo relatório + validação MySQL real. Fecha #416.
