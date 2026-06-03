# Ticket COLLABORATORS-HTTP-REGISTER: cadastro (POST) + completar (PATCH) — P2

> Fatia **P2** do `EPIC-COLLABORATORS-HTTP-V1`. Primeiras rotas de **escrita** (writer pool).

## Contexto

P0/P1 entregaram as leituras. A P2 entrega o cadastro e a complementação. Decisões do dono (2026-06-03):
- **POST /api/v1/collaborators** → `registerCollaborator`; resposta **201 + `Location`** (sem corpo; o
  cliente segue a URL para o detalhe se precisar).
- **PATCH /api/v1/collaborators/:id/complete-registration** → `completeCollaboratorRegistration`,
  **autenticado** (`collaborator:write`) — NÃO o fluxo público de auto-cadastro do legado (mais seguro).

Writes exigem o **writer pool** (ADR-0026); o composition hoje só tem reader → adiciona writer repo.

## Escopo

- **`adapters/http/composition.ts`** — adiciona `collaboratorWriterRepo` (memory: store dedicado; mysql:
  `createDrizzleCollaboratorStore(writerHandle, clock)`); expõe `registerCollaborator` + `completeCollaboratorRegistration`.
- **`adapters/http/schemas.ts`** — `createCollaboratorBodySchema` (name, email, cpf, occupationArea[enum],
  role, startOfContract[date], employmentRelationship[enum]) + `completeRegistrationBodySchema` (campos
  pessoais nullable, default null; dateOfBirth coerce date).
- **`adapters/http/plugin.ts`** — `POST /collaborators` (201 + Location); `PATCH /:id/complete-registration`
  (200); helper `writeCollaboratorErrorStatus` (409 duplicado/already-*, 404 not-found, 422 invariante, 503 repo).
- **`adapters/http/collaborator-write.ts`** (helper) — mapeia body→command (startOfContract→Date; pessoais→input).

## Fora de escopo

- `complete-registration` público / auto-cadastro (`completeCollaboratorRegistrationPublic`) — decisão: autenticado.
- `PUT /:id` (update cadastral) — sem use case ainda.
- desativar/reativar / toggle-active → **P3**.

## Critérios de aceite

- [ ] `POST /collaborators` sem token → 401; sem `collaborator:write` → 403.
- [ ] `POST` body válido → **201** + header `Location: /api/v1/collaborators/{uuid}` (sem corpo).
- [ ] `POST` CPF/email já usado → **409**; body fora do shape (cpf≠11 díg., campo faltando) → **400** (Zod); CPF com DV inválido → **422** (domínio).
- [ ] `PATCH /:id/complete-registration` sem write → 403; `:id` não-UUID → 400; id inexistente → 404.
- [ ] `PATCH` num pré-cadastro → **200** (PreRegistration→Complete); 2ª vez → **409** (`collaborator-already-complete`).
- [ ] `tsc` + `format:check` + `test` + `lint` verdes; zero regressão.

## Referências

- `handbook/legacy_docs/openapi.yaml:161` (CreateCollaborator), `:2466` (schema), `:232` (complete-registration).
- `register-collaborator.ts`, `complete-collaborator-registration.ts`, `errors.ts` (CollaboratorError).
- ADR-0033 (v1), ADR-0026 (writer pool), ADR-0027 (Zod), ADR-0024 (RBAC).
- Spec: `.claude/.planning/EPIC-COLLABORATORS-HTTP-V1.md` §5 (P2).
