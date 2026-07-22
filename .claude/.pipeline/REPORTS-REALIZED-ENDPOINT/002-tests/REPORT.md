# REPORTS-REALIZED-ENDPOINT — W0 (RED)

> S6 (fatia final) do épico #502 · `tdd-strategist` · 2026-07-22. `src/` intocado. Re-escopo honrado:
> a folha (subcategoria) **tem número**, não zero.

## Testes (3 arquivos)

| Arquivo | Frente | Roda em | RED por |
| :-- | :-- | :-- | :-- |
| `tests/modules/reports/adapters/persistence/realized-read.stitch.test.ts` | B (costura pura) | `pnpm test` puro | `ERR_MODULE_NOT_FOUND` (stitch ausente) |
| `tests/modules/reports/adapters/http/reports-realized.http.test.ts` | B (rota) | `pnpm test` puro | rota 404 (11 casos; 2 CA10 verdes) |
| `tests/modules/budget-plans/adapters/persistence/planned-amounts-or-filter.drizzle-mysql.test.ts` | A (OR) | gated (#500) | AND zera; RED contra MySQL, não executado |

## Prova do RED
Baseline 4280/4261/0 → depois **4295 / 4264 pass / 12 fail / 19 skip**. `pass` **não caiu** (+2 CA10 +1 gated inerte).
12 fails isolados nos 2 arquivos novos (reconferido no fio principal: stitch 1 + rota 11).

## Assinatura para o W1
- **Port** `reports/application/ports/realized-read.ts`: `RealizedReport` (costCenters→categories→subCategories,
  3 totais/nó, `months[12]` em categoria+subcategoria; realized/provisioned **na folha**), `RealizedFilter`
  (`year!`, refs opcionais), `RealizedReadPort.list → Result<RealizedReport,'realized-read-unavailable'>`.
- **Costura** `realized-read.stitch.ts`: `stitchRealizedReport(planned, financial)`. Árvore do PLANO; casa
  por `(budgetPlanId==budgetPlanRef, subcategoryId==subcategoryRef, mês)`; **`financial.categoryRef` IGNORADO**
  (categoria da trilha do plano — CA6); doc+manual na mesma folha **somam**.
- **ACL** `realized-read.from-sources.ts` (abre os 2 readers no boot) + `in-memory.ts`.
- **Rota** `GET /api/v2/reports/realized`, Zod `.strict()` (`year` obrigatório), gate `budget-plan:read` **AND**
  `fiscal-document:read` (payable:read não existe). Wiring `composition/plugin/server`.
- **Frente A**: OR no `ON` de `planned-amounts-read.drizzle.ts` quando ambos os filtros de Rede vêm.

## Armadilhas (W1/W2)
1. **Categoria vem do PLANO** — casar só por `subcategoryRef`; `categoryRef=null` do manual não cria nó fantasma (CA6).
2. **Não duplicar** — realizado entra na folha e sobe por soma; nunca somar direto na categoria.
3. **CA7b** — órfão `(budgetPlanRef, subcategoryRef)` sem plano → "Sem orcamento previsto" (expected=0), nos totais; inclui subcategoryRef=null.
4. **OR só com ambos os filtros**, e **no ON** (WHERE mataria os meses zerados).
5. Grade de 12 sempre, 1..12, zerados inclusos.
6. **Âncora nota 10:** doc 5000 (CAT1) + manual 500 (categoryRef=null) na mesma folha → realized=5500.

## Próximo passo
W1 (GREEN) — `ports-and-adapters` + `fastify-server-expert`.
