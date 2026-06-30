# W1 — Implementação GREEN — AUTH-GET-USER

**Wave:** W1 · **Outcome:** GREEN · **Data:** 2026-06-07

- `application/use-cases/get-user.ts` — `getUser(deps)(rawId)` → `Result<UserDetail, GetUserError>`. Reusa
  `UserReader.findById`; compõe `massApprovalPermission` das `roles` (funciona p/ disabled, sem `listPermissions`);
  `active` = `status==='active'`; `collaboratorId` opaco.
- `adapters/http/users-plugin.ts` — rota `GET /users/:id` (params Zod, `authorize('user:read')`, `sendResult`
  mapeia `user-id-invalid→400`, `user-not-found→404`). Padrão validado na US1 (fastify-server-expert).
- `users-schemas.ts` (param + detail response), wiring `composition.ts`/`server.ts`.

## Resultado

```
get-user (use case): 5/5 · users-detail.route (inject): 4/4 → 9 pass
```

Sem adapter Drizzle novo nem migration (reusa `userReader.findById`, que já reidrata o perfil via mapper).
