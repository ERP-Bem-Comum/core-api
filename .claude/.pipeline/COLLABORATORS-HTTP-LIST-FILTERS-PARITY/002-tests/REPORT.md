# W0 — RED — COLLABORATORS-HTTP-LIST-FILTERS-PARITY (P1c)

> Skill: `tdd-strategist`. Estende o multifiltro do legado (6 filtros diretos; `age` adiado).

## Arquivos criados

- `tests/modules/partners/application/use-cases/list-collaborators-filters.test.ts` — unit de `collaboratorMatchesFilter`.
- `tests/modules/partners/adapters/http/collaborators-list-filters.routes.test.ts` — borda (roles, yearOfContract).

## Testes (intenção)

Unit (`collaboratorMatchesFilter`): genderIdentities, races, educations, roles, yearOfContract,
campo pessoal `null` não casa, disableReasons (inativo casa; ativo não). Filtros passados via
variável (não literal) → compila no W0, type-safe no W1.

Rota: `?roles=Analista` → 1; `?yearOfContract=2025` → 1.

## Saída literal do gate (`pnpm test`, isolado)

```
ℹ tests 9
ℹ pass 0
ℹ fail 9
```

→ **RED correto** (9/9): a impl atual de `collaboratorMatchesFilter` ignora os campos novos (retorna
`true`, não restringe) e o `collaboratorListQuerySchema` faz strip de `roles`/`yearOfContract`.

## Próximo passo

W1 (GREEN) — `ports-and-adapters`: estender `CollaboratorListFilter` + `collaboratorMatchesFilter`
(`matchesInNullable`, `matchesYear`); `collaboratorListQuerySchema` (+6 params); `queryToFilter`
(`breeds`→`races`, `disableBy`→`disableReasons`).
