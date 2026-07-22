# Code Review — BDG-BUDGET-CALC (#317) — Round 1

**Veredito:** APPROVED (achados corrigidos inline; follow-ups registrados)
**Reviewers:** `code-reviewer` (core) + `zod-expert` (schemas) + `fastify-server-expert` (borda)
**Data:** 2026-07-09

## code-reviewer (domínio + aplicação + persistência) — limpo
Aderência confirmada: zero throw/class/any, `Result<T,E>`, discriminated union + switch exaustivo
(`default: const _: never`), erros string-literal EN kebab, ports como `type`, mappers retornam `Result`,
module isolation OK. 2 Minor:
- **[CORRIGIDO]** `CalcModelInput` discriminava por `model` (fora da convenção `kind`/`type`) →
  renomeado para **`kind`** (alinha com `BudgetPartner.kind`); entidade/coluna/response mantêm `model` (dado de negócio).
- **[ISSUE]** `deleteBudget` save-plano-then-delete-results não é transacional cross-repo → issue aberta.

## zod-expert (schemas de borda) — 2 Major + 3 Minor
- **[CORRIGIDO] M1** `addBudgetBodySchema.valueInCents` reusava `centsField` (bound de valor unitário de linha)
  para o TOTAL de uma Rede → extraído `BUDGET_TOTAL_MAX_CENTS` (R$10 bi) próprio.
- **[CORRIGIDO] M2** `budgetResponseSchema` achatado (`partnerKind`/`partnerRef`) divergia do
  `budgetDetailItemSchema` aninhado → alinhado a `partner:{kind,ref}` (idem DTO + teste).
- **[CORRIGIDO] N1/N3** `.meta` movido para a base de `partnerKindSchema` + descrição em `partnerRef`.
- **[DIFERIDO] N2** DRY do enum `partnerKind` (3 ocorrências, 2 pré-existentes) — fora do escopo.

## fastify-server-expert (rotas) — 2 Major + 3 Minor
- **[CORRIGIDO] M1** `GET by-budget` somava `totalInCents` na borda com `+` cru sobre DTOs (reabre o
  "Defeito #8" do Money) → soma movida para `get-budget-results` (application) via `Money.add` (padrão de `BudgetPlan.total`).
- **[DIFERIDO→#329] M2** `sendWriteError` vaza code interno em 5xx (dívida transversal já rastreada em #329,
  OPEN; ADR-0040 desaconselha corrigir aqui) → os 4 códigos 503 novos desta fatia adicionados ao escopo de #329 (comentário).
- **[CORRIGIDO] m1** comentário de "ordem de registro" das rotas corrigido (router find-my-way: static > param).
- **[CORRIGIDO] m2** `budget-id-invalid`/`subcategory-id-invalid`/`budget-plan-invalid-money` adicionados
  explicitamente ao `WRITE_ERROR_STATUS` (não mais por default).
- **[CORRIGIDO] m3** teste 403 adicionado ao `DELETE /budgets/:budgetId`.
- Confirmações positivas: sem colisão de rotas, RBAC método↔permission correto, 204 idêntico ao padrão financial.

## Gate pós-correções
`typecheck` ✓ · `lint` ✓ · `format:check` ✓ · 143 testes do módulo ✓.

## Follow-ups
- Issue nova: `deleteBudget` não-transacional cross-repo (aceitável hoje; registrar risco).
- #329 (5xx redaction): incluir `budget-result-repo-unavailable`, `budget-result-corrupt`,
  `subcategory-reader-unavailable`, `budget-reader-unavailable` no escopo.
- Diferido (P.O.): CA3 avançado (categoria/subcategoria/ano-anterior).
