# AUTH-REPO-USER — Ports `UserRepository` (write) + `UserReader` (read) + InMemory

## Origem

Fase A do módulo `auth`, ticket A1 (re-fatiado — ver [`AUTH-MODULE-TICKETS.md`](../../.planning/AUTH-MODULE-TICKETS.md)).
**Decisão:** [`design-decisions.md`](../../../handbook/domain/auth/design-decisions.md) `DD-PORTS-01` —
repo no domínio (§3.H.2), read/write split (ADR-0026). Espelha `contracts/domain/contract/repository.ts` +
`contract-repository.suite.ts` + `contract-repository.in-memory.ts`.

## Arquivos a criar

- `src/modules/auth/domain/identity/user/repository.ts` — ports `UserRepository` (write) + `UserReader` (read) + `UserRepositoryError`.
- `src/modules/auth/adapters/persistence/repos/user-repository.in-memory.ts` — `makeInMemoryUserStore()` → `{ repository, reader }` sobre o mesmo store.
- `tests/modules/auth/adapters/persistence/user-repository.contract.ts` — `runUserRepositoryContract(label, factory)` (suite parametrizada, **não** executa direto).
- `tests/modules/auth/adapters/persistence/user-repository.inmemory.test.ts` — roda a contract contra o InMemory.

## Contratos (types)

```ts
type UserRepositoryError = 'user-repo-unavailable';
type UserRepository = Readonly<{ save: (user: User) => Promise<Result<void, UserRepositoryError>> }>;
type UserReader = Readonly<{
  findById:    (id: UserId)     => Promise<Result<User | null, UserRepositoryError>>;
  findByEmail: (email: Email)   => Promise<Result<User | null, UserRepositoryError>>;
}>;
```

> `save` sem `events` por ora (auth ainda não tem outbox/public-api — adicionar quando a Fase de eventos chegar).
> Unicidade de e-mail é regra de **use case** (`findByEmail` antes de `save`), não do repo.

## Critérios de aceitação (contract-suite, rodada contra InMemory)

- **CA1:** `save(user)` → `reader.findById(user.id)` retorna o user salvo.
- **CA2:** `findById` de id inexistente → `ok(null)`.
- **CA3:** `save(user)` → `reader.findByEmail(user.email)` retorna o user.
- **CA4:** `findByEmail` de e-mail inexistente → `ok(null)`.
- **CA5 (upsert):** `save` de user com mesmo `id` atualiza (ex.: `disable` → `findById` reflete `status:'disabled'`).
- **CA6:** a mesma suite é reutilizável por qualquer adapter futuro (Drizzle/MySQL) sem alteração.

## Fora de escopo

- Adapter Drizzle/MySQL (Fase P). `RoleRepository`/`RefreshTokenRepository` (A2/A3). Eventos/outbox.

## Notas

- **Skill:** `ports-and-adapters` (+ `tdd-strategist` para a suite). Ports são `type Readonly<{}>`, async (`Promise<Result>`).
- **Pipeline W0→W3.** W0 RED: `user-repository.inmemory.test.ts` falha (port + InMemory inexistentes). ASCII puro.
