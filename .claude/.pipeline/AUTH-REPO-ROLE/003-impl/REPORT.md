# W1 — Implementação GREEN · AUTH-REPO-ROLE

- **Wave:** W1 (GREEN) · **Skill:** `ports-and-adapters` · **Data:** 2026-05-27 · **Outcome:** GREEN (4/4 · typecheck + lint + format limpos de primeira)

## Arquivos criados
- `src/modules/auth/domain/authorization/role-repository.ts` — port `RoleRepository { save, findById, list }` + `RoleRepositoryError`.
- `src/modules/auth/adapters/persistence/repos/role-repository.in-memory.ts` — `makeInMemoryRoleStore()` → `{ repository, clear }`.

## Aderência (DD-PORTS-01)
- Repo no domínio (§3.H.2); **1 port** (sem split — Role muda pouco). Contract-suite reutilizável.
- Lições do A1 já aplicadas (sem retrabalho de lint): `clear` com chaves, factory sync-ou-async, `async` arrows.

## Testes
```
ℹ tests 4 · pass 4 · fail 0
```
`typecheck` / `lint` / `format:check`: limpos.

## Próxima wave
W2.
