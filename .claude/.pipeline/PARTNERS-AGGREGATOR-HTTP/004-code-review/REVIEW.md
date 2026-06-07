# Code Review — Ticket PARTNERS-AGGREGATOR-HTTP — Round 1

**Veredito:** APPROVED ✅

**Reviewer:** code-reviewer
**Data:** 2026-06-06
**Escopo revisado:**

- `src/modules/partners/adapters/http/partner-aggregate-query.ts` (NOVO)
- `src/modules/partners/adapters/http/partners-schemas.ts` (NOVO)
- `src/modules/partners/adapters/http/partners-plugin.ts` (NOVO)
- `src/modules/partners/public-api/http.ts` (reexport)
- `src/server.ts` (registro)
- `tests/modules/partners/adapters/http/partner-aggregate-query.test.ts` + `partners-aggregate.routes.test.ts`

---

## Verificação dos pontos de atenção

| # | Ponto | Resultado |
| --- | --- | --- |
| 1 | **Security — AND-perms sem vazamento de tipo** | ✅ `preHandler: [requireAuth, authorize(supplier:read), authorize(financier:read), authorize(collaborator:read), authorize(act:read)]`. Como é **AND**, o caller ou tem as 4 reads (vê todos os tipos) ou recebe **403** no 1º guard que falhar — não há caminho que devolva itens de um tipo sem a permissão dele. Testado (`sem act:read → 403`). |
| 2 | **Anti-vazamento na projeção** | ✅ `PartnerListItem = {type,id,name,document,active}` — nada além. `document` = cnpj/cpf, já expostos nas listas por-tipo existentes (coerente; sem dado bancário/PIX/email). |
| 3 | **DDD/isolamento** | ✅ `partner-aggregate-query.ts` importa só `shared/primitives` + os 4 `*ReadRecord` do **próprio** módulo (`partners/application/ports`). Sem cross-BC, sem `contracts/*`. Projeção não expõe o agregado interno (ADR-0014). |
| 4 | **Pureza** | ✅ `aggregatePartners` é pura (sem IO; só `.map/.filter/.sort/.slice`). IO isolado no plugin (`Promise.all` dos readers injetados). |
| 5 | **Cap** | ✅ Soma dos 4 readers conferida **antes** de projetar; `> MAX_TOTAL (10_000)` → `err('partners-aggregate-too-large')` → 503 (mapeado no `sendResult`). |
| 6 | **`as unknown as string`** nos branded | ✅ Aceitável em adapter — mesmo padrão de `contractor-view.mapper.ts` (desbranda id/cnpj/cpf para a projeção plana de borda). Não ocorre em domínio. |
| 7 | **Sort determinístico** | ✅ `byNameTypeId`: `name` → `type` → `id` com early-return por nível; tie-break total e estável. |
| 8 | **Meta canônico** | ✅ `{itemCount,totalItems,itemsPerPage,totalPages,currentPage}` idêntico ao `supplierPaginationMetaSchema`; `totalPages = ceil(totalItems/limit)`, 0 quando vazio. |

## Checklist (categorias aplicáveis a adapter de borda)

- **A/B/C (domínio/VO/unions):** N/A — é adapter de borda, não domínio. Sem `throw`/`class`/`this`/`any` (grep limpo).
- **D (Ports & Adapters):** ✅ função pura de composição + plugin que orquestra readers injetados via `PartnersHttpDeps`; adapter converte falha de reader em 503 (não vaza erro).
- **E (Modular Monolith):** ✅ só `partners`; sem leitura cross-`par_*` indevida (lê pelos readers do próprio módulo); reexport via `public-api/http.ts`.
- **F (ESM/TS):** ✅ imports `.ts`, `import type` nos tipos, `type Result` inline; sem `require/enum/namespace`. typecheck verde.
- **G (idioma/naming):** ✅ tudo EN; erro interno `partners-aggregate-too-large` (kebab); nomes específicos (`byNameTypeId`, `matchesSearch`, `supplierItem`).
- **H (tests):** ✅ AAA, fakes via fixtures `register()` (UUID reais via `*.generate()`), asserções de regra (sort, filtro, cap, 401/403/400), não só "não lança". `teardown` chamado em todos.

## O que está bom

- **Espelhamento fiel** do padrão existente (`supplier-list-query.ts`/`supplier-plugin.ts`): inner `FastifyPluginAsyncZodOpenApi` + outer `.withTypeProvider`, `sendResult` com mapa de erros, meta canônico — consistência total com as rotas por-tipo.
- **AND-4-reads encadeado** resolve elegantemente a limitação de `authorize` single-perm sem inventar permissão nova (alinhado ao parecer de segurança).
- **Cap antes da projeção** — evita alocar projeções de uma lista grande demais; degradação explícita (503), não OOM.
- Decisões do clarify (paginação in-memory, sort determinístico, permissão) fielmente implementadas e cobertas por teste.

## Próximo passo

**APPROVED** — pipeline avança para **W3** (gate final de qualidade). Sem issues bloqueantes; nada a corrigir.
