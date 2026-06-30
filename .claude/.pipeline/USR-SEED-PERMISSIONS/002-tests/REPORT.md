# W0 — Testes RED

**Ticket:** USR-SEED-PERMISSIONS · **Wave:** W0 · **Outcome:** RED

## Arquivo

`tests/modules/auth/adapters/http/dev-seed.test.ts`

## Cobertura (mapeada aos CAs)

| Teste | CA |
| --- | --- |
| inclui âncoras `program:*` + conjunto `user:*` | CA1 |
| conjunto === `PermissionCatalog.all` (sem drift) | CA2 |
| sem duplicatas no preset | CA2 |
| `buildAdminDevSeedUser` → parseável por `parseE2eAuthSeed` sob `CORE_API_E2E=1` | CA3 |

## Evidência do RED

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../auth/adapters/http/dev-seed.ts'
ℹ tests 1  ℹ pass 0  ℹ fail 1
```

RED **legítimo**: falha por inexistência da API (`adminDevPermissions` / `buildAdminDevSeedUser` em
`dev-seed.ts`), não por assertion. GREEN no W1 ao entregar o preset derivado do catálogo + o helper.

CA4 (quickstart) é documentação — validada no W1 por inspeção, fora do runner.
