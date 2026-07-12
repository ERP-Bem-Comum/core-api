# BGP-UPDATED-BY-AUDIT — escopo

> Issue **#373** — auditoria "atualizado por" (`updatedByRef`) no plano de orçamento. Módulo **`budget-plans`**. Size **M**.
> Separado do batch #372 (BGP-ITEM-PROJECTIONS) porque NÃO é projeção: o dado não existe (nem no agregado, nem na tabela). Exige migration + captura do ator.

## Contexto
Hoje o plano tem `updatedAt` mas não registra QUEM atualizou. O `req.userId` (sub do JWT, UUID v4) já é decorado por `requireAuth` e ignorado no `budget-plans` (financial/contracts já usam para `approvedBy`/`paidBy`). Há VO canônico `UserRef` (`src/shared/kernel/user-ref.ts`, rehydrate-only) e precedente `financial` (`approvedBy: varchar('approved_by', 36)` nullable).

## Decisões travadas (antes do W0)
- **D1 — Escopo = 6 transições do header do plano.** `updatedByRef` espelha EXATAMENTE o `updatedAt`: `create`, `addBudget`, `removeBudget`, `startCalibration`, `createScenery`, `approve`. **Cost-structure (addCostCenter/Category/Subcategory) e budget-result (addBudgetResult) ficam FORA** — hoje não bumpam `bgp_budget_plans.updated_at` (agregados/repos separados; `mutate` só faz `SELECT status FOR UPDATE`). Onde `updated_at` muda, `updated_by` muda junto — nada além.
- **D2 — `create` seta `updatedByRef` = criador.** Sem `created_by` separado (escopo mínimo; "atualizado por" na criação = quem criou).
- **D3 — nullable.** `updated_by varchar(36) NULL` — 5 migrations já rodaram, linhas legadas existem sem valor. Domínio aceita `UserRef | null` no hydrate; `seedPlans` usa `null`.
- **D4 — `UserRef` (shared kernel).** `varchar(36)` + `COLLATE utf8mb4_bin` (coluna UUID — edição manual na migration, drizzle-kit não emite collate). `UserRef.rehydrate(req.userId)`.
- **D5 — derivação (start-calibration/scenery + clonePlanContent).** `updatedByRef` do filho = o derivador (ator da transição); o loop de clone propaga o ator.
- **D6 — projeção.** Expor `updatedByRef` no item de `GET /budget-plans` (ao lado de `updatedAt`) e no detalhe. `string | null`.

## Escopo (in) — trilha de propagação do ator
1. **Domínio** (`domain/budget-plan/`): +`updatedByRef: UserRef | null` no type; as 6 factories recebem `actor: UserRef` (junto de `now`) e setam `updatedByRef: actor` no mesmo spread do `updatedAt`.
2. **Application** (6 use cases + `clonePlanContent`): Command ganha `updatedByRef: string`; valida via `UserRef.rehydrate`; repassa ao domínio.
3. **Borda** (`adapters/http/plugin.ts`, 6 handlers de mutação): passam `updatedByRef: req.userId`.
4. **Persistência**: schema `mysql.ts` (+coluna); migration `0005` manual (`ADD COLUMN updated_by varchar(36) NULL COLLATE utf8mb4_bin`); mapper (insert+update+hydrate); repo in-memory; `seedPlans` (null).
5. **Projeção** (D6): `BudgetPlanListItem` + `toItem` + `budgetPlanListItemSchema` + DTO (item de lista); idem detalhe.

## Fora de escopo
- Auditoria de cost-structure / budget-result (não bumpam updated_at — D1).
- `created_by` separado (D2). Histórico de auditoria (só o ÚLTIMO que atualizou).

## Critérios de aceite
- **CA1** Após `POST /budget-plans` (user A), o item/detalhe expõe `updatedByRef = A`.
- **CA2** `POST /:id/budgets` (user B) → `updatedByRef` do plano passa a `B` (última mutação vence).
- **CA3** Plano legado (sem `updated_by`) → `updatedByRef: null` coerente (não 500).
- **CA4** Cenário derivado via `POST /:id/scenery` (user C) → filho tem `updatedByRef = C`.
- **CA5** Migration `0005` aplica no MySQL real (x99): coluna `updated_by` nullable + collate; linhas existentes ficam null.
- **CA6** Domínio: cada uma das 6 factories seta `updatedByRef` junto de `updatedAt` (teste unitário).

## Pipeline (agentes por wave)
| Wave | Atividade | Especialista |
| :-- | :-- | :-- |
| W0 | RED (E2E rota CA1/CA2/CA4 + domínio CA6 + mapper CA3) | skill **`tdd-strategist`** |
| W1a | domínio: type + 6 factories | skill **`ts-domain-modeler`** |
| W1b | schema + migration 0005 + mapper + repo | agente **`drizzle-orm-expert`** + skill **`drizzle-schema-author`** |
| W1c | use cases + handlers + projeção DTO | agente **`fastify-server-expert`** ↔ **`zod-expert`** |
| W2 | audit read-only | skill **`code-reviewer`** |
| W3 | gate + **migration validada no x99** (CA5) | skill **`ts-quality-checker`** |

## DoD
Gate W3 verde. Migration validada no x99. `updatedByRef` gravado nas 6 transições e projetado no GET. Fecha #373.
