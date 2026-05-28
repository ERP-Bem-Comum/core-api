# AUTH-REPO-ROLE — Port `RoleRepository` + InMemory

## Origem

Fase A, ticket A2 ([`AUTH-MODULE-TICKETS.md`](../../.planning/AUTH-MODULE-TICKETS.md)). Decisão `DD-PORTS-01`:
repo no domínio (§3.H.2). Diferente do User, `Role` usa **1 port** (sem read/write split — papéis mudam
pouco). Espelha o padrão de `AUTH-REPO-USER` (closed-green).

## Arquivos a criar

- `src/modules/auth/domain/authorization/role-repository.ts` — port `RoleRepository` + `RoleRepositoryError`.
- `src/modules/auth/adapters/persistence/repos/role-repository.in-memory.ts` — `makeInMemoryRoleStore()` → `{ repository, clear }`.
- `tests/modules/auth/adapters/persistence/role-repository.contract.ts` — `runRoleRepositoryContract(label, factory)`.
- `tests/modules/auth/adapters/persistence/role-repository.inmemory.test.ts` — roda a contract contra InMemory.

## Contrato (type)

```ts
type RoleRepositoryError = 'role-repo-unavailable';
type RoleRepository = Readonly<{
  save:     (role: Role)   => Promise<Result<void, RoleRepositoryError>>;
  findById: (id: RoleId)   => Promise<Result<Role | null, RoleRepositoryError>>;
  list:     ()             => Promise<Result<readonly Role[], RoleRepositoryError>>;
}>;
```

> `findByName` (name é unique) entra quando um use case precisar — YAGNI.

## Critérios de aceitação (contract-suite vs InMemory)

- **CA1:** `save(role)` → `findById(role.id)` retorna o role.
- **CA2:** `findById` inexistente → `ok(null)`.
- **CA3 (upsert):** `save` de role com mesmo `id` (após `grant` de nova permissão) → `findById` reflete a permissão adicionada.
- **CA4:** `save` de 2 roles → `list` retorna ambos.
- **CA5:** suite reutilizável por adapter futuro.

## Fora de escopo

- Adapter Drizzle/MySQL (Fase P). `findByName`. Read/write split (Role não justifica).

## Notas

- **Skill:** `ports-and-adapters`. Port `type Readonly<{}>` async. InMemory: `Map<RoleId, Role>`, `clear` com chaves (lint), factory sync-ou-async.
- **Pipeline W0→W3.** RED: `role-repository.inmemory.test.ts` falha (port + InMemory inexistentes). ASCII puro.
