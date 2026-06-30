# Ticket COLLABORATORS-HTTP-LIST-FILTERS-PARITY: paridade de filtros da lista (P1c)

> Fatia **P1c** do `EPIC-COLLABORATORS-HTTP-V1`. Estende o multifiltro do legado
> (`handbook/legacy_docs/openapi.yaml:101`) além dos 5 já entregues na P1b.

## Contexto

A P1b entregou 5 filtros (search, status=registrationStatus, occupationAreas, employmentRelationships,
active). O legado expõe mais: `yearOfContract`, `genderIdentities`, `breeds` (race), `educations`,
`disableBy`, `roles` e `age`. Esta fatia estende o filtro **na application** (`collaboratorMatchesFilter`,
puro) + a borda (schema/queryToFilter). **Decisão do dono (2026-06-03): `age` fica adiado** (depende de
data de referência/clock; semântica a confirmar) — entram os **6 diretos**.

## Escopo

- **`application/use-cases/list-collaborators.ts`** — estende `CollaboratorListFilter` e
  `collaboratorMatchesFilter` com: `genderIdentities`, `races`, `educations`, `disableReasons`, `roles`,
  `yearOfContract`. Helper `matchesInNullable` (campos pessoais são `T | null`); `matchesYear`
  (ano de `startOfContract`). AND entre campos; OR dentro de cada array; ausente/vazio = não restringe.
- **`adapters/http/schemas.ts`** — `collaboratorListQuerySchema` ganha `genderIdentities[]`, `breeds[]`,
  `educations[]`, `disableBy[]`, `roles[]`, `yearOfContract` (arrays via `preprocess`; enums tipados).
- **`adapters/http/collaborator-list-query.ts`** — `queryToFilter` mapeia os novos params (`breeds`→`races`,
  `disableBy`→`disableReasons`).

## Fora de escopo

- `age` (adiado — clock + semântica). Documentar como follow-up.
- `links` HATEOAS de paginação.

## Critérios de aceite

- [ ] `collaboratorMatchesFilter` filtra por genderIdentities, races, educations, disableReasons, roles, yearOfContract (AND entre campos, OR dentro do array, vazio = não restringe).
- [ ] Campos pessoais `null` não casam filtro de valor (excluídos quando o filtro está presente).
- [ ] `disableReasons` filtra inativos pelo motivo; ativo (disableBy ausente) não casa.
- [ ] Borda: `GET /api/v1/collaborators?roles=Analista&yearOfContract=2026` filtra corretamente.
- [ ] `tsc` + `format:check` + `test` + `lint` verdes; zero regressão.

## Referências

- `handbook/legacy_docs/openapi.yaml:106-153` (params de filtro).
- `list-collaborators.ts` (`collaboratorMatchesFilter`, `CollaboratorListFilter`).
- Spec: `.claude/.planning/EPIC-COLLABORATORS-HTTP-V1.md` §5 (P1c).
