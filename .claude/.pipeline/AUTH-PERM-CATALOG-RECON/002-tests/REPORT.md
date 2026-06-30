# W0 — Testes RED · AUTH-PERM-CATALOG-RECON (#176 + gap #138)

**Agente**: tdd-strategist · **Data**: 2026-06-19 · branch `feat/auth-reconciliation-perms`.

Escopo: registrar no `permission-catalog` do `auth` as permissões que os endpoints financial exigem mas que não estavam no catálogo (admin seed deriva de `PermissionCatalog.all`):

- `reconciliation:import|read|write|close` (#176)
- `bank-account:read|write` (gap introduzido pelo #138/cedente — mesma causa, mesmo arquivo)

RED em `tests/modules/auth/domain/authorization/permission-catalog.test.ts`: 2 CAs focadas novas (#176, #138) + a CA5 estrita (`deepEqual` do conjunto) atualizada → **3 fail / 9 pass**. `Permission` é regex-validado (`resource:action`), não union → só o `CATALOG_RAW` precisa mudar.
