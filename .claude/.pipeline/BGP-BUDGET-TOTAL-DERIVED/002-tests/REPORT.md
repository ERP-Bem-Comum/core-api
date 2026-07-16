# W0 — Testes RED (#458)

> Agente: `tdd-strategist` · Resultado: **RED** · 3 arquivos, 14 casos.

## Arquivos

| Arquivo | CAs | Camada |
| :--- | :--- | :--- |
| `application/plan-total.test.ts` | CA3 + soma | unit (helper puro) |
| `adapters/persistence/budget-result-repository.suite.ts` (+4) | `sumByBudgetIds` | contract (**2** adapters) |
| `adapters/http/budget-total-derived.routes.test.ts` | CA1/CA2/CA3/CA4/CA5/CA6 | borda (`fastify.inject`) |

## O teste de borda é o bug que a P.O. vê

O caso central (`CA5+CA1: a LISTA mostra o mesmo total do detalhe`) reproduz exatamente o sintoma do
3º comentário da issue: a lista devolvendo `R$ 0,00` enquanto o detalhe do mesmo plano mostra o
calculado. O teste exige que **lista == detalhe == consolidado** para o mesmo plano (SC-002).

**RED pelo motivo certo, não por setup:** o `POST /budgets` sem `valueInCents` responde **400
`validation`** hoje — o schema ainda exige o campo. É o que o CA6 remove. Confirmado no log:

```
add budget sem valueInCents deve funcionar: {"error":{"code":"validation",…}}  400 !== 201
```

## Por que `sumByBudgetIds` (e não um `listByBudgetId` por plano)

O CA5 trava o custo: a lista de N planos não pode fazer uma query de soma **por plano** (N+1). O
`sumByBudgetIds([...])` é **uma** agregação (`SUM … GROUP BY budget_id`) para a página inteira. Os 4
casos da suíte cobrem: soma multi-mês, agrupamento sem vazamento entre orçamentos, orçamento sem
lançamento **ausente do mapa** (o caller trata como 0 — CA3), e lista vazia → mapa vazio (sem query
degenerada `IN ()`).

## `planTotalCents` é do application, não do agregado

`BudgetPlan.total` era função pura do agregado (`Σ budgets[].value`). Com o valor saindo do agregado,
a soma passa a depender dos `budget_results` — **outro** repositório. `planTotalCents(plan, sums)` é
pura (recebe o mapa, não faz I/O) mas vive no application porque cruza dois agregados do módulo. O
teste `ignora somas de budgets que não são deste plano` trava o escopo pelo agregado.

## Decisão de produto — já registrada

A P.O. decidiu **(A) total derivado** (2026-07-15, 2 comentários na #458): o `valueInCents` informado
é invenção do core-api v2, o legado não o tem nem persiste. Não há trade-off a decidir no W1.

## Gating

Os casos MySQL da suíte ficam atrás de `MYSQL_INTEGRATION=1`. Validação em container **descartável**
no W1/W3 — `test:integration:*` **destrói a infra dev**.

## Próxima wave

**W1** — `ts-domain-modeler` (agregado perde `value`/`total`) + `drizzle-orm-expert` (SUM/GROUP BY +
DROP da coluna). Mudança **transversal** — domínio, persist e HTTP no mesmo ticket (lição #373/#413).
