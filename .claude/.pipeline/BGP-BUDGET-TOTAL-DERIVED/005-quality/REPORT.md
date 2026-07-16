# W3 — Gate de qualidade (#458)

> Agente: `ts-quality-checker` · Resultado: **VERDE**.

## Gate

| Comando | Exit |
| :--- | :--- |
| `pnpm run typecheck` | **0** |
| `pnpm run format:check` | **0** |
| `pnpm run lint` | **0** |
| `pnpm test` | **0** |

`pnpm test`: **4163 testes · pass 4140 · fail 0 · skipped 18** (baseline 4146 + 17).

## MySQL real (8.4) — container descartável

`budget-total-derived.routes.test.ts` roda no `pnpm test` puro (in-memory). As suítes drizzle
hardcodam `127.0.0.1:3306` → receita: parar `core-api-mysql` → descartável na 3306 → validar →
**restaurar** (feito, `Up (healthy)` conferido). Nunca `pnpm test:integration:*` — destrói a infra dev.

**36/36** na 1ª rodada (W1) + **20/20** na revalidação pós-Blocker (W2): `sumByBudgetIds` na suíte de
contrato · `drizzle-mysql` · `consolidated` · `remove-budget-atomic` · `plan-lifecycle` — todos com a
coluna `value_cents` já dropada.

## CAs

| CA | Prova |
| :--- | :--- |
| CA1 | `GET /:id` → total = soma dos lançamentos; `valueInCents` da Rede idem |
| CA2 | recalcular o mês (upsert) não duplica — total reflete o novo valor |
| CA3 | orçamento sem lançamento → **R$ 0,00** (não "não informado") |
| CA4 | consolidado usa a mesma fonte — lista == detalhe == consolidado (SC-002) |
| CA5 | lista de N planos — **1** query de somas, sem N+1 |
| CA6 | `POST /budgets` sem `valueInCents` → 201 (criar = plano + Rede) |
| CA7 | insights: Planejado = soma derivada |
| +W2 | **calibração/cenário: a 201 mostra o total do filho clonado, não 0** (regressão do Blocker) |

## O que muda em produção

- **`bgp_budgets.value_cents` DROPADO** (migration 0008). Greenfield: nenhum ambiente tem plano com
  orçamento (#374); em QA a coluna era sempre 0. Sem perda de dado.
- **`POST /budgets` não aceita mais `valueInCents`** — o front deve remover o campo "valor" do modal
  "Adicionar Orçamento" (outro repo; a P.O. já combinou). Um valor extra no body é ignorado (strip).
- **Todas as visões passam a mostrar o total derivado** — lista, detalhe, consolidado, insights,
  calibração/cenário. Fim dos "dois números para o mesmo plano".

## Correções de paridade in-memory que o ticket exigiu (produção drizzle já era correta)

Dois readers in-memory eram seeds fixos desconectados do store, e por isso divergiam do drizzle:

- **`BudgetExistsReader`** — passou a reconhecer budgets criados via POST (`hasBudget` do planRepo).
- **`SubcategoryLaunchTypeReader`** — passou a reconhecer subcategorias criadas na árvore
  (`launchTypeOf` do costStructureRepo).

Ambos mantêm o seed legado. É a mesma fonte que o drizzle já usava (`bgp_budgets` /
`bgp_subcategories`) — não muda produção, só fecha o gap dos fakes.

## Ticket

Pronto para `close` e PR. Depende de **#413** (já na `dev`). **Front:** remover o campo "valor" do
modal e passar a exibir o derivado (outro repo).
