# W0 — Testes RED · AUTH-AGG-ROLE

- **Wave:** W0 (RED) · **Skill:** `tdd-strategist` · **Data:** 2026-05-27 · **Outcome:** RED

## Arquivos de teste (mirror)

- `tests/modules/auth/domain/authorization/role-id.test.ts` → `RoleId` (3 `it()`)
- `tests/modules/auth/domain/authorization/role.test.ts` → `Role` (8 `it()`)

## Mapa CA → teste

| CA | Caso |
| :-- | :-- |
| CA1 | `generate()` → aceito por `rehydrate` |
| CA2 | `rehydrate(<uuid v4>)` → ok |
| CA3 | `rehydrate('not-a-uuid')` → `err('role-id-invalid')` |
| CA4 | `create` válido → ok, name trimado, 2 permissions |
| CA5 | name só espaços → `err('role-name-empty')` |
| CA6 | input com permissão duplicada → 1 permission no Role |
| CA7 | `hasPermission` true (contida) / false (ausente) |
| CA8 | `grant` adiciona; idempotente (não duplica) |
| CA9 | `revoke` remove; ausência é no-op |

## Saída (RED)

```
ℹ tests 2
ℹ pass 0
ℹ fail 2
```

`ERR_MODULE_NOT_FOUND` — `role-id.ts`/`role.ts` inexistentes. `src/` intocado.

## Decisões para o W1

- `RoleId` espelha `contract-id.ts` (`newUuid`/`isUuidV4`); erro `'role-id-invalid'`.
- `Role` **não-brandado** (§3.A.1): `Readonly<{ id, name, permissions }>`. `create` valida name (`role-name-empty`) e **deduplica** permissions (`new Set`).
- `hasPermission`/`grant`/`revoke` puros, imutáveis (`immutable` + spread/filter). `grant` idempotente.
- Helper de teste `perm()` usa `Permission.parse` + assert (throw em teste é permitido).
