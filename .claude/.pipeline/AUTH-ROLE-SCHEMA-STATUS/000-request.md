# AUTH-ROLE-SCHEMA-STATUS

> Spec: `specs/006-gestao-acessos` (Phase 2 Foundational) · Task: T010 (parte DDL) · Size: M

## Escopo

Adicionar ciclo de vida ao papel: coluna `status` em `auth_role` (`active`/`archived`), via schema Drizzle + migration gerada (`pnpm run db:generate`). Espelha o padrão `status` de `auth_user` (`varchar(16)` + CHECK `IN (...)`, ADR-0020 — sem ENUM nativo).

`archived` ⇒ papel não-atribuível (regra de domínio fica em `AUTH-ROLE-LIFECYCLE-AGG`, T008). Default `active` para linhas existentes.

**Fora de escopo (deferido):**
- Seed/upsert do catálogo (`permission-catalog.ts`) em `auth_permission` → **T048 (polish)**, que já prevê "seed das permissions de gestão". É DML, preocupação distinta da DDL deste ticket.
- Operações do agregado (`archive`, etc.) → `AUTH-ROLE-LIFECYCLE-AGG`.

## Critérios de aceitação

- **CA1**: `authRole` (schema `mysql.ts`) ganha `status: varchar('status', { length: 16 }).notNull()`.
- **CA2**: CHECK nomeado `auth_role_status_chk` com `status IN ('active','archived')`.
- **CA3**: Migration gerada por `pnpm run db:generate` (nova `000N_*.sql`, nunca SQL à mão) contendo o `ALTER TABLE auth_role` com a coluna + CHECK.
- **CA4**: Default coerente para linhas pré-existentes (`active`) — migration aplica sem quebrar dados.
- **CA5**: Meta-teste estático (espelha `schema-hardening.test.ts`) valida CA1–CA3 lendo `schema.ts` + a migration (sem Docker). Integração real (`INFORMATION_SCHEMA`) atrás de `*_INTEGRATION=1`.

## Referências de reuso (T001/T002)

- `auth_user` status: `varchar('status',{length:16})` + `check('auth_user_status_chk', sql\`... IN ('active','disabled')\`)`.
- `tests/modules/auth/adapters/persistence/schema-hardening.test.ts` — padrão de meta-teste estático.
- ADR-0020 (sem ENUM; VARCHAR+CHECK), regra `.claude/rules/` de adapters/persistence.

## Pipeline

- **W0**: teste RED estático validando `status` + CHECK no schema e na migration.
- **W1**: editar `authRole` no `mysql.ts` + `pnpm run db:generate` (migration 0006) até GREEN.
- **W2/W3**: review read-only + gate (`typecheck`+`format:check`+`lint`+`test`).
