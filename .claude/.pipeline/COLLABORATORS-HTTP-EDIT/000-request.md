# Ticket COLLABORATORS-HTTP-EDIT: edição cadastral (PUT) de Colaborador com RBAC elevado

> `EPIC-PARTNERS-HTTP-EDIT`. Última fatia de edição. Vital = `cpf`. Reusa `makeHasPermission`.

## Contexto

Espelha FINANCIERS/SUPPLIERS EDIT. O `UpdateCollaborator` legado edita os **7 campos cadastrais**
(= CreateCollaborator: name, email, cpf, occupationArea, role, startOfContract, employmentRelationship);
os **campos pessoais** têm o fluxo próprio `complete-registration` (PATCH já entregue) e são **preservados**
pelo PUT, junto do estado (registrationStatus, Active/Inactive, disableBy/deactivatedAt). Vital = `cpf`
→ `collaborator:edit-sensitive` (síncrono). `email` é não-vital mas único → 409 se duplicado.

## Escopo

- **`domain/collaborator/events.ts`** — `CollaboratorEdited`.
- **`domain/collaborator/types.ts`** — `EditCollaboratorInput` (7 cadastrais).
- **`domain/collaborator/collaborator.ts`** — `edit(collaborator, input, at)`: valida os 7 cadastrais (como register), preserva pessoais+estado via spread; emite `CollaboratorEdited`.
- **`application/use-cases/edit-collaborator.ts`** — `editCollaborator({ collaboratorId, canEditSensitive, ...7 campos })`; erros `edit-collaborator-{invalid-id,not-found,cpf-duplicate,email-duplicate,sensitive-forbidden}` + CollaboratorError + repo. cpf mudou → exige canEditSensitive + findByCpf; email mudou → findByEmail (409 sempre).
- **`adapters/http/schemas.ts`** — `updateCollaboratorBodySchema` (= create).
- **`adapters/http/composition.ts`** — expõe `editCollaborator`.
- **`adapters/http/plugin.ts`** — `CollaboratorsHttpHooks` + `hasPermission`; `PUT /collaborators/:id`; FORBIDDEN + edit codes.
- **`src/server.ts`** — passa `authDeps.hasPermission` ao collaboratorsHttpPlugin.

## Fora de escopo

- Edição de campos pessoais via PUT (esses são via complete-registration); extras.

## Critérios de aceite

- [ ] `PUT /collaborators/:id` 401; 403 sem `collaborator:write`; 400 `:id`; 404.
- [ ] write sem mudar cpf (muda name) → **200**; write mudando cpf → **403** (sensitive-forbidden).
- [ ] write + `collaborator:edit-sensitive` mudando cpf → **200**; cpf novo já usado → **409**.
- [ ] write mudando email p/ um já usado por outro → **409** (email-duplicate; não-vital).
- [ ] name vazio → 422; cpf curto → 400.
- [ ] `tsc` + `format:check` + `test` + `lint` verdes; zero regressão.

## Referências

- Piloto: FINANCIERS/SUPPLIERS-HTTP-EDIT. `collaborator.ts` (register — espelhar). ADR-0024/0027/0033.
