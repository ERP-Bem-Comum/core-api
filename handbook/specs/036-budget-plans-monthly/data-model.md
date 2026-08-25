# Data Model — Feature 036: Orçamento mensal (#413)

> Fase 1 do `/speckit-plan`. Decisões fundamentadas em [`research.md`](./research.md).
> **Mudança aditiva:** nenhum agregado muda de natureza; `BudgetResult` ganha uma dimensão na identidade.

## Value Object novo — `ExerciseMonth`

Mês do exercício do plano. Domínio puro, smart constructor, `Result<T, E>` — nunca throw (constituição §V).

```
src/modules/budget-plans/domain/shared/exercise-month.ts
```

| Aspecto          | Definição                                                                                                  |
| :--------------- | :--------------------------------------------------------------------------------------------------------- |
| **Branded type** | `ExerciseMonth = number & { readonly __brand: 'ExerciseMonth' }`                                           |
| **Faixa válida** | `1..12` inteiro (ano civil — Assumption da spec)                                                           |
| **Erros**        | `'exercise-month-invalid'` (fora de 1..12, não-inteiro, `NaN`) — EN kebab-case                             |
| **API**          | `parse(raw: number): Result<ExerciseMonth, ExerciseMonthError>` · `rehydrate(raw: number)` (row → domínio) |

**Por que VO e não `number` cru:** o FR-005 exige rejeitar mês fora do exercício, e a regra é de domínio. `noUncheckedIndexedAccess` + branded type impedem passar um `number` qualquer onde se espera mês.

## Agregado alterado — `BudgetResult`

`src/modules/budget-plans/domain/budget-result/budget-result.ts:17-23`

|                       | Hoje                                            | Passa a ser                                                |
| :-------------------- | :---------------------------------------------- | :--------------------------------------------------------- |
| Forma                 | `{ id, budgetId, subcategoryId, model, value }` | `{ id, budgetId, subcategoryId, **month**, model, value }` |
| Identidade de negócio | `(budgetId, subcategoryId)` — **não protegida** | `(budgetId, subcategoryId, month)` — **UNIQUE**            |
| Natureza              | resultado do cálculo server-side                | **inalterada** (FR-008 preserva o FR-003 da 030)           |

`model` **permanece** — descreve como o valor foi produzido, e segue verdadeiro. `value` segue `Money` em centavos.

**`BudgetResult.create`** ganha `month: ExerciseMonth` no input; o guard de modelo e o cálculo continuam no domínio, inalterados.

## Tabela alterada — `bgp_budget_results`

`src/modules/budget-plans/adapters/persistence/schemas/mysql.ts:203-229`

```
id              varchar(36)  PK
budget_id       varchar(36)  NOT NULL
subcategory_id  varchar(36)  NOT NULL
month           tinyint      NOT NULL          ← NOVO
model           varchar(24)  NOT NULL  CHECK(model IN (4 modelos))
value_cents     bigint       NOT NULL
```

| Mudança      | Detalhe                                                                                                                                   |
| :----------- | :---------------------------------------------------------------------------------------------------------------------------------------- |
| **+ coluna** | `month TINYINT NOT NULL` (1..12 cabe em 1 byte)                                                                                           |
| **+ CHECK**  | `bgp_budget_results_month_chk`: `month BETWEEN 1 AND 12` — sem ENUM nativo (ADR-0020)                                                     |
| **+ UNIQUE** | `bgp_budget_results_budget_subcategory_month_uq` em `(budget_id, subcategory_id, month)`                                                  |
| **− índice** | `bgp_budget_results_budget_id_idx` — **redundante**: o UNIQUE já é índice de prefixo para `WHERE budget_id = ?`                           |
| **= índice** | `bgp_budget_results_subcategory_id_idx` permanece (query "por subcategoria", CA3 do #317)                                                 |
| **= sem FK** | mantido: `bgp_budgets`/`bgp_subcategories` são replace-all; refs por identidade (D1 do #317, molde `fin_reconciliation_items.payable_id`) |

**Sem `NOT NULL DEFAULT`:** a coluna nasce `NOT NULL` sem default porque **não há linha para preencher** — zero registros em todos os ambientes (spec §"Verificação de volume"). Migration greenfield.

> ⚠️ **A migration nunca é escrita à mão** — `pnpm run db:generate` e versionar o resultado (constituição §VI).

## Semântica de escrita — upsert idempotente

```
ON DUPLICATE KEY UPDATE value_cents = VALUES(value_cents), model = VALUES(model)
```

| Cenário                                     | Resultado                                                            |
| :------------------------------------------ | :------------------------------------------------------------------- |
| Primeiro cálculo de `(rede, conta, mês)`    | INSERT — linha nova                                                  |
| **Recálculo** do mesmo `(rede, conta, mês)` | **UPDATE** — `value_cents`/`model` sobrescritos, **`id` preservado** |
| Cálculo de outro mês, mesma conta           | INSERT — meses coexistem (FR-004)                                    |

**Corrige um defeito pré-existente:** hoje o `add` é INSERT puro e não há UNIQUE, então recalcular grava **linha duplicada** e o total por Rede **conta em dobro** (ver `research.md` §D2). Nunca estourou porque nenhum ambiente tem plano (#374).

## Estados e invariantes

| Regra                                        | Onde vive                                                                                              | FR                    |
| :------------------------------------------- | :----------------------------------------------------------------------------------------------------- | :-------------------- |
| Mês ∈ 1..12                                  | VO `ExerciseMonth` (domínio) + CHECK (banco) + Zod (borda)                                             | FR-005                |
| Plano `Aprovado` bloqueia escrita            | já vigente — inalterado                                                                                | FR-006                |
| Anual = **soma** dos meses; nunca armazenado | leitura (`SUM … GROUP BY`)                                                                             | FR-007                |
| "Zero informado" ≠ "não orçado"              | **ausência de linha** = não orçado; `value_cents = 0` = orçado zero                                    | FR-011                |
| Recalcular atualiza, não duplica             | UNIQUE + upsert                                                                                        | edge case "recálculo" |
| Valor negativo                               | regra atual preservada (IPCA aceita negativo; domínio barra se o **resultado** < 0 — `schemas.ts:279`) | edge case             |

## Ports / repositório

`BudgetResultRepository` (`domain/budget-result/repository.ts`):

| Operação           | Mudança                                                                        |
| :----------------- | :----------------------------------------------------------------------------- |
| `add`              | → **`save`** (upsert). Nome novo porque a semântica deixa de ser "acrescentar" |
| `listByBudgetId`   | inalterada na assinatura; passa a devolver `month` em cada item                |
| `deleteByBudgetId` | inalterada (usada pelo delete atômico do #377)                                 |

Os dois adapters (`*.drizzle.ts` e `*.in-memory.ts`) implementam a mesma semântica — o in-memory precisa replicar a chave `(budgetId, subcategoryId, month)` para manter paridade com a suíte.

## Fora do escopo (confirmado)

- `bgp_budgets`, `bgp_cost_centers`, `bgp_categories`, `bgp_subcategories`, `bgp_budget_plans`, `bgp_outbox`: **inalteradas**.
- Nenhum evento novo de outbox (`bgp_outbox` só publica `BudgetPlan`; o Realizado do #416 lê via port, sem evento).
- Nenhuma migração de dado (US4 retirada — zero planos).
