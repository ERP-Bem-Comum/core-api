# W0 — Tests RED · AUTH-ROLE-SCHEMA-STATUS

**Agente:** tdd-strategist · **Outcome:** RED ✅

## Suíte

`tests/modules/auth/adapters/persistence/role-status-schema.test.ts` — 4 testes (meta-teste estático, sem Docker; espelha `schema-hardening.test.ts`).

| CA | Cobertura |
| --- | --- |
| CA1 | `authRole` declara `status: varchar('status',{length:16}).notNull()` |
| CA2 | CHECK `auth_role_status_chk` com `active`/`archived` no schema |
| CA3 | alguma migration `.sql` contém o CHECK + `'active','archived'` |

## Prova de RED

```
✖ CA1 (sem coluna status) · ✖ CA2 (sem CHECK) · ✖ CA3 (sem migration)
tests 4 · pass 0 · fail 4
```

RED por asserção (schema/migration ainda sem `status`).
