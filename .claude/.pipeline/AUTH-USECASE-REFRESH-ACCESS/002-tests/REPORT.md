# W0 (RED) — AUTH-USECASE-REFRESH-ACCESS

**Skill:** `tdd-strategist` · **Resultado:** RED (módulo inexistente)

## Teste escrito

`tests/modules/auth/application/use-cases/refresh-access-token.test.ts` — espelha o `makeCtx` do
`authenticate-user.test.ts` (fakes + `ClockFixed`), populando sessão via `registerUser` + `authenticateUser`.
Helper `login(ctx)` retorna `{ userId, refreshToken (claro), user }`. `makeRefresh(clockAt?)` permite
variar o relógio (CA4 expirado).

| Caso | Cobre |
| :-- | :-- |
| CA1 | rotação feliz → novo access verificável + novo refresh (≠ apresentado) + userId |
| CA2 | refresh antigo fica `rotated` (`replacedBy !== null`); novo persistido e `active` (`verify` ok) |
| CA3 | hash não encontrado → `refresh-token-not-found` |
| CA4 | clock após `expiresAt` → `refresh-token-expired` |
| CA5 | token revogado no repo → `refresh-token-revoked` |
| CA6 | `User.disable` + save → `user-disabled` **e** refresh apresentado fica `revoked` (DD-SESSION-04) |
| CA7 | reapresentar refresh `rotated` → `refresh-token-rotated` **e** o refresh novo (cadeia) fica `revoked` (DD-SESSION-05) |

## Saída RED

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../use-cases/refresh-access-token.ts'
  imported from '.../use-cases/refresh-access-token.test.ts'
ℹ tests 1 · pass 0 · fail 1
```

## Handoff para W1 (`ports-and-adapters`)

Criar `src/modules/auth/application/use-cases/refresh-access-token.ts` conforme o contrato e a sequência
em `000-request.md`. Sem ports/adapters novos (A6a entregou `hash` + `findRevocableByUserId`). Switch
exaustivo sobre `RefreshTokenError` no tratamento de `verify`; `Clock.now()`, nunca `new Date()`.
