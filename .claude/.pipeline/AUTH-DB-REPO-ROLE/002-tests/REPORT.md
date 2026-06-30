# W0 (RED) — AUTH-DB-REPO-ROLE

**Skill:** `tdd-strategist` · **Resultado:** RED (adapter Drizzle inexistente)

## Teste escrito

`tests/modules/auth/adapters/persistence/role-repository.drizzle.test.ts` (gated `MYSQL_INTEGRATION`) — espelha
`user-repository.drizzle.test.ts`:
- **CA5:** roda a contract-suite existente `role-repository.contract.ts` (CA1–CA4: save→findById, null, upsert
  permission, list) contra o adapter Drizzle.
- **CA6 (reconciliação):** dois roles com a **mesma** permission (`contract:delete`) → `auth_permission` criada
  **uma** vez (upsert idempotente por name); ambos reidratam.

A contract-suite compartilhada **já cobre** save com permissions (CA3 via `Role.grant`) — não estendida.

## Saída RED

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../repos/role-repository.drizzle.ts'
ℹ tests 1 · pass 0 · fail 1
```

## Handoff
- **W1a — DBA**: queries do `save` (upsert `auth_role` + upsert `auth_permission` por name + replace
  `auth_role_permission`) + reidratação (JOIN) + `list` (todos + agrupar) + EXPLAIN.
- **W1b — drizzle-orm-expert**: mapper `role.mapper.ts` + repo `role-repository.drizzle.ts` + teste CA5/CA6.
