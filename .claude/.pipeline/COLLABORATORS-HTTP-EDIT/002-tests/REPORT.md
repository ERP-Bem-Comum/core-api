# W0 — RED — COLLABORATORS-HTTP-EDIT

> Skill: `tdd-strategist`. Edição (PUT) de Colaborador; vital=cpf; email não-vital (único); pessoais preservados.

## Arquivo criado
- `tests/modules/partners/adapters/http/collaborators-edit.routes.test.ts`

## Testes (intenção)
401/403; 400 :id / 404; 200 write sem mudar cpf; 403 write mudando cpf; 200 director mudando cpf +
409 cpf novo já usado; 409 email já usado (write, não-vital); 422 name vazio; 400 cpf curto.

## Saída literal (`pnpm test`, isolado)
```
ℹ tests 7 · pass 0 · fail 7
```
→ RED correto: PUT, editCollaborator, hasPermission no CollaboratorsHttpHooks e updateCollaboratorBodySchema não existem.

## Próximo passo
W1: Collaborator.edit (preserva pessoais+estado via spread) + CollaboratorEdited + EditCollaboratorInput;
editCollaborator (vital=cpf + email unicidade); updateCollaboratorBodySchema; composition; plugin (hasPermission + PUT); server.ts.
