# BGP-BUDGET-TOTAL-DERIVED — escopo (#458)

> O total do orçamento por Rede e do plano passa a ser **derivado** dos lançamentos. Size **M**
> (transversal). Issue **#458** · FR-007/SC-002 da spec 036 · guarda-chuva **#404**.

## Problema

O total tem **duas fontes** que nada sincroniza: o `valueInCents` **informado** no `POST /budgets` e a
**soma dos `bgp_budget_results` calculados**. A **lista** de Planejamento (tela de entrada) mostra
`R$ 0,00` em todo plano — porque o front manda `valueInCents: 0` (o modal não tem campo de valor) e é
desse informado que sai o `totalInCents` — enquanto o **detalhe do mesmo plano** mostra o calculado
(ex.: R$ 234.287,22). **Dois números para o mesmo plano, na mesma sessão** — a pior forma do bug:
não parece erro, parece que alguém mente.

## Decisão de produto — **JÁ TOMADA** pela P.O. (2026-07-15): **(A) o total é DERIVADO**

Não há trade-off. A investigação do legado foi definitiva:

- O `CreateBudgetDto` do legado **não tem** `valueInCents` — criar um orçamento é **plano + rede**, nada
  mais. Bate com o HANDBOOK §1.6 (modal = "Estado + Adicionar").
- O `budget.valueInCents` **nunca é persistido** no legado (coluna é cache `default 0`; a verdade é a
  soma em cascata mês → categoria → centro).
- Ou seja, o `valueInCents` informado é **invenção do core-api v2** — a "segunda fonte" não deveria
  existir. É exatamente o que o **FR-007** exige (*"sem segunda fonte de verdade para o mesmo número"*).

**Dependência resolvida:** o **#413** (o mês) está na `dev` (PR #459) — a soma dos 12 lançamentos por
conta já existe.

## Desenho

O ponto arquitetural: `BudgetPlan.total` é hoje função pura do agregado (`Σ budgets[].value`). Mas os
lançamentos vivem em **outro** repositório (`BudgetResultRepository`) — o agregado não os conhece.
Logo o total **sai do domínio** e passa a ser composto no application com a soma injetada.

1. **Domínio** — `Budget` perde `value` → `{ id, partner }`. `BudgetPlan.addBudget` perde o input de
   valor. `BudgetPlan.total` **é removido** (não pode somar o que o agregado não tem).
2. **Port `BudgetResultRepository`** — `+sumByBudgetIds(ids): Map<budgetId, cents>` — **uma** query
   `SELECT budget_id, SUM(value_cents) … WHERE budget_id IN (…) GROUP BY budget_id`. É o que evita o
   N+1 na lista: 1 query de planos + 1 de somas para a página inteira.
3. **Application** — helper puro `planTotalCents(plan, sumsByBudget)` = `Σ sums[b.id]`. Os use cases
   que exibem total (**8 call sites**) passam a receber `budgetResultRepo`, coletar os budgetIds da
   página e somar em lote:
   - `list-budget-plans` · `get-budget-plan` · `get-consolidated-result` · `get-budget-plan-insights`
     · `list-scenario-children` · `budget-plan-dto` (lifecycle + create).
4. **Persistência** — **DROP** `bgp_budgets.value_cents` (migration gerada; **greenfield** — nenhum
   ambiente tem plano com orçamento, #374; em QA a coluna é sempre 0). Mapper sem `valueCents`.
   `sumByBudgetIds` nos **2** adapters (drizzle GROUP BY + in-memory).
5. **Borda** — `addBudgetBodySchema` perde `valueInCents` (criar = plano + rede). O `valueInCents`
   **por Rede** na response do detalhe passa a ser o **derivado** (soma dos results daquele budget);
   na criação é 0 (orçamento novo, sem lançamento). O `totalInCents` do plano vem da mesma soma.

## Critérios de aceite

- [ ] **CA1** — **Dado** um orçamento com lançamentos somando X, **Quando** `GET /budget-plans/:id`,
      **Então** `totalInCents` = **X**, e o `valueInCents` daquela Rede = a soma dos lançamentos dela.
- [ ] **CA2** — **Dado** um lançamento novo/recalculado, **Quando** o total é lido, **Então** reflete
      a mudança **sem passo manual** (é sempre derivado).
- [ ] **CA3** — **Dado** um orçamento **sem** lançamentos, **Quando** lido, **Então** o total é
      **R$ 0,00** (distinguível, não "não informado").
- [ ] **CA4** — **Dado** o **Consolidado ABC** de planos aprovados, **Quando** agregado, **Então** usa
      a **mesma** fonte do detalhe — a lista, o detalhe e o consolidado do MESMO plano coincidem
      (SC-002).
- [ ] **CA5** — **Dado** a **lista** de N planos, **Quando** lida, **Então** o total de cada um é o
      derivado — e o custo é **1 query de somas** para a página, não uma por plano (sem N+1).
- [ ] **CA6** — **Dado** `POST /budgets`, **Quando** o body traz `valueInCents`, **Então** o campo é
      **ignorado/rejeitado** (não existe mais no schema) — criar é plano + rede.
- [ ] **CA7** — **Dado** os **Insights** (Planejado × Realizado), **Quando** lidos, **Então** o
      Planejado de cada ano usa a soma derivada (mesma fonte do #416).

## Fora de escopo

- **Teto/meta com alerta de estouro** — a P.O. descartou por ora; é feature nova (outro campo, outro
  comportamento), não paridade. Registrar se pedirem.
- Front (remover o campo "valor" do modal; a lista passa a exibir o derivado) — outro repo.

## Invariantes

- Domínio puro: sem `throw`/`class`, `Result<T,E>`, erros EN kebab-case.
- Mudança de assinatura **transversal** — NÃO fatiar por camada (lição #373/#413): domínio, persist e
  HTTP num ticket só.
- ADR-0014 (só `bgp_*`) · ADR-0020 · ADR-0006 (a soma cruza dois agregados do **mesmo** módulo — OK).
- Migration gerada por drizzle-kit, nunca à mão.
- Regressão zero: baseline **4146** testes, 0 falhas.
- Validação em **MySQL real** (container descartável; `test:integration:*` **destrói a infra dev**).

## Waves

| Wave | Agente/Skill | Saída |
| :--- | :--- | :--- |
| **W0** | `tdd-strategist` | `002-tests/REPORT.md` — RED |
| **W1** | `ts-domain-modeler` (agregado) + `drizzle-orm-expert` (SUM/GROUP BY) | `003-impl/REPORT.md` |
| **W2** | `code-reviewer` | `004-code-review/REVIEW.md` — máx 3 rounds |
| **W3** | `ts-quality-checker` | `005-quality/REPORT.md` |
