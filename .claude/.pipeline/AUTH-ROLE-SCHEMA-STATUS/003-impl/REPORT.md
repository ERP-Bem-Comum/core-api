# W1 — Implementação mínima · AUTH-ROLE-SCHEMA-STATUS

**Agente:** drizzle-schema-author · **Outcome:** GREEN ✅

## Mudanças

1. **Schema** `src/modules/auth/adapters/persistence/schemas/mysql.ts` — `authRole`:
   - `status: varchar('status', { length: 16 }).notNull().default('active')`.
   - `check('auth_role_status_chk', sql\`${t.status} IN ('active','archived')\`)`.
   - Espelha o padrão `auth_user.status` (VARCHAR+CHECK, ADR-0020 — sem ENUM nativo).
2. **Migration** gerada por `pnpm run db:generate:auth` (config `drizzle.config.auth.ts`):
   - `0006_outstanding_xavin.sql`:
     ```sql
     ALTER TABLE `auth_role` ADD `status` varchar(16) DEFAULT 'active' NOT NULL;
     ALTER TABLE `auth_role` ADD CONSTRAINT `auth_role_status_chk` CHECK (`auth_role`.`status` IN ('active','archived'));
     ```
   - Incremental (ADD, não recria); `DEFAULT 'active'` cobre linhas existentes (CA4).

## Achado (anti-armadilha)

`pnpm run db:generate` (default) lê só o schema de **contracts** → "nothing to migrate". O auth tem config própria: **`pnpm run db:generate:auth`** (`drizzle.config.auth.ts`). Registrado para os próximos tickets de schema auth.

## Prova de GREEN

```
estático: tests 4 · pass 4 · fail 0
integração (MySQL Docker, test:integration:auth): 38 · pass 38 · fail 0  ← migration 0006 aplica de verdade
```
