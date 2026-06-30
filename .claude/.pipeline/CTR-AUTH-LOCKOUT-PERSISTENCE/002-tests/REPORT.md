# W0 — Tests (RED)

`tests/modules/auth/adapters/persistence/account-lockout.mapper.test.ts` (novo):
- round-trip `toInsert` → `fromRow` preserva userId/failedAttempts/lockedUntil;
- `lockedUntil` null → sem bloqueio (`isLocked` false);
- userId inválido → erro tagged `AccountLockoutMapperInvalidUserId`.

RED: mapper e schema `auth_login_lockout` não existiam.
