# AUTH-USECASE-LIST-USERS — Read model + use case de listagem (US1, MVP)

**Size:** M · **Spec:** `specs/005-gestao-usuarios/` (US1, tasks T016–T020) · **Branch:** `005-gestao-usuarios`

## Escopo

Camada **application** da US1 (listar/buscar/filtrar). Domínio/persistência puros desta fatia:

- **Port `UserQuery`** (read model) em `src/modules/auth/application/ports/user-query.ts` — projeção
  paginada, separada do `UserRepository` (CQRS-lite). Tipos: `UserListItem`, `PageMeta`, `PagedUsers`,
  `ListUsersQuery`, `UserStatusFilter`, `UserQueryError`.
- **Use case `list-users`** em `src/modules/auth/application/use-cases/list-users.ts` — valida/normaliza
  entrada e delega ao port.
- **Adapter in-memory** `UserQuery` em `adapters/persistence/repos/user-query.in-memory.ts` (para testes/fake).

Fora de escopo (ticket `AUTH-HTTP-LIST-USERS`): adapter Drizzle, rota HTTP, coleção Bruno.

## Contrato

```ts
export type UserStatusFilter = 'active' | 'disabled' | 'all';
export type UserListItem = Readonly<{ id: string; name: string | null; email: string; status: 'active' | 'disabled' }>;
export type PageMeta = Readonly<{ currentPage: number; pageSize: number; totalItems: number; totalPages: number }>;
export type PagedUsers = Readonly<{ items: readonly UserListItem[]; meta: PageMeta }>;
export type ListUsersQuery = Readonly<{ page: number; pageSize: number; search?: string; status: UserStatusFilter }>;
export type ListUsersInput = Readonly<{ page?: number; pageSize?: number; search?: string; status?: UserStatusFilter }>;
export type ListUsersError = 'invalid-page' | 'invalid-page-size' | UserQueryError;
```

## Critérios de aceite (W0)

- **CA1**: entrada válida delega ao port com params normalizados e retorna o `PagedUsers` do port.
- **CA2**: `pageSize` fora de {5,10,25} → `err('invalid-page-size')`.
- **CA3**: `page` < 1 → `err('invalid-page')`.
- **CA4**: defaults — input vazio vira `page=1, pageSize=5, status='all'`.
- **CA5**: `search` é trimado; vazio/só-espaços vira ausência de filtro de busca.
- **CA6**: erro do port (`user-query-unavailable`) propaga como `err`.

## Invariantes

- Application orquestra; `Result` na borda; sem `throw`. Read model é projeção (strings simples, não branded).
- `pageSize` ∈ {5,10,25} espelha o legado (FR-001).
