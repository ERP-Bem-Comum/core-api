# W1 — Implementação (GREEN)

- Parametrização de porta nos 3 testes drizzle existentes (refresh/user/role): `127.0.0.1:${MYSQL_PORT ?? 3306}` (default mantém 3306).
- Novo `reset-lockout.integration.test.ts` (gated): exercita `createDrizzlePasswordResetTokenStore` + `createDrizzleLoginLockoutStore` com um user semeado (FK), truncate em ordem FK.

## Execução

- `MYSQL_PORT=3307 docker compose up -d mysql --wait` → healthy (sem colidir com 3306 alheio).
- 29 testes integração existentes: **pass** → migrations 0000+0001+0002 aplicam (inclui auth_password_reset + auth_login_lockout com hardening COLLATE/CHARSET).
- 2 testes integração novos: **pass** → repos Drizzle novos OK (INSERT/UPDATE + FK + CHECK + SELECT FOR UPDATE).
- `docker compose down -v` + secrets removidos; `bemcomum-mysql` (alheio) intacto.
