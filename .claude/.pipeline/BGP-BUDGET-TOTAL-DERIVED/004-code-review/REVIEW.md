# W2 — Code review (#458)

> Agente: `code-reviewer` (read-only, independente) · **Round 1 de 3** · Veredito inicial: **REJEITADO** (1 Blocker) → corrigido → **APROVADO**.

## Blocker — a resposta 201 de calibração/cenário reintroduzia o bug-mãe do ticket

O revisor pegou um erro **meu**, factual: eu fixei `totalInCents: 0` nas responses de
`start-calibration` e `create-scenery` justificando *"o filho nasce vazio"*. **Falso.** O
`clonePlanContent` (chamado por dentro dos dois use cases) **clona os budgets E os `budget_results`**
com valores — o filho volta **populado**.

> Cenário: plano APROVADO com lançamentos somando R$ 234.287,22 → `POST /start-calibration` clona
> tudo no filho → a resposta **201** dizia `totalInCents: 0`, enquanto `GET /budget-plans/<filho>`
> devolvia o total real. **Dois números para o mesmo plano na mesma sessão** — exatamente o SC-002 /
> FR-007 que o #458 existe para matar, reintroduzido numa superfície HTTP. E era **regressão**: antes
> do #458 o `lifecyclePlanToDto` usava `BudgetPlan.total` (Σ dos values clonados, coerente).

**Correção:** o `clonePlanContent` passou a devolver `{ plan, totalInCents }` (computa
`sumByBudgetIds(child.budgets)`, como o `approve`); `start-calibration`/`create-scenery` herdam o
outcome; os dois handlers passam `result.value.totalInCents`. Os comentários factualmente errados
("nasce sem orçamentos") foram corrigidos.

## O teste do Blocker exigiu consertar mais um gap de paridade in-memory

Ao escrever o teste de regressão, ele **passava sem provar nada**: eu lançava numa subcategoria
semeada (`subcategoryLaunchTypes`) que **não estava na árvore de custos**, e o clone só copia results
de subcategorias **clonadas** — então o filho não recebia o lançamento (total 0 por outro motivo). Em
produção (drizzle, com árvore real) o Blocker se materializa; o teste é que atalhava.

Isso expôs o **mesmo gap do budgetReader**: o `SubcategoryLaunchTypeReader` in-memory era um seed
fixo, desconectado da árvore. **Cura correta** (não workaround): o reader passou a consultar também
as árvores do `costStructureRepo` (`launchTypeOf`), mantendo o seed legado — paridade com o drizzle,
que lê `bgp_subcategories`. Agora o teste monta a árvore, lança numa subcategoria dela, e o clone
copia de verdade. Os dois casos (calibração + cenário) travam `response 201 == detalhe`.

## Verificações que passaram (o revisor conferiu, não assumiu)

- **N+1 sumiu de verdade** — `list`, `consolidado`, `insights` (plano atual + anteriores num batch) e
  `scenario-children` fazem **uma** `sumByBudgetIds` antes de qualquer laço. `get-budget-plan` é
  plano único.
- **`sql<string>` + `Number()`** — honesto com o runtime (mysql2 devolve SUM sobre BIGINT como
  string) e **idêntico ao precedente** (5 projeções no `financial`). Magnitude de cents não se
  aproxima de `MAX_SAFE_INTEGER`.
- **`inArray(col, [])`** — guard `length === 0 → Map vazio` no drizzle; paridade no in-memory.
- **`hasBudget`** — um budget "existe" sse um plano **persistido** o contém (espelha o SELECT em
  `bgp_budgets`); sem falso positivo; `fromStore` default preserva os call sites seed-only.
- **DROP `value_cents`** — `grep` confirma nenhum leitor residual (os hits são a **outra** tabela
  `bgp_budget_results` e migrations históricas). Mapper consistente.
- **ADR-0020** — `SUM` está na lista de **permitidas** (citada literalmente, `:83`); `IN`/`GROUP BY`
  não constam nas proibidas.
- **Aderência** — domínio sem throw/class; `import type`; erros kebab-case; `plan-total.ts` puro.

## Re-verificação após a correção

`typecheck` ✓ · `lint` ✓ · `format:check` ✓ · `pnpm test` → **4163 testes, fail 0** (2 casos novos
do Blocker). MySQL real (8.4, descartável): **20/20** — `budget-result` (com `sumByBudgetIds`),
`plan-lifecycle`, `consolidated`. Infra dev **restaurada** (`Up (healthy)`).

## Veredito final: **APROVADO** — round 1
