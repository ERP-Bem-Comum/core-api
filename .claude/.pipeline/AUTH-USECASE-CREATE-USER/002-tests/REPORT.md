# W0 — Testes RED — AUTH-USECASE-CREATE-USER

**Wave:** W0 · **Outcome:** RED (esperado) · **Data:** 2026-06-07

`tests/modules/auth/application/use-cases/create-user-by-admin.test.ts` — 8 `it()` de **segurança**
(design do `security-backend-expert`): placeholder não-autenticável, convite 1×, URL de config
(anti host-injection), email dup sem side-effect, fail-closed no envio, validação, `UserCreated` sem PII,
token TTL.

```
✖ ERR_MODULE_NOT_FOUND: create-user-by-admin.ts / invite-mailer.ts / User.create
ℹ RED esperado
```

Próximo (W1): `events.ts` (`UserCreated`), `user.ts` (`User.create`), port `invite-mailer.ts`,
use case `create-user-by-admin.ts`. Adapter email + wiring + rota = ticket `AUTH-HTTP-CREATE-USER`.
