# W0 — RED · PARTNERS-COLLABORATOR-USECASES

**Skill:** tdd-strategist · **Resultado:** RED (esperado)

## Arquivo criado

`tests/modules/partners/application/collaborator-usecases.test.ts` — espelha
`supplier-usecases.test.ts`, acrescido da 2ª unicidade (CPF **e** email) e do use case
`completeCollaboratorRegistration`.

## Testes (intenção)

**`registerCollaborator`**
1. Persiste e retorna `Active` + `PreRegistration` + `CollaboratorRegistered`; `list().length === 1`.
2. CPF duplicado (email diferente) → `register-collaborator-cpf-duplicate`.
3. Email duplicado (CPF diferente) → `register-collaborator-email-duplicate`.
4. CPF inválido → `invalid-cpf`.
5. Email inválido → `collaborator-email-invalid`.
6. `occupationArea` desconhecida → `invalid-occupation-area`.
7. `employmentRelationship` desconhecido → `invalid-employment-relationship`.

**`completeCollaboratorRegistration`**
8. PreRegistration → Complete + `CollaboratorRegistrationCompleted`.
9. Id inexistente → `complete-collaborator-registration-not-found`.
10. Já completo → `collaborator-already-complete`.

**`deactivateCollaborator` / `reactivateCollaborator`**
11. Desativa existente (com `disableBy`) → `Inactive`.
12. Id inexistente → `deactivate-collaborator-not-found`.
13. `disableBy` inválido → `invalid-disable-reason`.
14. Reativa um inativo → `Active`.
15. Reativar já ativo → `collaborator-already-active`.

**queries**
16. `listCollaborators` retorna os persistidos.
17. `findCollaboratorByCpf` acha por CPF; `null` quando ausente.

**adapter InMemory**
18. `save` recusa CPF duplicado (id distinto) → `collaborator-cpf-duplicate`.
19. `save` recusa email duplicado (id distinto) → `collaborator-email-duplicate`.

## Confirmação RED

```
✖ tests/modules/partners/application/collaborator-usecases.test.ts
code: 'ERR_MODULE_NOT_FOUND'
url: .../adapters/persistence/repos/collaborator-repository.in-memory.ts
```

Falha por inexistência da API (port, InMemory store e os 6 use cases ainda não existem). Esperado.

## CPFs de teste (válidos por módulo 11)

- `CPF_A = 111.444.777-35`
- `CPF_B = 529.982.247-25`
