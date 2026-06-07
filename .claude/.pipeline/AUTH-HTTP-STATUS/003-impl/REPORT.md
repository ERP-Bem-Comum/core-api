# W1 — Implementação · AUTH-HTTP-STATUS

**Agente:** fastify-server-expert · **Outcome:** GREEN

## Mudanças

- `adapters/http/users-plugin.ts` — rotas `PATCH /users/:id/deactivate` (`user:deactivate`) e
  `PATCH /users/:id/activate` (`user:activate`); `deactivate` extrai `actorId` de `req.userId` (JWT),
  nunca do body. Resposta 200 = detalhe atualizado (reusa `getUser`). Novas deps em `UsersHttpDeps`.
- `adapters/http/composition.ts` — `activateUser`/`deactivateUser` em `AuthHttpDeps` + instanciados.
- `src/server.ts` — wiring das 2 novas deps.
- 4 testes HTTP irmãos (list/create/detail/update) atualizados para o novo shape de `UsersHttpDeps`.

## Verde

```
tests 7 · pass 7 · fail 0
```

CA1 (401) · CA2 (403) · CA3 (deactivate→active=false) · CA4 (activate→active=true) · CA5 (idempotente) ·
CA6 (auto-desativação→422, id próprio descoberto via listagem) · CA7 (404).

## Nota de teste

CA6 descobre o próprio id por listagem sem `search` — o admin do seed não tem `name`, e a busca da US1
filtra por nome. Confirma que `actorId` (JWT `sub`) === `targetId` aciona `cannot-deactivate-self`.
