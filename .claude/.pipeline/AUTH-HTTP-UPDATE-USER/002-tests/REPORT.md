# W0 — Testes RED · AUTH-HTTP-UPDATE-USER

**Agente:** tdd-strategist · **Outcome:** RED

## Suíte

`tests/modules/auth/adapters/http/users-update.route.test.ts` — 6 casos (CA1–CA6), via `fastify.inject`,
driver memory. Cria usuários por `POST /users` e edita por `PUT /users/:id`.

## RED verificado

```
tests 6 · pass 1 · fail 5
```

5/6 falham porque a rota `PUT /api/v1/users/:id` ainda não existe (Fastify → 404 para rota
desconhecida). CA6 (espera 404 para id inexistente) passa por coincidência com o 404 de rota
ausente — após a implementação deve permanecer 404 pela razão correta (use case → `user-not-found`).
