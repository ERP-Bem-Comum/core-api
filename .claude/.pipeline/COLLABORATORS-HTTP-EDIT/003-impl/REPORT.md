# W1 — GREEN — COLLABORATORS-HTTP-EDIT

> Skill: `ports-and-adapters` + domínio. Edição de Colaborador (vital=cpf; email não-vital único).

## Arquivos criados
- `domain/collaborator/collaborator.ts` (M) — `Collaborator.edit` (valida 7 cadastrais; preserva pessoais+estado via spread).
- `domain/collaborator/events.ts` (M) — `CollaboratorEdited`; `types.ts` (M) — `EditCollaboratorInput`.
- `application/use-cases/edit-collaborator.ts` — regra do vital (cpf) + email único (409).

## Arquivos editados
- `adapters/http/schemas.ts` — `updateCollaboratorBodySchema` (= create cadastral).
- `adapters/http/composition.ts` — expõe `editCollaborator`.
- `adapters/http/plugin.ts` — `CollaboratorsHttpHooks.hasPermission`; `PUT /collaborators/:id`; FORBIDDEN + edit codes.
- `src/server.ts` — passa `authDeps.hasPermission` ao collaboratorsHttpPlugin.
- `tests/.../collaborators-{bootstrap,detail,lifecycle,list,list-filters,register}.routes.test.ts` — makeApp passa `hasPermission` (hook obrigatório).

## Decisões
- PUT edita só os **7 cadastrais** (fiel ao `UpdateCollaborator` legado); pessoais + estado preservados via spread em `Collaborator.edit`.
- Vital=cpf → `collaborator:edit-sensitive`. Email não-vital, mas único → `edit-collaborator-email-duplicate` (409).
- Reusa `makeHasPermission`.

## Saída literal do gate (encadeado, exit 0)
```
$ tsc / prettier / eslint → verdes
ℹ tests 2096 · pass 2079 · fail 0 · skipped 17
```
Teste edit isolado: 7 · pass 7 · fail 0.
→ GREEN: zero regressão (2079 = 2072 + 7 novos).

## Próximo passo
W2 (REVIEW).
