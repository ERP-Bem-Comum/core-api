# W1 — Implementação GREEN — AUTH-USER-PROFILE-AGG

**Wave:** W1 · **Outcome:** GREEN · **Data:** 2026-06-07

## Implementação (domínio + persistência)

**Domínio** (`src/modules/auth/domain/identity/user/`):

- `types.ts` — `UserProfile` (name/cpf/telephone/photo/collaboratorId, **nullable**) compõe o `UserCore`.
- `events.ts` — `UserEnabled` (par do `UserDisabled` existente) + `UserProfileUpdated` (payload só metadados).
- `user.ts` — `register` preenche perfil `null`; novos: `updateProfile` (patch parcial, narrowing por status),
  `setPhoto`, `enable` (DisabledUser→ActiveUser). Reexports atualizados.

**Persistência** (escopo expandido — ver `000-request`):

- `schemas/mysql.ts` — `auth_user` +5 colunas nullable (`name`, `cpf`, `telephone`, `image_url`, `collaborator_id`).
- `mappers/user.mapper.ts` — `userFromRows` reidrata o perfil via VOs (`rehydrateProfile`; valor inválido →
  `UserMapperInvalidProfile`); `userToInsert` grava os campos. Variante de erro nova.
- Migration `migrations/mysql/0004_gray_ben_urich.sql` — 5 `ALTER TABLE auth_user ADD ... NULL`.

## Resultado

```
suíte perfil (nova):      tests 6 · pass 6 · fail 0
suíte agregado (regress): tests 8 · pass 8 · fail 0
suíte completa:           pass 2301 · fail 0 (+6)
```

`register-user` e o mapper unit permanecem GREEN (campos nullable não quebram fluxos existentes).

## Pendência de integração

A migration `0004` + o mapper Drizzle são validados contra MySQL real em
`pnpm run test:integration:auth` (atrás de `MYSQL_INTEGRATION=1`) — **rodar antes do merge**.
