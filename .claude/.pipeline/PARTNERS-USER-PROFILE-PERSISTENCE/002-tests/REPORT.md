# W0 — RED · PARTNERS-USER-PROFILE-PERSISTENCE

**Skill:** tdd-strategist · **Resultado:** RED (esperado)

## Arquivos criados

- `tests/modules/partners/adapters/persistence/user-profile.mapper.test.ts` — unit (gate default).
- `tests/modules/partners/adapters/persistence/repos/user-profile-repository.drizzle.test.ts` — integração gated.

## Testes (intenção)

**Mapper**: toInsert (collaboratorRef null / presente); fromRow (com/sem collaboratorRef; round-trip
preserva userRef/cpf; rejeita user_ref/cpf/collaborator_ref inválidos).

**Repo Drizzle (gated)**: save→findByUserRef; findByCpf; 2º save mesmo user_ref atualiza (não duplica);
cpf de outro user_ref → `user-profile-cpf-duplicate`.

## Confirmação RED

```
mapper: ERR_MODULE_NOT_FOUND .../mappers/user-profile.mapper.ts → fail
repo:   ERR_MODULE_NOT_FOUND .../repos/user-profile-repository.drizzle.ts → fail
```

Falha por inexistência da API (schema `par_user_profiles`/`UserProfileRow`, mapper, repo). Esperado.
