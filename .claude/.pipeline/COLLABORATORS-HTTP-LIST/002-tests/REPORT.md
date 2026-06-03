# W0 — RED — COLLABORATORS-HTTP-LIST (P1b)

> Skill: `tdd-strategist`. Contrato espelha `PaginatedCollaborators` legado (openapi.yaml:2500).

## Arquivo criado

- `tests/modules/partners/adapters/http/collaborators-list.routes.test.ts`

## Testes (intenção)

Seed: 2 ativos (Ana/PARC, Bruno/DDI) + 1 inativo (Carla/PARC, deactivate). CPFs válidos distintos.

1. 200 com `meta` legado (`totalItems=3, currentPage=1, itemsPerPage=5, totalPages=1, itemCount=3`) e `items` = DTO `Collaborator` completo (tem `legacyId`/`active`/`createdAt`).
2. `?search=Ana` → totalItems=1.
3. `?occupationAreas=PARC` → totalItems=2.
4. `?active=1` → 2; `?active=0` → 1.
5. `?limit=2&page=1` → 2 items, totalPages=2, totalItems=3.
6. composition: `deps.listCollaboratorRecords()` existe.

## Saída literal do gate (`pnpm test`, arquivo isolado)

```
ℹ tests 6
ℹ pass 0
ℹ fail 6
```

→ **RED correto** (6/6): a rota de lista ainda usa o shape mínimo da P0 (`meta.total`, item enxuto)
sobre o repo vazio, e `listCollaboratorRecords` não existe.

### Nota para o W1

- O teste de composition usa 1 `@ts-expect-error` (em `listCollaboratorRecords`) — **remover no W1**.
- O W1 muda o shape da resposta de lista → o teste `collaborators-bootstrap.routes.test.ts` (P0) que
  checava `meta.total` precisará ser **ajustado ao meta legado** (parte do W1).

## Próximo passo

W1 (GREEN) — `ports-and-adapters`: estender `CollaboratorReader.list()` (+ 2 adapters);
`listCollaboratorRecords` no composition; `collaboratorListQuerySchema` + `collaboratorPaginatedSchema`;
helper `collaborator-list-query.ts` (query→filter + filtro + ordenação + paginação); rota de lista nova;
ajustar o teste bootstrap (P0) ao meta legado. Remover o `@ts-expect-error`.
