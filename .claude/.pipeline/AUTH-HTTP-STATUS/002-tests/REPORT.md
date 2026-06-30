# W0 — Testes RED · AUTH-HTTP-STATUS

**Agente:** tdd-strategist · **Outcome:** RED

## Suíte

`tests/modules/auth/adapters/http/users-status.route.test.ts` — 7 casos (CA1–CA7), via `fastify.inject`,
driver memory.

## RED verificado

```
tests 7 · pass 1 · fail 6
```

6/7 falham porque as rotas `PATCH /users/:id/activate|deactivate` ainda não existem (404 de rota
desconhecida). CA7 (espera 404 para id inexistente) passa por coincidência — após a implementação
deve permanecer 404 pela razão correta (use case → `user-not-found`). CA6 descobre o próprio id via
listagem filtrada e valida a proteção de auto-desativação (→ 422).
