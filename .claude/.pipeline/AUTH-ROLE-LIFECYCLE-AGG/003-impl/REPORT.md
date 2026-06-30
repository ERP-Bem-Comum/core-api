# W1 — Implementação mínima · AUTH-ROLE-LIFECYCLE-AGG

**Agente:** ts-domain-modeler · **Outcome:** GREEN ✅

## Mudanças

1. **Agregado** `src/modules/auth/domain/authorization/role.ts`:
   - Tipo `Role` ganha `status: RoleStatus ('active'|'archived')`; `name: RoleName` (era `string`).
   - `RoleError = 'role-name-invalid' | 'role-permission-not-in-catalog' | 'role-in-use'`.
   - `create` (nasce `active`, valida nome via `RoleName`), `rehydrate` (do banco, com `status`, sem revalidar catálogo), `rename`, `setPermissions` (⊆ catálogo via `PermissionCatalog.isInCatalog`), `archive(isInUse)` (FR-012). `hasPermission`/`grant`/`revoke` mantidos.
2. **Mapper** `role.mapper.ts`:
   - `roleFromRows` migra `Role.create` → `Role.rehydrate` passando `status` (coerção segura `'archived' | 'active'`).
   - `roleToInsert` inclui `status: role.status`.

## Regressão zero (cascata controlada)

- `tests/.../role.test.ts` CA5 esperava `role-name-empty` → atualizado para `role-name-invalid` (mudança deliberada de API: nome agora via `RoleName`). Único call-site afetado.
- Nenhuma outra cascata: suíte completa + integração verdes.

## Prova de GREEN

```
lifecycle: tests 10 · pass 10 · fail 0
suite completa: 2451 · pass 2433 · fail 0 · skipped 18
integração MySQL (test:integration:auth): 38 · pass 38 · fail 0  ← mapper lê/grava status
```

## Re-scoping (deferido — ver 000-request)

- **T009 (eventos `Role*`)** e **T011 (repo `create/update/archive/listAll` + `isInUse`)** ficam fora. T011 vai para o ticket irmão `AUTH-ROLE-REPO-CRUD`, que fecha de fato a Foundational.
