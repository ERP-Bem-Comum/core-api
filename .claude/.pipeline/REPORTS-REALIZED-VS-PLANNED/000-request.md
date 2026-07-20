# REPORTS-REALIZED-VS-PLANNED — escopo (fatia "Realizado × Planejado" · épico #114)

> Size **L**. Porta o `GET reports/realized` do legado: árvore **Centro de Custo → Categoria →
> Subcategoria**, cada nível com **previsto / realizado / provisionado**, total do ano + os 12 meses.
> A tela **já está replicada no front** — falta o endpoint.

## Fonte da verdade deste escopo

Tudo abaixo foi **verificado**, não suposto:
- **Contrato do legado:** `handbook/legacy_docs/openapi.yaml` (`/reports/realized`, schemas `RealizedReport`
  e `RealizedMonth`).
- **Export real do legado:** `realizado_x_planejado.csv` — 7 colunas, **5.040 linhas** (420 combinações
  × 12 meses; 504 linhas em nível de categoria, 4.536 em subcategoria).
- **Telas:** legado + a replicação do front (que melhorou a leitura: cards de topo, hierarquia
  expansível, AV %).
- **Regras de negócio:** definidas pela P.O. (2026-07-20), ver §As três medidas.

## Contrato (do legado, a replicar)

**Filtros** — todos existem no modelo novo: `programId` · `budgetPlanId` · `partnerStateId` ·
`partnerMunicipalityId` · **`year` (obrigatório)**.

**Resposta** — árvore de 3 níveis; em cada nó, os 3 totais + `months[]`:

```
{ totalExpected, totalRealized, totalProvisioned,
  costCenters[] { id, name, budgetPlanId, totais…,
    categories[] { id, name, totais…, months[],
      subCategories[] { id, name, totais…, months[] } } } }

RealizedMonth = { month: 1..12, expected, realized, provisioned }
```

O CSV do legado é a mesma informação achatada:
`Centro de Custo · Categoria · Subcategoria · Nome do Mês · Valor Esperado · Valor Realizado · Valor Provisionado`.

## As três medidas (regras da P.O., 2026-07-20)

| Medida | Regra | Fonte |
| :-- | :-- | :-- |
| **Previsto** (`expected`) | vem **direto do módulo de Orçamento** | `bgp_budget_results` (migrado no `ETL-BUDGET-PLANS`): `value_cents` por `(budget, subcategoria, mês)` |
| **Realizado** (`realized`) | título (a pagar **ou** a receber) **conciliado** | `fin_reconciliation_items` (`reconciliationId` → `payableId`, `reconciledValueCents`) |
| **Provisionado** (`provisioned`) | título **aprovado e ainda NÃO conciliado** ("comprometido a pagar") | `fin_payables`/`fin_payable_view` com `status='Approved'` **sem** item de conciliação |

> ⚠️ **A pagar OU a receber:** a regra do realizado cita os dois. **Contas a Receber não existe** no
> core-api — logo, hoje o realizado cobre só o lado **a pagar**. Não é lacuna deste ticket; é
> dependência de módulo inexistente. **Registrar no ticket e no contrato** para ninguém ler o número
> como se incluísse recebimentos.

## Chave de junção orçado × realizado (verificada)

O `fin_documents` carrega **`budgetPlanRef` + `categoryRef`** (refs cross-BC, sem FK física —
ADR-0014). O **ADR-0051** fecha a regra:

> "O `budget-plans` é o owner da taxonomia do que é planejável. O `financial` não a duplica — lê do
> plano." · "Regime **planejável** (tem plano) → árvore **do plano**, via `budget-plans/public-api`."

Então o join é: **lançamento planejável → `budgetPlanRef` + `categoryRef` → nó da árvore do plano**.

⚠️ **Lançamento operacional não tem contraparte no plano — por definição** (ADR-0051: *"`Estorno` e
`Ajuste de conciliação` não existem, e nunca existirão, num plano orçamentário"*). Ver §Decisão pendente.

## ⚠️ Bloqueio conhecido: o `budget-plans` não expõe read port

`budget-plans/public-api/` tem `etl`, `events`, `http`, `migrate`, `permissions` — **nenhuma leitura
cross-módulo**. O `reports` não consegue ler o orçado sem violar o ADR-0006.

**É o maior item de trabalho do ticket** e a razão do size L: criar o read port (Open Host Service) do
`budget-plans` que exponha a árvore do plano + os valores planejados por `(nó, mês)`.

## Escopo (in)

1. **`budget-plans/public-api/read.ts`** (novo) — OHS boot-scoped (pool 1×, incidente RDS 0001):
   árvore do plano (centro → categoria → subcategoria) + `value_cents` por `(subcategoria, mês)`,
   filtrável por programa/plano/ano/Rede.
2. **`financial/public-api`** — leitura agregada de realizado e provisionado por
   `(budgetPlanRef, categoryRef, mês)`, conforme as regras acima.
3. **`reports`** — port + adapter ACL que costura as duas fontes na árvore, rota
   `GET /api/v2/reports/realized`, Zod `.strict()`, gate `collaborator:read`-equivalente do módulo
   financeiro (definir: provavelmente `budget-plan:read` + `payable:read`).

## Fora de escopo
CSV/PDF server-side (o front monta do JSON) · Contas a Receber · Dashboard · demais fatias do #114.

## Decisão pendente — o que fazer com o realizado SEM contraparte no plano

Existe lançamento realizado que não tem linha orçada (ADR-0051: estorno, ajuste — "ninguém planeja um
estorno"), e lançamento planejável cujo nó não está no plano filtrado.

- **(a)** Linha **"Sem orçamento previsto"** no relatório — o gestor vê que gastou fora do plano.
- **(b)** Omitir — compara só o planejável.

**Recomendação: (a).** Um Realizado × Planejado que esconde o gasto não-planejado engana. Mesmo
princípio do "nada some em silêncio" aplicado nos gráficos demográficos. **Confirmar com a P.O.**

## Critérios de aceite

- **CA1** `GET /api/v2/reports/realized?year=YYYY` devolve a árvore de 3 níveis com os 3 totais em cada
  nó + `months[]` de 12 posições.
- **CA2** **Previsto** = soma de `bgp_budget_results.value_cents` do nó/mês, escopado pelos filtros.
- **CA3** **Realizado** = soma dos títulos **conciliados** (via `fin_reconciliation_items`) do nó/mês.
- **CA4** **Provisionado** = soma dos títulos **aprovados e não conciliados** do nó/mês. Um título
  **nunca** conta nas duas medidas (realizado ⊻ provisionado).
- **CA5** Soma dos 12 meses == total do nó; soma dos nós filhos == total do pai; soma dos centros ==
  total geral. **Nas 3 medidas.**
- **CA6** Filtros (programa, plano, estado, município, ano) aplicam-se às 3 medidas coerentemente.
- **CA7** Nó sem movimento aparece com **zero**, não some (a árvore vem do plano, não do realizado).
- **CA8** O realizado cobre **só contas a pagar** enquanto Contas a Receber não existir — documentado
  no contrato/resposta, não silencioso.
- **CA9** ADR-0006: o `reports` lê `budget-plans` e `financial` **só** pelas public-api.
- **CA10** Regressão zero nos relatórios existentes.

## Pipeline

| Wave | Skill/agente | Atividade |
| :-- | :-- | :-- |
| W0 | `tdd-strategist` | RED — as 3 medidas + somas hierárquicas (CA5) + filtros |
| W1 | `ports-and-adapters` (par `drizzle-orm-expert` nos readers, `zod-expert` no schema) | read port do budget-plans + leitura do financial + costura + rota |
| W2 | `code-reviewer` | audit read-only (foco: ADR-0006/0051, realizado ⊻ provisionado) |
| W3 | `ts-quality-checker` | gate + integração |

## Fatiamento sugerido (L → 3)

1. **`BGP-READ-PORT`** (M) — o read port do `budget-plans`. Isolado, destrava o resto e serve outros
   relatórios (Relatório Geral vai precisar).
2. **`FIN-REALIZED-PROVISIONED-READ`** (M) — leitura agregada de realizado/provisionado no `financial`.
3. **`REPORTS-REALIZED-ENDPOINT`** (M) — costura + rota + Zod.
