# W0 — Tests (RED)

Novos (falhavam por inexistência dos módulos):

- `tests/modules/auth/domain/session/password-reset-token.test.ts`: issue válido/inválido (hash vazio, expiry≤request); state pending→expired; consume one-time (2º uso → `reset-token-used`); consume após TTL → `reset-token-expired`.
- `tests/modules/auth/domain/session/password-reset-token-id.test.ts`: generate UUID v4 reidratável; rehydrate rejeita inválido.
