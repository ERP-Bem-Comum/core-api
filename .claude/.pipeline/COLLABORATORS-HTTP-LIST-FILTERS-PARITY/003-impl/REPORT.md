# W1 — GREEN — COLLABORATORS-HTTP-LIST-FILTERS-PARITY (P1c)

> Skill: `ports-and-adapters`. Estende o filtro na application (puro) + a borda.

## Arquivos editados

- `application/use-cases/list-collaborators.ts` — `CollaboratorListFilter` +6 campos
  (genderIdentities, races, educations, disableReasons, roles, yearOfContract); helpers
  `matchesInNullable` (campos `T|null`) + `matchesYear`; predicado estendido.
- `adapters/http/schemas.ts` — `collaboratorListQuerySchema` +6 params (genderIdentities[], breeds[],
  educations[], disableBy[], roles[], yearOfContract); enums tipados → 400 em valor inválido.
- `adapters/http/collaborator-list-query.ts` — `queryToFilter` mapeia os novos (`breeds`→`races`, `disableBy`→`disableReasons`).
- `tests/.../list-collaborators-filters.test.ts` — filtros inline (contextual typing) em vez de variável.

## Decisões de design (W1)

- **`matchesInNullable`**: campo pessoal `null` nunca casa filtro presente (semântica legada).
- **`disableReasons`** lê `c.disableBy` só quando `Inactive` (ativo → null → não casa) — filtro implica inativos.
- **`yearOfContract`** = ano de `startOfContract` (puro, sem clock; `age` foi adiado por exigir data de referência).

## Saída literal do gate

`pnpm run typecheck`: `tsc --noEmit` — **zero erros**.

`pnpm test`:

```
ℹ tests 2026
ℹ pass 2009
ℹ fail 0
ℹ skipped 17
```

Testes P1c (isolado): `9 · pass 9 · fail 0`.

→ **GREEN**: 6 filtros + borda; zero regressão (2009 = 2000 + 9 novos).

## Próximo passo

W2 (REVIEW) — `code-reviewer`.
