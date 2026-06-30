# W0 — Tests (RED)

- `tests/.../use-cases/confirm-password-reset.test.ts` (novo): token válido → troca a senha (hash novo verifica), marca token usado, revoga sessões; token inexistente → `reset-token-invalid`; token expirado → `reset-token-expired`; nova senha comum → `password-too-common` (token NÃO queimado, segue pending).
- `tests/.../adapters/http/routes.test.ts` (+1): `POST /reset-password` com token inválido → 400 `reset-token-invalid`.

RED: use case `confirmPasswordReset` e rota não existiam.
