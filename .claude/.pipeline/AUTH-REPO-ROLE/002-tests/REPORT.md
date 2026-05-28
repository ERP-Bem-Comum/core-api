# W0 — Testes RED · AUTH-REPO-ROLE

- **Wave:** W0 (RED) · **Skill:** `tdd-strategist` · **Data:** 2026-05-27 · **Outcome:** RED · **Decisão:** DD-PORTS-01.

## Artefatos
- `tests/modules/auth/adapters/persistence/role-repository.contract.ts` — suite parametrizada `runRoleRepositoryContract`.
- `tests/modules/auth/adapters/persistence/role-repository.inmemory.test.ts` — roda contra InMemory.

## Mapa CA → teste
| CA | Caso |
| :-- | :-- |
| CA1 | `save` → `findById` retorna role |
| CA2 | `findById` inexistente → `ok(null)` |
| CA3 | `save` mesmo id = upsert (permissão adicionada via `grant`) |
| CA4 | `save` 2 roles → `list` retorna 2 |

## Saída (RED)
```
ℹ tests 1 · pass 0 · fail 1  (ERR_MODULE_NOT_FOUND)
```
Falta `role-repository.ts` (port) + `role-repository.in-memory.ts`. `src/` intocado.

## Decisões W1
- 1 port `RoleRepository { save, findById, list }`; erro `'role-repo-unavailable'`. InMemory: `Map<RoleId, Role>`, factory sync.
