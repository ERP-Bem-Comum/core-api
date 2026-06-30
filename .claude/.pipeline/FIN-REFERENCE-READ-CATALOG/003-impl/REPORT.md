# W1 — Implementação GREEN · FIN-REFERENCE-READ-CATALOG (#200)

**Wave**: W1 · **Outcome**: **GREEN** · **Data**: 2026-06-22

## Mudança de produção (mínima — 1 entrada)

`src/modules/auth/domain/authorization/permission-catalog.ts` — adicionada `'reference:read'` ao `CATALOG_RAW`, em ordem alfabética por resource (entre o bloco `program:*` e `reconciliation:*`):

```ts
  'program:write',
  // reference:* (modulo financial - dados de referencia de categorizacao, #200)
  'reference:read',
  // reconciliation:* (modulo financial - conciliacao bancaria, #176)
```

Efeito em cadeia (sem código adicional):
- `PermissionCatalog.all` (derivado de `CATALOG_RAW`) passa a conter `reference:read`.
- `adminDevPermissions = PermissionCatalog.all` → admin recebe a permissão automaticamente (FR-002).
- `Role.setPermissions` passa a aceitar `reference:read` (⊆ catálogo) — concedível a roles em runtime (FR-003/FR-008).

Nenhuma alteração no módulo `financial` (já declarava/exigia a permissão). Sem migration, evento ou rota nova.

## Resultado dos testes

| Suite | tests | pass | fail |
|---|---|---|---|
| `permission-catalog.test.ts` | 13 | 13 | 0 |
| `reference-read-rbac.real-authorize.http.test.ts` | 3 | 3 | 0 |
| Sweep consumidores (`list-permission-catalog`, `permissions-catalog.route`, `me-permissions.routes`, `e2e-auth-seed`) | 17 | 17 | 0 |

As 3 falhas RED do W0 → GREEN:
1. `#200: contem reference:read` ✅
2. CA5 conjunto exato (integridade) ✅
3. US1/CA2: admin recebe **200** nos 3 endpoints (antes 403) ✅

Guards mantidos verdes: 401 sem token, 403 sem permissão. **Zero regressão** nos consumidores do catálogo.

## Próximo (W2)

Code review read-only: ADR-0006 (sem import cross-módulo), ausência de over-grant (FR-008), teste exercita authorize real (FR-006), idioma por camada.
