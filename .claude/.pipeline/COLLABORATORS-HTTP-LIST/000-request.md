# Ticket COLLABORATORS-HTTP-LIST: GET /api/v1/collaborators (lista paginada + filtros)

> Fatia **P1b** do `EPIC-COLLABORATORS-HTTP-V1`. Espelha `PaginatedCollaborators` do legado
> (`handbook/legacy_docs/openapi.yaml:2500`, item = schema `Collaborator`).

## Contexto

A P0 entregou a lista mínima (`{items, meta:{total}}`, item enxuto). A P1a entregou o read-model
enriquecido (`CollaboratorReader.getById`) + DTO de detalhe. A P1b **alinha a lista ao contrato legado**:
item = `Collaborator` completo (reusa `collaboratorToDetailDto`), `meta` no formato legado, e os **5 filtros**
que o use case já suporta + paginação. Paridade total de filtros (10+) fica na P1c.

## Escopo

- **`application/ports/collaborator-reader.ts`** — estende `CollaboratorReader` com
  `list(): Promise<Result<readonly CollaboratorReadRecord[], CollaboratorReaderError>>`.
- **`adapters/persistence/repos/collaborator-reader.{in-memory,drizzle}.ts`** — implementam `list()`
  (in-memory: todos os records semeados; drizzle: SELECT all → records).
- **`adapters/http/composition.ts`** — `PartnersHttpDeps` expõe `listCollaboratorRecords()` (reader.list).
- **`adapters/http/schemas.ts`** — `collaboratorListQuerySchema` (page, limit, order, search, active,
  status[], occupationAreas[], employmentRelationships[]) + `collaboratorPaginatedSchema`
  (`items: Collaborator[]`, `meta { itemCount, totalItems, itemsPerPage, totalPages, currentPage }`).
- **`adapters/http/collaborator-dto.ts`** — `buildPaginationMeta(...)`; item reusa `collaboratorToDetailDto`.
- **`adapters/http/collaborator-list-query.ts`** (helper puro) — mapeia query→`CollaboratorListFilter`
  (status→registrationStatuses; active 0|1→statuses Inactive|Active) + filtra (reusa `collaboratorMatchesFilter`)
  + ordena por name + pagina (slice). Composição de leitura transitória na borda (ADR-0032).
- **`adapters/http/plugin.ts`** — `GET /collaborators` com querystring; response paginado legado.
- **Atualizar** `tests/.../collaborators-bootstrap.routes.test.ts` — a asserção de shape da lista (P0
  usava `meta.total`) migra para o `meta` legado.

## Fora de escopo

- Filtros legados restantes (age, yearOfContract, genderIdentities, breeds, educations, disableBy, roles) → **P1c** (estende `listCollaborators` no domínio/application).
- `links` de paginação (HATEOAS) — opcional no legado; YAGNI por ora.
- Writes → P2/P3.

## Critérios de aceite

- [ ] `GET /api/v1/collaborators` sem token → 401; sem `collaborator:read` → 403.
- [ ] 200 com `{ items, meta }`: `items` = DTO `Collaborator` completo; `meta { itemCount, totalItems, itemsPerPage, totalPages, currentPage }`.
- [ ] Paginação: `page`/`limit`/`order` (default page=1, limit=5, order=ASC) — `limit` com teto (DoS guard).
- [ ] Filtro `search` (nome/cpf), `active` (0|1 → Inactive|Active), `status[]` (RegistrationStatus), `occupationAreas[]`, `employmentRelationships[]`.
- [ ] `tsc` + `format:check` + `test` + `lint` verdes; zero regressão (inclui P0 ajustada).

## Referências

- `handbook/legacy_docs/openapi.yaml:101` (params list), `:2500` (PaginatedCollaborators), `:2331` (PaginationMeta).
- `list-collaborators.ts` (`collaboratorMatchesFilter`, `CollaboratorListFilter`).
- ADR-0033 (v1), ADR-0032 (composição transitória), ADR-0026 (reader), ADR-0027 (Zod).
- Spec: `.claude/.planning/EPIC-COLLABORATORS-HTTP-V1.md` §5 (P1b).
