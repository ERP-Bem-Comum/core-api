# W1 (GREEN) — PARTNERS-AGGREGATOR-HTTP

**Wave:** W1 · **Agente:** ports-and-adapters · **Data:** 2026-06-06 · **Resultado:** GREEN ✅

Feature `specs/003-partners-aggregator-export/` · US-001 (agregador `GET /api/v1/partners`).

## Implementação mínima (até GREEN)

| Arquivo | O quê |
| --- | --- |
| `src/modules/partners/adapters/http/partner-aggregate-query.ts` (NOVO) | `aggregatePartners(records, query, opts?)` puro: projeta os 4 `*ReadRecord` → `PartnerListItem` (id/name/document/active); filtra `search`/`type`; merge; sort `(name,type,id)`; pagina (meta canônico); cap `MAX_TOTAL=10_000` → `err('partners-aggregate-too-large')` |
| `src/modules/partners/adapters/http/partners-schemas.ts` (NOVO) | Zod `partnersAggregateQuerySchema` (search/type enum/page/limit max 100) + `partnersPaginatedSchema` (meta canônico) |
| `src/modules/partners/adapters/http/partners-plugin.ts` (NOVO) | `partnersHttpPlugin`: `GET /partners`; AND das 4 reads via **preHandlers encadeados**; `Promise.all` dos 4 readers; cap→503; envelope. Inner `FastifyPluginAsyncZodOpenApi` + outer `.withTypeProvider` (espelha `supplier-plugin.ts`) |
| `src/modules/partners/public-api/http.ts` | reexporta `partnersHttpPlugin` + `PartnersHttpHooks` |
| `src/server.ts` | registra `partnersHttpPlugin` em `{prefix:'/api/v1'}` |

**Sem schema/migration** — composição read-side na borda; `composition.ts` já expunha `list{Supplier,Financier,Collaborator,Act}Records` (sem wiring novo).

## Decisões respeitadas

- **Projeção** reusa o padrão de `contractor-view.mapper.ts` (`cnpj`/`cpf` desbrandados p/ string de 14/11 dígitos; `active = status === 'Active'`).
- **AND-4-reads** (achado I1): `authorize` é single-perm → 4 guards encadeados no `preHandler` (1º 403 corta).
- **Meta canônico** do partners (`itemCount/totalItems/itemsPerPage/totalPages/currentPage`).
- **Cap** in-memory (sem refatorar readers) conforme R1.

## Testes (W0 agora GREEN)

```
✔ partner-aggregate-query.test.ts — projeção/filtro/sort/paginação/cap
✔ partners-aggregate.routes.test.ts — 401, 403 (AND-4-reads), 200 (4 tipos), type filtra, search, type inválido 400
ℹ tests 12 · pass 12 · fail 0
```

## Gate (regressão zero)

- `typecheck` ✅ · `format:check` ✅ · `lint` ✅ · `test` **2268/2251 pass, 0 fail** (+12 vs. baseline 2256; 17 skipped pré-existentes).

## Próximo passo

W2 (code-reviewer): audit read-only (security: AND-perms sem vazamento; ddd: composição read-side ADR-0032/Vernon; clean-code).
