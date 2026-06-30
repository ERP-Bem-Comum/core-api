# W0 — Tests RED · AUTH-PERMISSION-CATALOG

**Agente:** tdd-strategist · **Outcome:** RED ✅

## Suíte

`tests/modules/auth/domain/authorization/permission-catalog.test.ts` — 10 testes (CA1–CA5).

| CA | Cobertura |
| --- | --- |
| CA1 | cada item do catálogo reparsa `ok` via `Permission.parse` (branded) |
| CA2 | não-vazio; sem duplicatas |
| CA3 | todas no formato `resource:action` (regex) |
| CA4 | `isInCatalog` true p/ presente, false p/ válida-fora-do-catálogo |
| CA5 | âncoras `role:*` (5), `user:*` (4), `contract:mass-approve`; **conjunto completo (18) — integridade contra entrada perdida** |

## Prova de RED

```
→ ERR_MODULE_NOT_FOUND: src/modules/auth/domain/authorization/permission-catalog.ts
✖ test failed
```

RED legítimo (API inexistente).
