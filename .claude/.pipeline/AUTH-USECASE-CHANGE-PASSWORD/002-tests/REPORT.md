# W0 (RED) — AUTH-USECASE-CHANGE-PASSWORD

**Skill:** `tdd-strategist` · **Resultado:** RED (módulo inexistente)

## Teste escrito

`tests/modules/auth/application/use-cases/change-password.test.ts` — `makeCtx` com register+authenticate+change;
helpers `verifyPlain` (confere o `passwordHash` persistido via fake hasher determinístico) e `isRevoked`
(estado do refresh persistido).

| Caso | Cobre |
| :-- | :-- |
| CA1 | troca OK → `ok`, `event.type === 'PasswordChanged'`, `verify(new)` true / `verify(old)` false |
| CA2 | senha atual errada → `invalid-credentials`; senha não muda |
| CA3 | nova senha curta → `password-too-short`; senha não muda |
| CA4 | user inexistente → `invalid-credentials` |
| CA5 | user disabled → `user-disabled` |
| CA6 | troca OK → ambas as sessões (2 logins) ficam `revoked` (ASVS V3.3) |
| CA7 | troca não revoga sessão de outro usuário |

## Saída RED

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../use-cases/change-password.ts'
ℹ tests 1 · pass 0 · fail 1
```

## Handoff para W1 (`ports-and-adapters`)

Criar `src/modules/auth/application/use-cases/change-password.ts` conforme `000-request.md`/DD-USER-06.
Re-auth (verify senha atual), política na nova, `User.changePassword`, save, **revoga todas as sessões**
após o save. Helper local `revokeAllForUser`. `Clock.now()`; sem `throw`/`class`. Lint antecipado no W1.
