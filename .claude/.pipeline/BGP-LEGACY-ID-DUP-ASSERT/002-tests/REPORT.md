# W0 — REPORT (RED) · BGP-LEGACY-ID-DUP-ASSERT (#520)

> Size S, test-only. Skill: `tdd-strategist`. Fix de asserção — o teste JÁ existe e está RED contra
> MySQL real; o W1 corrige a asserção (não há mudança em `src/`).

## RED confirmado — MySQL 8.4 real (x99, isolado)

`legacy-id.drizzle-mysql.test.ts` CA3, contra MySQL 8.4 isolado:

```
ℹ tests 37 · pass 31 · fail 6
✖ bgp_budget_plans: mesmo legacy_id em duas linhas -> ER_DUP_ENTRY   expected: /duplicate/i
✖ bgp_budgets / bgp_cost_centers / bgp_categories / bgp_subcategories / bgp_budget_results  (idem)
```

**RED pelo motivo certo:** a UNIQUE `legacy_id` FUNCIONA — o 2º INSERT lança `ER_DUP_ENTRY`. Mas o
matcher `/duplicate/i` (2º arg de `assert.rejects`) é testado só contra `err.message` de topo
(`Failed query: INSERT ...`); o `Duplicate entry`/`errno 1062` fica em `err.cause`. Regex não casa → os
6 casos (um por tabela `bgp_*`) falham. Confirma o diagnóstico da #520 e a memória
`drizzle-execute-error-cause-errno`.

## Premissa para o W1

Trocar o `RegExp` por predicado `cause?.errno === 1062` (molde canônico
`financial/.../payable-paid-at-check.drizzle-mysql.test.ts:87-92`) no corpo do `for` do CA3 (linha 255).
Cobre as 6 tabelas de uma vez. Não afrouxa (1062 é mais estrito que substring).
