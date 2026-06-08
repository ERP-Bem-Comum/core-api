# AUTH-ROLE-REPO-CONTRACT-SUITE — validação + reconciliação (US2 da spec 007)

> **Achado:** a contract suite compartilhada do `RoleRepository` **já existia** —
> `tests/modules/auth/adapters/persistence/role-repository.contract.ts` exporta
> `runRoleRepositoryContract(label, factory)` (CA1-CA6) e é consumida por
> `role-repository.inmemory.test.ts` e `role-repository.drizzle.test.ts`. Entregue no
> ticket `AUTH-ROLE-REPO-CRUD` (2026-06-08). A pendência **T023 da 006 estava, na prática,
> resolvida** — o `tasks.md` da 006 é que não havia sido reconciliado.

## Escopo deste ticket

Não há código novo. Validar e reconciliar:

- ✅ in-memory: `role-repository.inmemory.test.ts` → 7/7 verde (`pnpm test`).
- ✅ Drizzle/MySQL: `RoleRepository contract — Drizzle/MySQL` (CA1-CA6) verde em
  `pnpm run test:integration:auth` (40/40, Docker).
- Marcar **T023** e **T051** da spec 006 como fechadas (reconciliação).
- Marcar **T008/T009** da spec 007 (US2) como done.

## Critério de aceitação

A contract suite roda verde nos dois adapters (provado acima) — SC-005 da 006 / SC-005 da 007. Sem regressão.
