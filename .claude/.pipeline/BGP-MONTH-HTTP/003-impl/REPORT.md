# W1 — Implementação GREEN · BGP-MONTH-HTTP (#413)

**Agente/Skill:** `fastify-server-expert` + `zod-expert` (par obrigatório em schema de borda) · **Outcome:** **GREEN** · **Data:** 2026-07-15

## Resultado

```
ℹ tests 16 · pass 16 · fail 0     (budget-result.routes.test.ts)
$ tsc --noEmit                     (0 erros)
```

## Entregue

| Arquivo | Mudança |
| :--- | :--- |
| `adapters/http/budget-result-dto.ts` | `+month` na serialização — vale para **as 5 rotas** (4 POSTs + GET), que compartilham o DTO |
| `adapters/http/schemas.ts` | `+month` em `budgetResultResponseSchema`; **novo** `budgetResultByBudgetQuerySchema` |
| `adapters/http/plugin.ts` | `querystring` declarada na rota `by-budget`; repassa `req.query.month` |
| `application/use-cases/get-budget-results.ts` | `monthRaw?: number` → `ExerciseMonth.parse` → filtro; **o total acompanha o recorte** |

## Decisões de implementação

### `z.coerce` na query, `z.int()` no body — e por quê

```ts
// query (string) — coerção necessária
month: z.coerce.number().int().min(1).max(12).optional()
// body (JSON) — o front manda número; coerção mascararia "banana" → NaN
month: z.int().min(1).max(12)
```

A coerção roda **antes** da validação: `"banana"` → `NaN` e `"3.5"` → `3.5` são **ambos** barrados por `int/min/max`. Nenhum vira mês silenciosamente. Segue o molde de `listBudgetPlansQuerySchema`.

### Filtro em memória, não no repositório — decisão consciente

O `?month=` filtra o resultado de `listByBudgetId`, sem ampliar o port com `listByBudgetIdAndMonth`. Razão: a leitura **já traz o ano do orçamento** (~1.9k itens no pior caso — research §D4), e o CA5 fixa que o grid carrega os 12 meses **numa ida** (o passador é client-side). O `?month=` é **conveniência de API**, não caminho de performance. Um método novo no port custaria mais do que entrega — e teria de ser replicado nos dois adapters.

Registrado como escolha, não descuido: se o volume crescer (ex.: consolidado multi-rede), a query desce para o banco.

### O total acompanha o recorte

`total` é somado **sobre os itens devolvidos**, não sobre a lista inteira. Um filtro aplicado aos itens mas não à soma faria a resposta mentir — a mesma classe do Blocker que o W2 pegou na fatia 2 (id inexistente na response). O teste do CA3 trava isso.

### `month` no DTO alcança as 5 rotas de graça

`budgetResultToDto` é compartilhado pelos 4 POSTs e pelo GET — daí o CA2 (mês na 201) sair junto do CA1, sem código extra.

## Critérios de aceite

| CA | Estado | Evidência |
| :-- | :--- | :--- |
| **CA1** — `month` no item do GET | ✅ | `items[0].month === 3` |
| **CA2** — `month` na 201 do POST | ✅ | body `.month === 7` |
| **CA3** — `?month=3` filtra + total do recorte | ✅ | 1 item, `totalInCents` = 104500 |
| **CA4** — query inválida → 400 | ✅ | `banana`, `0`, `13`, `3.5`, `-1` |
| **CA5** — sem filtro = ano inteiro | ✅ | 12 itens numa ida |
| **CA6** — total = soma dos 12 | ✅ | **4.405.104** (prova da P.O., #454) |

## Conformidade

| Regra | Estado |
| :--- | :--- |
| Borda Fastify + Zod (ADR-0025/0027) | ✅ contract-first; `satisfies FastifyZodOpenApiSchema` |
| Soma no domínio, não na borda | ✅ `Money.add` no use case |
| Erros EN kebab | ✅ `exercise-month-invalid` propaga do VO |
| Isolamento de módulo | ✅ nada fora de `budget-plans/` |
| Application não importa `adapters/` | ✅ |

## Próxima wave

**W2** — `code-reviewer` (read-only, máx 3 rounds).
