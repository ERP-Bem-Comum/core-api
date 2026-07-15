# W0 — Testes RED · BGP-MONTH-HTTP (#413)

**Agente/Skill:** `tdd-strategist` · **Outcome:** **RED** · **Data:** 2026-07-15

## Suíte estendida

`tests/modules/budget-plans/adapters/http/budget-result.routes.test.ts` — 5 casos novos, via `fastify.inject` (borda real: Zod + rota + authz + use case).

## RED — os 5 falham, os antigos seguem verdes

```
✔ CA1: IPCA calcula e persiste -> 201 + valueInCents (paridade legado)
✔ CA2: modelo ≠ launchType da subcategoria -> 400 (calc-model-mismatch)
✔ CA3: lista os lançamentos do orçamento + soma (totalInCents)

✖ CA1: o item da lista traz o mês do lançamento
✖ CA2: a 201 do POST devolve o mês
✖ CA3: ?month=3 filtra só março
✖ CA4: ?month inválido -> 400 (Zod)
✖ CA5/CA6: sem ?month, devolve o ano inteiro e soma o anual (3.670,92 × 12)
```

**RED correto:** o `budgetResultToDto` (`budget-result-dto.ts:9-15`) não serializa `month`, e a rota `by-budget` não declara `querystring` no schema. Os verdes provam que a suíte existente não regrediu.

## Cobertura por critério de aceite

| CA | Teste | Estado |
| :-- | :--- | :--- |
| **CA1** — `month` no item do GET | POST mês 3 → GET → `items[0].month === 3` | RED |
| **CA2** — `month` na 201 do POST | POST mês 7 → body `.month === 7` | RED |
| **CA3** — `?month=3` filtra | semeia 2/3/4 → `?month=3` → 1 item, e o **total acompanha o recorte** | RED |
| **CA4** — query inválida → 400 | `banana`, `0`, `13`, `3.5`, `-1` | RED |
| **CA5** — sem filtro = ano inteiro | 12 meses → 12 itens numa ida | RED |
| **CA6** — total = soma dos 12 | **4.405.104** centavos (prova da P.O., #454) | RED |

## Decisões de teste

- **`?month=banana` E `?month=0/13/3.5/-1` no mesmo caso:** o `z.coerce` transforma **antes** de validar — `"banana"` → `NaN` e `"3.5"` → `3.5` seguem caminhos distintos. Testar só a string não-numérica deixaria passar `0`/`13`, que é o off-by-one clássico.
- **CA3 assevera o `totalInCents` do recorte**, não só a contagem: um filtro aplicado aos itens mas **não** à soma passaria despercebido — e a resposta mentiria (mesma classe do Blocker que o W2 pegou na fatia 2).
- **CA5 assevera 12 itens numa única ida:** trava a decisão de design (research §D4) de o grid carregar o ano inteiro e o passador de mês ser **client-side**. Se alguém introduzir paginação ou filtro obrigatório, quebra aqui.
- **Sem mock:** `fastify.inject` exercita Zod, rota, authz e use case de verdade.

## Próxima wave

**W1** — `fastify-server-expert` + `zod-expert` (par obrigatório quando se mexe em schema de borda).
