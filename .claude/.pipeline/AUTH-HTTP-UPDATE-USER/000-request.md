# AUTH-HTTP-UPDATE-USER — Rota PUT /api/v1/users/:id (US4)

**Size:** M · **Spec:** `specs/005-gestao-usuarios/` (US4, contracts/http-users.md §`PUT /api/v1/users/:id`, tasks T035–T036) · **Branch:** `005-gestao-usuarios`

> Borda HTTP da US4. Consome o use case `updateUserProfile` (ticket `AUTH-USECASE-UPDATE-PROFILE`,
> closed-green). Espelha o padrão das rotas `GET/POST /users` no mesmo `users-plugin.ts`.

## Decisões

1. **Rota `PUT /api/v1/users/:id`** no `users-plugin.ts`; preHandler `[requireAuth, authorize('user:update')]`.
2. **Body parcial** (`updateUserBodySchema`): `name?`, `email?`, `cpf?`, `telephone?`, `collaboratorId?`
   — todos opcionais (patch). Zod só na borda; o domínio valida via VOs.
3. **Resposta 200 = detalhe atualizado.** Após o update OK, reusa `getUser(id)` → `userDetailResponseSchema`
   (mesma shape do `GET /:id`, DRY). Custo: uma leitura extra numa operação de escrita administrativa.
4. **Mapa de erros → status**: `user-id-invalid`→400; `user-not-found`→404; validações de campo
   (`name-required`, `email-*`, `cpf-*`, `telephone-*`)→422; `email-already-registered`→409;
   `user-repo-unavailable`→503.
5. **Wiring**: `updateUserProfile` entra em `AuthHttpDeps`/`buildAuthHttpDeps` (composition) e em
   `UsersHttpDeps` (plugin). `exactOptionalPropertyTypes`: handler monta o command com spreads condicionais.

## Arquivos

| Ação | Arquivo |
|---|---|
| Modificar | `adapters/http/users-schemas.ts` — `updateUserBodySchema` |
| Modificar | `adapters/http/users-plugin.ts` — rota PUT + dep `updateUserProfile` |
| Modificar | `adapters/http/composition.ts` — `updateUserProfile` em deps |
| Criar (teste) | `tests/modules/auth/adapters/http/users-update.route.test.ts` |

## Critérios de aceite (W0 — RED, via fastify.inject)

- **CA1**: 401 sem token.
- **CA2**: 403 sem permission `user:update`.
- **CA3**: 200 edita nome/telefone → detalhe reflete os novos valores; demais preservados.
- **CA4**: 409 ao trocar email para o de outro usuário existente.
- **CA5**: 422 com CPF inválido.
- **CA6**: 404 para id inexistente.
