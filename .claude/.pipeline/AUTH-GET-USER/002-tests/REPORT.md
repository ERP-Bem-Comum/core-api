# W0 — Testes RED — AUTH-GET-USER

**Wave:** W0 · **Outcome:** RED (esperado) · **Data:** 2026-06-07

- `tests/modules/auth/application/use-cases/get-user.test.ts` — 5 `it()` (CA1..CA5): achado, id inválido, não encontrado, massApprovalPermission, disabled→active=false.
- `tests/modules/auth/adapters/http/users-detail.route.test.ts` — 4 `it()` (CA6..CA8): 401, 403, 200 shape, 404.

```
✖ ERR_MODULE_NOT_FOUND: get-user.ts; rota /users/:id inexistente
ℹ pass 1 · fail 4 (RED esperado)
```

Próximo (W1): `get-user.ts` (use case + `UserDetail`), rota `GET /users/:id` no `users-plugin`, wiring.
