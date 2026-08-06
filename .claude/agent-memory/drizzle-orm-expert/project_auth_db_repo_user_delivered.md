---
name: auth-db-repo-user-delivered
description: AUTH-DB-REPO-USER W1b entregue em 2026-05-27 — adapter Drizzle de UserRepository/UserReader com driver auth, mapper, isEmailDupEntry, 3 queries de reidratação
metadata:
  type: project
---

Ticket AUTH-DB-REPO-USER (P1) W1b implementado e validado em 2026-05-27.

Arquivos entregues:
- `src/modules/auth/domain/identity/user/repository.ts` — `UserRepositoryError` += `'email-already-registered'`
- `src/modules/auth/adapters/persistence/repos/user-repository.in-memory.ts` — CA6 dup email detectado
- `src/modules/auth/adapters/persistence/drivers/mysql-driver.ts` — `openAuthMysql(opts)` → `AuthMysqlHandle`
- `src/modules/auth/adapters/persistence/mappers/user.mapper.ts` — `userFromRows` + `userToInsert` + tagged errors
- `src/modules/auth/adapters/persistence/repos/user-repository.drizzle.ts` — `createDrizzleUserStore(handle, clock)`
- `tests/modules/auth/adapters/persistence/user-repository.drizzle.test.ts` — CA7-CA9 gated MYSQL_INTEGRATION

**Why:** DD-PERSIST-01 — adapter real MySQL para ports UserRepository/UserReader do módulo auth.

**How to apply:** CA7-CA9 rodam apenas com `MYSQL_INTEGRATION=1` (Docker MySQL). CA1-CA6 InMemory = sempre green. VALID_CONN = `mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core`.

Padrão `isEmailDupEntry`: errno===1062 AND sqlMessage.includes('auth_user_email_idx') — distingue dup de email de dup de PK (corrida → user-repo-unavailable).
