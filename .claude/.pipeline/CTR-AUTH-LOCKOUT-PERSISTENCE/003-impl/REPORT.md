# W1 — Implementação (GREEN)

- `schemas/mysql.ts`: tabela `auth_login_lockout` (PK user_id, failed_attempts int, locked_until datetime(3) nullable, FK→auth_user RESTRICT, CHECK ≥ 0) + import `int` + tipos `$infer`.
- `mappers/account-lockout.mapper.ts`: `accountLockoutFromRow`/`accountLockoutToInsert` (tagged errors).
- `repos/login-lockout-store.drizzle.ts`: `createDrizzleLoginLockoutStore(handle)` — `findByUserId` (PK), `save` upsert (SELECT FOR UPDATE → UPDATE/INSERT, sem ON DUPLICATE KEY).
- `adapters/http/composition.ts`: `lockoutStore` movido para `Stores` (InMemory memory / Drizzle mysql); `buildAuthHttpDeps` usa `stores.lockoutStore`.
- Migration `0002_sweet_the_watchers.sql` (db:generate:auth) + hardening manual (COLLATE utf8mb4_bin + ENGINE/CHARSET).
