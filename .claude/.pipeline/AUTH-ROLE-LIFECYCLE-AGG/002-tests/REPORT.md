# W0 — Tests RED · AUTH-ROLE-LIFECYCLE-AGG

**Agente:** tdd-strategist · **Outcome:** RED ✅

## Suíte

`tests/modules/auth/domain/authorization/role-lifecycle.test.ts` — 10 testes (CA1–CA7).

| CA | Cobertura |
| --- | --- |
| CA1/CA2 | `create` nasce `active`; nome inválido → `role-name-invalid` |
| CA3 | `rehydrate` reconstrói com `status` + permissões do banco (não revalida catálogo) |
| CA4 | `rename` normaliza; inválido → erro |
| CA5 | `setPermissions` dedup; fora do catálogo → `role-permission-not-in-catalog` |
| CA6 | `archive(true)` → `role-in-use`; `archive(false)` → `archived`; idempotente |

## Prova de RED

```
tests 10 · pass 0 · fail 10 — operações inexistentes (rehydrate/rename/setPermissions/archive/status)
```
