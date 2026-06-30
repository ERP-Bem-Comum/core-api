# W1 — GREEN — COLLABORATORS-HTTP-LIST (P1b)

> Skill: `ports-and-adapters`. Lista paginada + filtros espelhando `PaginatedCollaborators` legado.

## Arquivos criados

- `adapters/http/collaborator-list-query.ts` — `queryToFilter` (query→`CollaboratorListFilter`: status→registrationStatuses; active 0|1→statuses) + `paginateRecords` (filtra via `collaboratorMatchesFilter`, ordena por name, pagina). Funções puras (ADR-0032 transitório).

## Arquivos editados

- `application/ports/collaborator-reader.ts` — `CollaboratorReader.list()`.
- `adapters/persistence/repos/collaborator-reader.{in-memory,drizzle}.ts` — `list()` (in-memory: records semeados; drizzle: SELECT all → records).
- `adapters/http/composition.ts` — `listCollaboratorRecords` (reader.list). `listCollaborators` (use case) mantido para a P1c.
- `adapters/http/schemas.ts` — `collaboratorListQuerySchema` (page/limit/order/search/active/status[]/occupationAreas[]/employmentRelationships[]; arrays via `z.preprocess(toArray, …)`) + `collaboratorPaginatedSchema` (item=detalhe, meta legado). Removidos os schemas enxutos da P0.
- `adapters/http/collaborator-dto.ts` — removido `collaboratorToListItem` (órfão); lista reusa `collaboratorToDetailDto`.
- `adapters/http/plugin.ts` — rota `GET /collaborators` nova (querystring + paginação).
- `tests/.../collaborators-bootstrap.routes.test.ts` — asserção da lista migrada `meta.total` → `meta.totalItems` (shape legado).
- `tests/.../collaborators-list.routes.test.ts` — removido `@ts-expect-error`; `recordOf` tipado `Collaborator` (aceita Inactive).

## Decisões de design (W1)

- **Filtro/paginação na borda** sobre os read-records do reader (`paginateRecords`), reusando a função pura `collaboratorMatchesFilter` — sem tocar o use case. Volume modesto (ADR-0031); migrar para WHERE no repo quando crescer (débito registrado).
- **Item de lista = detalhe completo** (legado: `PaginatedCollaborators.items` = `Collaborator`).
- **Arrays em querystring** normalizados (`string | string[] → string[]`) via `z.preprocess`; valores tipados por `z.enum` (validação → 400 e tipo seguro p/ o filtro).

## Saída literal do gate

`pnpm run typecheck`: `tsc --noEmit` — **zero erros**.

`pnpm test`:

```
ℹ tests 2017
ℹ suites 650
ℹ pass 2000
ℹ fail 0
ℹ skipped 17
```

Testes P1b + P0 (isolado): `17 · pass 17 · fail 0`.

→ **GREEN**: 5 CAs da P1b + composition; zero regressão (2000 = 1994 + 6 novos; P0 ajustada segue verde).

## Próximo passo

W2 (REVIEW) — `code-reviewer`: audit do helper de paginação, reader.list, schemas e rota.
