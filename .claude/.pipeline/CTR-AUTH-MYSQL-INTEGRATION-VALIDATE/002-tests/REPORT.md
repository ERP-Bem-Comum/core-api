# W0 — Tests (RED)

`tests/modules/auth/adapters/persistence/reset-lockout.integration.test.ts` (novo, gated
`MYSQL_INTEGRATION=1`): round-trip dos repos Drizzle novos contra MySQL real —
- reset token: save → findByTokenHash (não-null) + findUnusedByUserId (1);
- lockout: save (upsert por PK) → findByUserId (failedAttempts 1 → 2).

RED conceitual: sem o MySQL na 3307 (porta livre) e sem a parametrização de porta nos testes, a
integração não rodava (porta 3306 ocupada por container alheio).
