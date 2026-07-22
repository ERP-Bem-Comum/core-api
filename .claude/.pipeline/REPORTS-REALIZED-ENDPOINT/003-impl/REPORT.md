# REPORTS-REALIZED-ENDPOINT — W1 (GREEN)

> S6 (final) do épico #502 · `ports-and-adapters` + `fastify-server-expert` · 2026-07-22. 12 fails → 0. Nenhum teste editado.

## Arquivos por camada
- **Port:** `reports/application/ports/realized-read.ts` (árvore + filtro + `RealizedReadPort`).
- **Costura:** `realized-read.stitch.ts` (o coração) + `realized-read.in-memory.ts` + ACL `realized-read.from-sources.ts`.
- **Borda:** `http/schemas.ts` (Zod `.strict()`, `year` obrigatório), `dto.ts`, `plugin.ts` (rota + gate `budget-plan:read` AND `fiscal-document:read`), `composition.ts` (driver memory/mysql), `server.ts` (`REPORTS_BUDGET_PLANS_DATABASE_URL`).
- **Frente A:** `budget-plans/.../planned-amounts-read.drizzle.ts` — filtro de Rede vira `or(state?, municipality?)` **no ON**; um filtro só = inalterado; ambos = OR.

## Invariantes (provados em execução — costura é teste PURO)
- **CA6 categoria-do-plano:** a árvore nasce só do `planned`; financial casa por `(budgetPlanRef, subcategoryRef)`; **`categoryRef` nunca é lido na montagem** → título manual (`categoryRef=null`) cai na folha certa, sem nó fantasma.
- **CA5 não-duplica:** realizado/provisionado entram **só na folha**; categoria/centro/raiz = soma pura dos filhos. Conservação: total geral == Σ das entradas.
- **Âncora nota 10:** doc 5000 (CAT1) + manual 500 (categoryRef=null) mesma `(P1,SUB1,mês)` → folha 5500. **Roda no `pnpm test` puro.**
- **CA7b:** órfão → "Sem orcamento previsto" (expected=0), nos totais; inclui subcategoryRef=null.

## Prova do GREEN
- Costura pura: **14/14** (stitch); rota: 13. `pnpm test`: **4308 / 4289 pass / 0 fail / 19 skip** (baseline W0 4295/4264/12).
- `typecheck` · `lint` · `format:check` verdes (conferidos no fio principal).
- Frente A (OR) é integração gated (#500) — **não executada**.

## Notas para o W2
- **Fronteira do ACL:** `from-sources.ts` recebe os 2 `list` já abertos; a **composition** abre os pools no boot (molde `analysis-read.financial.ts`, ADR-0006) — divergência consciente do texto do request.
- `eslint-disable prefer-readonly-parameter-types` (5 pts no stitch) — acumuladores mutáveis com Map interno, idioma do repo.
- Filtro do financial no ACL: só `budgetPlanId→budgetPlanRef` + `year` (o financial não conhece Rede/programa; recorte de Rede vive no orçado; órfãos viram CA7b). Confirmar em integração (#500).

## Próximo passo
W2 (REVIEW) — `code-reviewer`.
