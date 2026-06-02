# W0 — RED · PARTNERS-USER-PROFILE

**Skill:** tdd-strategist · **Resultado:** RED (esperado)

## Arquivos criados

- `tests/modules/partners/domain/user-profile/user-profile.test.ts` — agregado puro.
- `tests/modules/partners/application/user-profile-usecases.test.ts` — port + InMemory + use cases.

## Testes (intenção)

**Domínio `UserProfile`**: create (válido + name/telephone/cpf inválidos), updateContact (altera e
preserva cpf/userRef), linkCollaborator (seta ref + evento), rehydrate (com/sem collaboratorRef, sem evento).

**Aplicação**: createUserProfile (ok; userRef já existe → already-exists; cpf de outro → cpf-duplicate;
userRef malformado → invalid-user-ref), updateUserProfileContact (ok; not-found), linkCollaboratorToProfile
(ok; collaboratorId inválido → invalid-collaborator-id), getUserProfile (by userRef, null ausente),
findUserProfileByCpf.

## Confirmação RED

```
ERR_MODULE_NOT_FOUND .../repos/user-profile-repository.in-memory.ts
```

Falha por inexistência da API (domínio, port, InMemory, use cases). Esperado.
