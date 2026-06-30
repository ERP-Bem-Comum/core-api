# W0 — Tests (RED)

Cobertura adicionada (falharia antes da impl):

- **BE-REC-005** `tests/modules/auth/domain/credential/password-policy.test.ts`: senha comum → `password-too-common`; case-insensitive; senha forte passa.
- **BE-REC-002** `tests/.../authenticate-user.test.ts`: spy no `verify` confirma que ele roda com usuario inexistente (1 chamada).
- **BE-REC-004** `tests/.../adapters/http/routes.test.ts`: change-password (204 + nova loga + antiga falha; 401 sem Bearer; 401 senha atual errada; 422 nova senha comum) e revoke-all (204 + refresh anterior invalidado).

RED inicial: a nova dep `dummyPasswordHash` do `authenticateUser` quebrou os 4 testes de use case que fazem login no setup (helper `_support/dummy-password-hash.ts` resolve).
