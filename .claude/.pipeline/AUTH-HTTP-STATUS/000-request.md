# AUTH-HTTP-STATUS — Rotas PATCH activate/deactivate (US5)

**Size:** M · **Spec:** `specs/005-gestao-usuarios/` (US5, contracts/http-users.md §PATCH, tasks T039–T040) · **Branch:** `005-gestao-usuarios`

> Borda HTTP da US5. Consome `activateUser`/`deactivateUser` (ticket `AUTH-USECASE-ACTIVATE-DEACTIVATE`,
> closed-green). Espelha as rotas existentes no `users-plugin.ts`.

## Decisões

1. **Rotas** `PATCH /users/:id/activate` (`user:activate`) e `PATCH /users/:id/deactivate` (`user:deactivate`).
2. **`deactivate` extrai `actorId` do JWT** (`req.userId`), nunca do body — alimenta a proteção
   `cannot-deactivate-self` (→ 422).
3. **Resposta 200 = detalhe atualizado** (reusa `getUser`), idempotente em relação ao status-alvo (FR-010).
4. **Mapa de erros**: `user-id-invalid`→400; `user-not-found`→404; `cannot-deactivate-self`→422;
   `user-repo-unavailable`→503.
5. **Wiring**: `activateUser`/`deactivateUser` em `AuthHttpDeps`/`buildAuthHttpDeps`, `UsersHttpDeps`,
   `server.ts` e os 4 testes HTTP irmãos.

## Arquivos

| Ação | Arquivo |
|---|---|
| Modificar | `adapters/http/users-plugin.ts` — 2 rotas PATCH + deps |
| Modificar | `adapters/http/composition.ts` — `activateUser`/`deactivateUser` em deps |
| Modificar | `src/server.ts` — wiring |
| Criar (teste) | `tests/modules/auth/adapters/http/users-status.route.test.ts` |

## Critérios de aceite (W0 — RED, via fastify.inject)

- **CA1**: 401 sem token (ambas as rotas).
- **CA2**: 403 sem a permission correspondente.
- **CA3**: deactivate de usuário ativo → 200; detalhe passa a `active=false`.
- **CA4**: activate de usuário inativo → 200; detalhe passa a `active=true`.
- **CA5**: deactivate repetido (já inativo) → 200 (idempotente).
- **CA6**: admin desativa a própria conta → 422 (`cannot-deactivate-self`).
- **CA7**: 404 para id inexistente.
