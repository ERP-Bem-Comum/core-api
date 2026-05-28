# W0 (RED) — AUTH-DB-REPO-SESSION

**Skill:** `tdd-strategist` · **Resultado:** RED (adapter Drizzle inexistente; InMemory segue verde)

## Testes

- **Estendida** `refresh-token-repository.contract.ts`: `RefreshTokenRepoSetup` ganha `seedUser(userId)`
  (idempotente, padrão do `amendment-repository.suite.ts`/`seedContract`); helper `seedAndSave(token)` seedeia o
  `auth_user` pai (FK `auth_rt_user_fk`) antes de cada save. Os 10 `repository.save` viraram `seedAndSave`.
- **Atualizado** `refresh-token-repository.inmemory.test.ts`: `seedUser` no-op → InMemory **8/8 GREEN**.
- **Criado** `refresh-token-repository.drizzle.test.ts` (gated): `seedUser` insere `auth_user` mínimo
  (`<userId>@seed.local`, status active); roda a contract-suite contra o adapter Drizzle.

## Saída

```
InMemory: tests 8 · pass 8 · fail 0   (contract-suite estendida segue verde)
Drizzle:  ERR_MODULE_NOT_FOUND '.../repos/refresh-token-repository.drizzle.ts'  (RED)
```

## Handoff
- **W1a — DBA**: queries (save upsert por id; findById PK; findByTokenHash `auth_rt_token_hash_idx`;
  findRevocableByUserId `auth_rt_user_revoked_idx` composto) + EXPLAIN. Sem reconciliação/N:N.
- **W1b — drizzle-orm-expert**: mapper escalar + repo (`createDrizzleRefreshTokenStore(handle)`, sem Clock).
