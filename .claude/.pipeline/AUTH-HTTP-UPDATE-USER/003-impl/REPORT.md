# W1 — Implementação · AUTH-HTTP-UPDATE-USER

**Agente:** fastify-server-expert · **Outcome:** GREEN

## Mudanças

- `adapters/http/users-schemas.ts` — `updateUserBodySchema` (todos os campos opcionais; `collaboratorId`
  nullable) + type `UpdateUserBody`.
- `adapters/http/users-plugin.ts` — rota `PUT /users/:id` (preHandler `authorize('user:update')`);
  handler monta o command com spreads condicionais (exactOptionalPropertyTypes), mapeia erros e
  responde 200 com o detalhe atualizado reusando `getUser`. Extraída a constante compartilhada
  `FIELD_VALIDATION_STATUS` (422), reusada por POST e PUT (DRY).
- `adapters/http/composition.ts` — `updateUserProfile` em `AuthHttpDeps` + instanciado em
  `buildAuthHttpDeps` (driver memory e mysql via `stores`).
- `src/server.ts` — `updateUserProfile` no wiring do `usersHttpPlugin`.

## Verde

```
tests 6 · pass 6 · fail 0
```

CA1 (401) · CA2 (403) · CA3 (200 + detalhe) · CA4 (409 email duplicado) · CA5 (422 cpf) · CA6 (404).
