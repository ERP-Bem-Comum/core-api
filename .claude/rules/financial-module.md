---
paths:
  - "src/modules/financial/**/*.ts"
  - "src/modules/budget-plans/**/*.ts"
  - "tests/modules/financial/**/*.ts"
  - "tests/modules/budget-plans/**/*.ts"
---

# Fronteira Financial ↔ Budget-Plans — dono da taxonomia

**O `budget-plans` é o owner da taxonomia do que é planejável. O `financial` não a duplica — lê do plano. E mantém, como dado próprio, apenas o que não pertence a plano nenhum.** ([ADR-0051](../../handbook/architecture/adr/0051-taxonomy-owner-budget-plan-scoped.md))

## Quem é dono do quê

| Regime do lançamento         | Fonte da taxonomia                                  |
| ---------------------------- | ---------------------------------------------------- |
| **Planejável** (tem plano)   | a árvore **do plano**, via `budget-plans/public-api` |
| **Operacional** (sem plano)  | `fin_categories` — `group = ajuste` e afins          |

A árvore **Centro de Custo → Categoria → Subcategoria** é **escopada por plano** (`budget_plan_id NOT NULL`). **Não existe taxonomia canônica global.**

## ⚠️ `fin_categories` / `fin_cost_centers` NÃO são deprecadas

Elas não são fonte, não são projeção e **não devem ser removidas**. Retêm a classificação **operacional** de lançamentos que não pertencem a plano algum.

A evidência é irredutível: **`Estorno` e `Ajuste de conciliação` não existem, e nunca existirão, num plano orçamentário — ninguém planeja um estorno.** Uma projeção pura da árvore do plano não teria onde colocá-los.

É por isso que nem "espelhar a árvore" nem "deprecar as tabelas" foram adotados. Se parecer duplicação, releia esta seção antes de agir.

## Consumo é ACL, não import

O `financial` lê a árvore via `budget-plans/public-api` — **Open Host Service** do lado do owner, **Anticorruption Layer** do lado do consumidor. Traduz para o modelo próprio e **nunca importa `budget-plans/domain`** (ADR-0006). Não espelha nem copia a árvore.

## `direction` × `group` não se unificam

| Campo       | Vocabulário de       | Valores                        |
| ----------- | -------------------- | ------------------------------ |
| `direction` | **planejamento**     | `A PAGAR` / `A RECEBER`        |
| `group`     | **lançamento real**  | `despesa` / `receita` / `ajuste` |

O mapeamento é do ACL do consumidor (`A PAGAR`→`despesa`, `A RECEBER`→`receita`). **`ajuste` não tem contraparte no plano — por definição.** Unificar os dois campos apaga essa assimetria e é o erro que o ADR previne.

## Read-model de fornecedor

`fin_supplier_view` é alimentado **só** por eventos do `partners` via outbox ([ADR-0045](../../handbook/architecture/adr/0045-financial-supplier-read-model.md)). O grid faz LEFT JOIN intra-`financial` e **nunca consulta o `partners` em runtime**. `supplierName`/`supplierDocument` vêm `null` enquanto o evento não chegou — consistência eventual é esperada, não bug.
