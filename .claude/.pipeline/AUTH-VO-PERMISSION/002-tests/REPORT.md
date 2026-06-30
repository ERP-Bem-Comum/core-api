# W0 — Testes RED · AUTH-VO-PERMISSION

- **Wave:** W0 (RED) · **Skill:** `tdd-strategist` · **Data:** 2026-05-27 · **Outcome:** RED

## Arquivo de teste

`tests/modules/auth/domain/authorization/permission.test.ts` (mirror de `src/modules/auth/domain/authorization/permission.ts`, inexistente).

API exercitada (W1): `import * as Permission`, `Permission.parse(raw): Result<Permission, PermissionError>`.

## Mapa CA → teste (10 `it()`)

| CA | Casos |
| :-- | :-- |
| CA1 | `'contract:delete'` → ok; `'contract:mass-approve'` → ok; `'  Contract:Mass-Approve  '` → ok normalizado `'contract:mass-approve'` |
| CA2 | `''` e `'   '` → `err('permission-empty')` |
| CA3 | `'contractdelete'` (sem `:`), `'contract:'` (action vazio), `':delete'` (resource vazio), `'contract:delete:extra'` (2×`:`) → `err('permission-invalid-format')` |
| CA4 | `'@@@'` → `err('permission-invalid-format')` (total, sem throw) |

## Saída (RED)

```
ℹ tests 1
ℹ pass 0
ℹ fail 1
```

`ERR_MODULE_NOT_FOUND` — `permission.ts` ainda não existe. Nenhum arquivo em `src/` tocado.

## Decisões para o W1

- `PermissionError = 'permission-empty' | 'permission-invalid-format'`.
- Formato: regex `^[a-z0-9]+(?:-[a-z0-9]+)*:[a-z0-9]+(?:-[a-z0-9]+)*$` (após normalização).
- Precedência: trim + toLowerCase → `permission-empty` → `permission-invalid-format`.
- Path `domain/authorization/` (nova subpasta RBAC). YAGNI: só `parse`.
