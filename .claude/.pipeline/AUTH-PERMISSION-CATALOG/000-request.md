# AUTH-PERMISSION-CATALOG

> Spec: `specs/006-gestao-acessos` (Phase 2 Foundational) · Tasks: T003 (RED) + T006 (impl) · Size: S

## Escopo

Catálogo fixo de permissões em código: `src/modules/auth/domain/authorization/permission-catalog.ts` — exporta o conjunto canônico de `Permission` (`resource:action`) do sistema. Fonte única de verdade para (a) `list-permissions` (US2), (b) validação `Role.setPermissions ⊆ catálogo` (US5/US6), (c) seed de `auth_permission` (T010).

**Catálogo deploy-time, imutável em runtime** (FR-011, ADR-0037 não altera isso). **Destrava o T048 da `005`** — as permissions `user:*` exibidas/consumidas pela 005 saem deste catálogo único.

**Fora de escopo:** seed na tabela `auth_permission` (T010, em `AUTH-ROLE-SCHEMA-STATUS`); rota HTTP (US2).

## Conteúdo do catálogo (inicial)

- **`role:*`** (gestão de acessos, esta spec): `role:read`, `role:create`, `role:update`, `role:assign`, `role:revoke`.
- **`user:*`** (coordenar com a 005 / T048): `user:list`, `user:read`, `user:create`, `user:update`, `user:activate`, `user:deactivate`.
- **`contract:mass-approve`** (citada no ADR-0024; exibida read-only pela 005, FR-013).

## Critérios de aceitação

- **CA1**: Exporta um conjunto/lista de `Permission` (já validadas via `Permission.parse`), não strings cruas.
- **CA2**: Não-vazio e **sem duplicatas** (conjunto).
- **CA3**: Todas no formato canônico `resource:action` (garantido por construir via `Permission.parse`).
- **CA4**: Expõe um predicado de pertencimento (ex.: `isInCatalog(p: Permission): boolean`) para validação de `setPermissions`.
- **CA5**: ASCII puro; module-as-namespace.

## Referências de reuso (T001)

- `permission.ts` (`Permission`, `parse`) — construir cada entrada via `parse` e falhar em build se inválida.
- `shared/primitives/result.ts`.

## Pipeline

- **W0** (T003): `tests/modules/auth/domain/authorization/permission-catalog.test.ts` RED (não-vazio; sem duplicatas; formato; pertencimento).
- **W1** (T006): `permission-catalog.ts` mínimo até GREEN.
- **W2/W3**: review read-only + gate.
