# W0 — Testes RED — AUTH-USECASE-LIST-USERS

**Wave:** W0 · **Outcome:** RED (esperado) · **Data:** 2026-06-07

Duas suítes:
- `tests/modules/auth/application/use-cases/list-users.test.ts` — 6 `it()` (CA1..CA6): validação/normalização/delegação do use case com fake `UserQuery`.
- `tests/modules/auth/adapters/persistence/user-query.in-memory.test.ts` — 6 `it()`: paginação, busca CI, filtro status, ordenação, página vazia do adapter in-memory.

```
✖ ERR_MODULE_NOT_FOUND: list-users.ts e user-query.in-memory.ts
```

RED válido (inexistência da API). Próximo (W1): `application/ports/user-query.ts`,
`application/use-cases/list-users.ts`, `adapters/persistence/repos/user-query.in-memory.ts`.
