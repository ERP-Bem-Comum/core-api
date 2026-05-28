# W0 — Testes RED · AUTH-USECASE-REGISTER-USER (A4)

- **Wave:** W0 (RED) · **Skill:** `tdd-strategist` · **Data:** 2026-05-27 · **Outcome:** RED.

## Artefato
- `tests/modules/auth/application/use-cases/register-user.test.ts` — InMemory user store + fake hasher + `ClockFixed`.

## Mapa CA → teste
| CA | Caso |
| :-- | :-- |
| CA1 | input válido → `ok({user,event})`; active; email normalizado; `UserRegistered`; `occurredAt`=clock; persistido |
| CA2 | email `'invalid'` → `err('email-invalid-format')` |
| CA3 | senha `'short'` → `err('password-too-short')` |
| CA4 | 2º registro mesmo e-mail → `err('email-already-registered')` |
| CA5 | `passwordHash != senha`; `hasher.verify(senha, hash) === true` |

## Saída (RED)
```
ℹ tests 1 · pass 0 · fail 1  (ERR_MODULE_NOT_FOUND)
```

## Decisões W1
- Factory `(deps) => async (cmd) => Promise<Result>`. Sequência validate→fetch→hash→domain→persist. Early-return (α) na validação.
- `UserId.generate()` no use case. Sem publicação (retorna `event` no output). `roles: []` no registro.
