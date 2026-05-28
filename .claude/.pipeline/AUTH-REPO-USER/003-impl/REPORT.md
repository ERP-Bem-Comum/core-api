# W1 — Implementação GREEN · AUTH-REPO-USER

- **Wave:** W1 (GREEN) · **Skill:** `ports-and-adapters` · **Data:** 2026-05-27 · **Outcome:** GREEN (5/5 · typecheck + lint + format limpos)

## Arquivos criados

- `src/modules/auth/domain/identity/user/repository.ts` — ports `UserRepository` (write: `save`) + `UserReader` (read: `findById`/`findByEmail`) + `UserRepositoryError`.
- `src/modules/auth/adapters/persistence/repos/user-repository.in-memory.ts` — `makeInMemoryUserStore()` → `{ repository, reader, clear }` sobre um `Map<UserId, User>`.

## Aderência (DD-PORTS-01)

- Repo no **domínio** (§3.H.2). **Read/write split** (ADR-0026): 2 ports sobre o mesmo store no InMemory; em prod viram pools writer/reader sem refactor.
- `save` sem `events` (auth ainda sem outbox). Unicidade de e-mail é regra de use case.
- Contract-suite parametrizada reutilizável por adapter futuro (Drizzle/MySQL).

## Ajustes de lint durante o W1

1. `clear: () => map.clear()` → bloco com chaves (`no-confusing-void-expression`).
2. Factory `make`: conflito `require-await` × `promise-function-async` resolvido tornando o setup **sync-ou-async** (`UserRepoSetup | Promise<UserRepoSetup>`); InMemory retorna sync, `await` na suite lida com ambos.
3. `type UserRepoSetup` → `interface` (`consistent-type-definitions`).

## Testes

```
ℹ tests 5 · pass 5 · fail 0
```
`typecheck` / `lint` / `format:check`: limpos.

## Próxima wave
W2 (code review read-only).
