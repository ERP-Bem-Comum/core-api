# AUTH-HTTP-ME — Minha Conta (US7)

**Size:** M · **Spec:** `specs/005-gestao-usuarios/` (US7, contracts/http-users.md §autosserviço, tasks T045–T047) · **Branch:** `005-gestao-usuarios`

> Borda HTTP de autosserviço. **Sem use case/domínio novo** — reusa `getUser`, `updateUserProfile`,
> `requestPasswordReset` (já em `AuthHttpDeps`). Plugin próprio `meHttpPlugin` (recurso "minha conta").

## Decisões

1. **Self por construção**: todas as rotas operam em `req.userId` (do JWT) — não há parâmetro `:id`,
   logo é impossível editar terceiros (cobre o AC "nega edição de terceiros"; a edição de terceiros só
   existe na rota admin `PUT /users/:id`, protegida por `user:update` — US4).
2. **`GET /api/v1/me`** (só sessão): `getUser(req.userId)` → 200 detalhe.
3. **`PUT /api/v1/me`** (só sessão): edita o próprio perfil. Schema restrito a `name`/`telephone`
   (`meUpdateBodySchema`) — autosserviço NÃO altera `collaboratorId` (vínculo administrativo) nem
   campos sensíveis. Reusa `updateUserProfile({ id: req.userId, ... })` → 200 detalhe.
4. **`POST /api/v1/me/password-reset`** (só sessão): obtém o email via `getUser(req.userId)` e dispara
   `requestPasswordReset({ email })`. Responde **sempre 202** (fluxo assíncrono; consistente com o
   anti-enumeração do use case).
5. Sem `authorize(...)` — apenas `requireAuth` (self).

## Arquivos

| Ação | Arquivo |
|---|---|
| Criar | `adapters/http/me-plugin.ts` (`meHttpPlugin` + `MeHttpDeps`) |
| Modificar | `adapters/http/users-schemas.ts` — `meUpdateBodySchema` |
| Modificar | `public-api/http.ts` — exportar `meHttpPlugin` + `MeHttpDeps` |
| Modificar | `src/server.ts` — registrar `meHttpPlugin` sob `/api/v1` |
| Criar (teste) | `tests/modules/auth/adapters/http/me-account.route.test.ts` |

## Critérios de aceite (W0 — RED, inject)

- **CA1**: `GET /me` sem token → 401.
- **CA2**: `GET /me` com token → 200; `email` == usuário logado.
- **CA3**: `PUT /me` altera nome/telefone → 200; detalhe reflete.
- **CA4**: `PUT /me` sem token → 401.
- **CA5**: `POST /me/password-reset` → 202.
- **CA6**: usuário comum (sem `user:update`) tentando `PUT /users/<outro>` → 403 (self-only reforçado).
