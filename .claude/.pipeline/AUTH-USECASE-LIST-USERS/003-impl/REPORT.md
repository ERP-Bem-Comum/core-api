# W1 — Implementação GREEN — AUTH-USECASE-LIST-USERS

**Wave:** W1 · **Outcome:** GREEN · **Data:** 2026-06-07

- `application/ports/user-query.ts` — port read model (`UserQuery`, `ListUsersQuery`, `PagedUsers`, …).
- `application/use-cases/list-users.ts` — valida/normaliza (`page≥1`, `pageSize∈{5,10,25}`, `search` trimado, defaults) e delega ao port.
- `adapters/persistence/repos/user-query.in-memory.ts` — projeção sobre `User[]`: busca CI por nome, filtro status, ordenação alfabética, paginação por offset.

```
list-users + user-query.in-memory → tests 12 · pass 12 · fail 0
```

YAGNI: use case fino; read model com strings simples (não branded). Adapter Drizzle e rota HTTP ficam
no ticket `AUTH-HTTP-LIST-USERS`.
