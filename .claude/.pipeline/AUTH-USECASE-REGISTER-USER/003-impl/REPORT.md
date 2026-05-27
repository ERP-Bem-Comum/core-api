# W1 — Implementação GREEN · AUTH-USECASE-REGISTER-USER (A4)

- **Wave:** W1 (GREEN) · **Skill:** `ports-and-adapters` · **Data:** 2026-05-27 · **Outcome:** GREEN (5/5 · typecheck + lint + format limpos)

## Arquivo criado
- `src/modules/auth/application/use-cases/register-user.ts` — `registerUser(deps)(cmd)`.

## Aderência
- **Sequência** validate (Email/Password, early-return α) → fetch (`findByEmail`, unicidade) → hash (port) → domain (`User.register`) → persist (`save`). `UserId.generate()` no use case; `clock.now()` injeta o `occurredAt`.
- **DD-USER-04:** senha em claro vira `PasswordHash` no port e nunca persiste. **Sem publicação** (auth sem EventBus) — retorna `{ user, event }`.
- Amarra os ports A1 (`UserReader`/`UserRepository`) + X1 (`PasswordHasher`) + `Clock`.

## Testes
```
ℹ tests 5 · pass 5 · fail 0
```
`typecheck`/`lint`/`format`: limpos. Primeiro use case do auth exercitado end-to-end com InMemory + fake hasher + ClockFixed.

## Próxima wave
W2.
