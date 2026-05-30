# W0 — Tests (RED)

- **Domínio** `tests/modules/auth/domain/session/account-lockout.test.ts` (novo): inicial; abaixo do threshold não bloqueia; threshold-ésima bloqueia 1min; progressão 5/15/cap 60min (nunca permanente); reset. RED: `account-lockout.ts` não existia.
- **Use case** `authenticate-user.test.ts` (+2): cooldown após threshold falhas bloqueia até senha correta; falhas abaixo do threshold permitem login (reset). RED: `authenticateUser` não tinha lockoutStore/lockoutPolicy.
