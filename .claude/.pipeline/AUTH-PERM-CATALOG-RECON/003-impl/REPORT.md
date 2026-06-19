# W1 — Implementação (GREEN) · AUTH-PERM-CATALOG-RECON

**Data**: 2026-06-19

Adicionadas 6 entradas ao `CATALOG_RAW` em `src/modules/auth/domain/authorization/permission-catalog.ts` (ordenadas por resource, com comentário de origem):

- `bank-account:read`, `bank-account:write` (#138)
- `reconciliation:close|import|read|write` (#176)

Sem mudança em `permission.ts` (tipo regex-validado). O `PermissionCatalog.all` propaga automaticamente para o seed do admin de dev (zero drift).

GREEN: `permission-catalog.test.ts` + `list-permission-catalog` + `dev-seed` + `permissions-catalog.route` → 24/24.
