# 🗂️ Taxonomia de categorização — owner e leitura (Plano → Centro → Categoria → Subcategoria)

> **Normativo:** [ADR-0051](../../architecture/adr/0051-taxonomy-owner-budget-plan-scoped.md) (Accepted, 2026-07-15) — resolve o follow-up prometido no #341 e aberto como **#448**.
> A hierarquia canônica tem **4 níveis**: **Plano Orçamentário → Centro de Custo → Categoria → Subcategoria**.

## Owner = Plano Orçamentário (`budget-plans`)

O `budget-plans` modela a árvore com CRUD, **escopada por plano** (`bgp_cost_centers → bgp_categories[cost_center_id] → bgp_subcategories`, cada nó FK ao pai, sob `budget_plan_id` **NOT NULL**). É a **fonte de verdade** da estrutura do que é **planejável**. No front v2, os Centros de Custo são criados nesse módulo (web-app S2.2).

**Não existe taxonomia canônica _global_.** A premissa de negócio (P.O., 2026-07-15, ratificando o legado) é: _"tudo se vincula ao PLANO"_.

## A fronteira: planejável × operacional

As duas árvores **não se unificam** — servem a propósitos diferentes (ADR-0051 §"Decisão"; Evans, _DDD_, p. 199):

|                | `bgp_*` (Orçamento)                       | `fin_*` (Financeiro)                        |
| :------------- | :---------------------------------------- | :------------------------------------------ |
| Escopo         | **por plano**                             | global                                      |
| Direcionamento | `direction` ∈ `A PAGAR` / `A RECEBER`     | `group` ∈ `despesa` / `receita` / `ajuste`  |
| Folha          | subcategoria com **Tipo de lançamento**   | subcategoria = categoria com `parentId`     |
| Serve para     | **planejar**                              | **classificar o lançamento real**           |

| Regime do lançamento        | Fonte da taxonomia                                |
| :-------------------------- | :------------------------------------------------ |
| **Planejável** (tem plano)  | árvore **do plano**, via `budget-plans/public-api` |
| **Operacional** (sem plano) | `fin_categories` (`group = ajuste` e afins)        |

## Como cada módulo lê

- **`financial`** (Lançar Documento · Conciliação): lê a árvore **do plano do documento** via `budget-plans/public-api` (ADR-0006) — **Open Host Service** no owner, **Anticorruption Layer** no consumidor (Vernon, _IDDD_, p. 142). **Não espelha, não copia, nunca importa `budget-plans/domain`**. Traduz `direction → group` (`A PAGAR`→`despesa`, `A RECEBER`→`receita`); **`ajuste` não tem contraparte no plano, por definição**.
- **`contracts`** (#343 — campo subcategoria): mesma regra, pelo plano do contrato.
- **`reports`**: lê projeções; a raiz "Plano Orçamentário → Centro de Custo" depende de `fin_payable_view` projetar o plano (**#446**).

## Destino de `fin_categories` / `fin_cost_centers`

**Não são fonte, não são projeção, não são deprecadas.** Retêm **o que não é planejável** — a classificação **operacional**. Evidência irredutível (medida em QA, 2026-07-15): as categorias `ajuste` são **`Estorno`** e **`Ajuste de conciliação`** — que **não existem, e nunca existirão, num plano orçamentário**. Ninguém planeja um estorno.

As colunas `parent_id` (#147) e `cost_center_id` (#341) permanecem: descrevem a hierarquia **dentro** do catálogo operacional.

## Regra do ETL do legado (pré-requisito da migração — ADR-0051 §5)

O legado tem **34 categorias + 158 subcategorias**, por programa, **100% despesa** (0 de receita), com **uma cópia por plano/ano** — que é exatamente o modelo `bgp_*`.

- A árvore de **planejamento** do legado migra como **estrutura de planos** (`bgp_*`). **`fin_categories` não recebe as 158 subcategorias.**
- A categorização dos **documentos/títulos** legados **não muda**: segue o [ADR-0048](../../architecture/adr/0048-legacy-categorization-installments-mapping.md) §D1 — a 020 fica **intocada**, hierarquia legada **achatada** via o Mapa A. O ADR-0051 **não reabre** isso.
- **Convergência:** o ADR-0048 (jun/2026, antes de o `budget-plans` existir) já mapeava `releaseType` → _"Camada 3 (Budget Plans), não de categorização de lançamento"_ e registrava que _"`ajuste` é novo (sem origem legada)"_. O ADR-0051 nomeia o owner dessa Camada 3.

## Histórico

- **#341 (fechada):** entregou a *capacidade* — `costCenterId` na categoria do financial + read/DTO + seed shape. O `budget-plans` não foi tocado. O 3º critério de aceite (documentar o owner) ficou em aberto.
- **#448 → ADR-0051 (Accepted):** decide o owner e encerra a _"divergência aceita por ora"_ que este documento registrava. A divergência passa a ser **deliberada e delimitada** (planejável × operacional), não acidental.
- **#443:** muda de natureza — não se semeia `fin_categories` com a árvore do legado; ela vira plano. Passa a depender do ETL de planos (Gap 2 do #374).
