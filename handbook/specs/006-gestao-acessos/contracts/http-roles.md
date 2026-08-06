# Contrato HTTP — Gestão de Acessos (`/api/v1`)

Borda Fastify + Zod/OpenAPI (ADR-0025/0027/0028), sob `src/modules/auth/adapters/http`. Toda rota exige
sessão + permission (fail-closed, FR-009). Erros via problem+json; `Result<T,E>` mapeado na borda.

## Permissões (catálogo fixo, read-only)

### `GET /api/v1/permissions`

- **200**: `{ items: [{ id: "resource:action", resource, action }] }` — catálogo completo, sem duplicatas.
- **Permission**: `role:read`. Sem POST/PUT/DELETE (catálogo é imutável em runtime, FR-011).

## Papéis

### `GET /api/v1/roles`

- **200**: `{ items: [{ id, name, active, permissions: ["resource:action", …] }] }`.
- **Permission**: `role:read`.

### `POST /api/v1/roles`

- **Body**: `{ name, permissions: ["resource:action", …] }`.
- **201**: `{ id }` · **409**: nome duplicado · **422**: permissão fora do catálogo / nome inválido.
- **Permission**: `role:create`.

### `PUT /api/v1/roles/:id`

- **Body**: `{ name?, permissions? }` — substitui o conjunto de permissões; renomeia.
- **200**: papel atualizado · **409**: nome duplicado · **422**: permissão fora do catálogo.
- **Permission**: `role:update`. Propaga às permissões efetivas dos usuários (FR-007).

### `PATCH /api/v1/roles/:id/deactivate`

- **200**: papel desativado (não-atribuível).
- **409**: papel **ainda atribuído** a usuários → bloqueado; mensagem orienta revogar antes (FR-012).
- **Permission**: `role:update`.

## Atribuição usuário ↔ papel

### `GET /api/v1/users/:id/permissions`

- **200**: `{ permissions: ["resource:action", …] }` — efetivas (união), inclui `contract:mass-approve` se houver.
- **Permission**: `role:read`.

### `POST /api/v1/users/:id/roles`

- **Body**: `{ roleId }`. **200/201**: idempotente (no-op se já tem). **Permission**: `role:assign` (ou `user:assign-role` existente).

### `DELETE /api/v1/users/:id/roles/:roleId`

- **200/204**: idempotente (no-op se não tem). **422**: auto-rebaixamento da gestão de acessos bloqueado (FR-010).
- **Permission**: `role:revoke`.

## Notas

- Versionado sob `/api/v1`; reusa `assign-role`/`list-user-permissions`/`list-permissions` existentes.
- Nomes de permission de gestão (`role:*`) provisórios — consolidar no `/speckit-tasks`.
