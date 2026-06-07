# W0 — Testes RED — AUTH-HTTP-LIST-USERS

**Wave:** W0 · **Outcome:** RED (esperado) · **Data:** 2026-06-07

`tests/modules/auth/adapters/http/users-list.route.test.ts` — 8 `it()` (CA1..CA8) via `fastify.inject`
(driver memory, sem Docker): 401, 403, 200 paginado, pageSize válido/ inválido (422), filtro status,
paginação além do total.

```
✖ SyntaxError: '#src/modules/auth/public-api/http.ts' does not provide an export named 'usersHttpPlugin'
ℹ pass 0 · fail 1
```

RED válido (rota/plugin inexistentes). Design consultado com `fastify-server-expert` (rota/schemas/wiring)
e `drizzle-orm-expert` (adapter). Próximo (W1): integrar schemas + adapter Drizzle + plugin + wiring +
índice/migration.
