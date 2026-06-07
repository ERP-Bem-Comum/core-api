# W0 (RED) — PARTNERS-AGGREGATOR-HTTP

**Wave:** W0 · **Agente:** tdd-strategist · **Data:** 2026-06-06 · **Resultado:** RED ✅

Feature `specs/003-partners-aggregator-export/` · US-001 (agregador `GET /api/v1/partners`).

## Testes escritos (falham por inexistência da API do W1)

| Arquivo | Cobre | Falha esperada |
| --- | --- | --- |
| `tests/modules/partners/adapters/http/partner-aggregate-query.test.ts` | função pura `aggregatePartners`: projeção `PartnerListItem` (name/document/active por tipo); filtro `search`/`type`; merge + sort `(name,type,id)`; paginação (meta canônico `itemCount/totalItems/itemsPerPage/totalPages/currentPage`); `page` além do total → vazio; cap `MAX_TOTAL` → `err('partners-aggregate-too-large')` | `ERR_MODULE_NOT_FOUND` de `partner-aggregate-query.ts` |
| `tests/modules/partners/adapters/http/partners-aggregate.routes.test.ts` | `GET /api/v1/partners` (`fastify.inject`): 401 sem sessão; **403 faltando 1 das 4 reads** (AND); 200 com os 4 tipos + meta; `?type=supplier` filtra; `?search=Alpha` casa; `?type` inválido → 400 | `SyntaxError`: export `partnersHttpPlugin` inexistente |

## Prova de RED (não-ambiente)

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../adapters/http/partner-aggregate-query.ts'
SyntaxError: The requested module '#src/modules/partners/public-api/http.ts' does not provide an export named 'partnersHttpPlugin'
```

Ambas falham por **inexistência** do que o W1 deve criar — não por erro de fixture/ambiente.

## Decisões refletidas nos testes (clarify/analyze)

- **Meta canônico** do partners (`itemCount/totalItems/itemsPerPage/totalPages/currentPage`) — corrigido vs. o shape inicial da spec (`page/limit/total`), para consistência com as listas por-tipo (acDR-0033). Spec/contracts/data-model alinhados.
- **AND das 4 reads** testado via usuário sem `act:read` → 403 (implementação por preHandlers encadeados — achado I1).
- **Sort `(name, type, id)`** e **cap `MAX_TOTAL`** (testado com `opts.maxTotal=2`) conforme R1.

## Contrato esperado do W1 (para GREEN)

- `src/modules/partners/adapters/http/partner-aggregate-query.ts`: `aggregatePartners(records, query, opts?) => Result<PartnersPage, 'partners-aggregate-too-large'>` (puro; `records = { suppliers, financiers, collaborators, acts }` de `*ReadRecord`).
- `partners-schemas.ts` (Zod query/response) + `partners-plugin.ts` (`partnersHttpPlugin`) exportado pela `public-api/http.ts` + wiring `composition.ts`/`server.ts`.

## Próximo passo

W1 (`ports-and-adapters`): implementar o mínimo até GREEN. Sem schema/migration (leitura na borda).
