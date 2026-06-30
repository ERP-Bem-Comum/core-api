# Ticket COLLABORATORS-HTTP-DETAIL: GET /api/v1/collaborators/:id (detalhe enriquecido)

> Fatia **P1a** do `EPIC-COLLABORATORS-HTTP-V1`. Espelha o schema `Collaborator` do legado
> (`handbook/legacy_docs/openapi.yaml:2435`).

## Contexto

A P0 entregou a lista mínima. A P1a entrega o **detalhe** `GET /api/v1/collaborators/:id`. As decisões do
dono (2026-06-03) exigem expor `legacyId` (int|null) + `createdAt`/`updatedAt` — campos que vivem na row
`par_collaborators` mas **não no agregado** `Collaborator`. Logo, introduz-se um **read-model enriquecido**
(projeção da persistência), com read port + 2 adapters, em vez de serializar o agregado puro.

## Escopo

- **`src/modules/partners/application/ports/collaborator-reader.ts`** — port read-only:
  - `CollaboratorReadRecord = { collaborator: Collaborator; legacyId: number | null; createdAt: Date; updatedAt: Date }`
  - `CollaboratorReader = { getById(id: CollaboratorId): Promise<Result<CollaboratorReadRecord | null, 'collaborator-read-unavailable'>> }`
- **`src/modules/partners/adapters/persistence/repos/collaborator-reader.drizzle.ts`** — SELECT por id →
  `collaboratorFromRow(row)` + projeta `{ legacyId, createdAt, updatedAt }` (padrão `contractor-read.drizzle.ts`).
- **`src/modules/partners/adapters/persistence/repos/collaborator-reader.in-memory.ts`** — store semeável de records (teste/CLI).
- **`src/modules/partners/adapters/http/collaborator-dto.ts`** — `collaboratorToDetailDto(record)` espelhando o
  schema legado `Collaborator`: `id` (UUID), `legacyId`, name, email, cpf, rg, occupationArea, role,
  startOfContract (ISO), dateOfBirth (ISO|null), employmentRelationship, genderIdentity, race, education,
  foodCategory, foodCategoryDescription, disableBy (|null), `status` (= registrationStatus), biography,
  completeAddress, allergies, telephone, emergencyContactName, emergencyContactTelephone,
  experienceInThePublicSector, `active` (= status==='Active'), createdAt (ISO), updatedAt (ISO).
- **`src/modules/partners/adapters/http/schemas.ts`** — `collaboratorDetailSchema` (Zod) + `collaboratorIdParamSchema` (uuid).
- **`src/modules/partners/adapters/http/composition.ts`** — `buildPartnersHttpDeps` ganha `seed` (memory) e
  expõe `getCollaboratorById(id: string)`; wira o reader (memory|drizzle, reader pool).
- **`src/modules/partners/adapters/http/plugin.ts`** — rota `GET /collaborators/:id`, `authorize('collaborator:read')`.

## Fora de escopo

- Lista com filtros/paginação enriquecida → **P1b**.
- Paridade total de filtros → **P1c**.
- Writes → P2/P3.

## Critérios de aceite

- [ ] `GET /api/v1/collaborators/:id` sem token → 401; sem `collaborator:read` → 403.
- [ ] `:id` não-UUID → 400 (Zod, antes do domínio).
- [ ] `:id` UUID válido inexistente → 404.
- [ ] `:id` existente → 200 com DTO espelhando o schema legado `Collaborator` (id UUID + legacyId + ~24 campos + createdAt/updatedAt).
- [ ] Mapeamento: `status` ← registrationStatus; `active` ← status==='Active'; `disableBy` null quando Active.
- [ ] `tsc` + `format:check` + `test` + `lint` verdes (W3); zero regressão.

## Referências

- `handbook/legacy_docs/openapi.yaml:2435` (schema `Collaborator`), `:179` (GET /collaborators/{id}).
- Padrão: `contractor-read.drizzle.ts`, `collaborator.mapper.ts` (`collaboratorFromRow`).
- ADR-0033 (v1), ADR-0026 (reader pool), ADR-0006/0014 (só `par_*` via public-api), ADR-0027 (Zod).
- Spec: `.claude/.planning/EPIC-COLLABORATORS-HTTP-V1.md` §5 (P1a).
