# AUTH-DB-SCHEMA (P0) — schema MySQL/Drizzle das tabelas `auth_*` + migration

## Origem

Fase P, ticket 1 (pré-requisito de P1–P3). Materializa o modelo de dados do ADR-0024 (§"Modelo de dados")
sob ADR-0014 (isolamento por prefixo `auth_*`), ADR-0020 (MySQL único, sem JSON/ENUM/AUTO_INCREMENT) e
ADR-0018 (tipos canônicos: UUID `varchar(36)`, instantes `datetime(3)`). Espelha o padrão de
`src/modules/contracts/adapters/persistence/schemas/mysql.ts`.

## Processo de papéis (decidido com o usuário, 2026-05-27)

Pipeline W0→W3 com **W1 em duas mãos**:

- **W0** (`tdd-strategist`): teste de integração RED — aplica a migration contra MySQL e verifica via
  `INFORMATION_SCHEMA` as 6 tabelas + colunas + índices + FKs (falha por inexistência).
- **W1a — DBA** (`mysql-database-expert`): **blueprint DDL** — modela as 6 tabelas, tipos canônicos, **índices
  justificados por cada query** do contrato abaixo, FKs (`ON DELETE`), CHECKs, CHARSET/COLLATE. Read-only +
  citação (refman/ADR). Registrado em `001-schema-blueprint.md`. **Não escreve Drizzle** (design do agente).
- **W1b — Implementador** (`drizzle-orm-expert` + skill `drizzle-schema-author`): traduz o blueprint para
  `schemas/mysql.ts` (auth), `db:generate` → migration, edita o SQL p/ CHARSET/COLLATE manual (drizzle não
  expõe na API). Wire no `drizzle.config`.
- **W2 — validação cruzada**: o **DBA valida** a migration emitida vs. o blueprint + ADR-0020; o
  `code-reviewer` audita aderência/isolamento.
- **W3** (`ts-quality-checker`): gate + `test:integration` (estender a lista de arquivos p/ incluir auth).

## Tabelas (ADR-0024 §"Modelo de dados")

| Tabela | Colunas-chave (ADR-0024) |
| :-- | :-- |
| `auth_user` | `id` varchar(36), `email` (UNIQUE), `password_hash` (nullable → OIDC-ready), `status`, `disabled_at` (null), timestamps |
| `auth_role` | `id`, `name` (UNIQUE), `description` |
| `auth_permission` | `id`, `name` (UNIQUE, formato `resource:action`) |
| `auth_role_permission` | `role_id`, `permission_id` (junção N:N) |
| `auth_user_role` | `user_id`, `role_id` (junção N:N) |
| `auth_refresh_token` | `id`, `user_id`, `token_hash`, `issued_at`, `expires_at`, `revoked_at` (null), `replaced_by` (null) |

## Contrato de persistência (queries que o schema DEVE servir bem)

Levantado das 6 aplicações (`src/modules/auth/application/use-cases/`):

| Query | Origem | Índice esperado |
| :-- | :-- | :-- |
| `auth_user WHERE email = ?` | `findByEmail` (register, authenticate) | **UNIQUE** em `email` (rede real de unicidade → `email-already-registered`; o `findByEmail`+`save` não é atômico) |
| `auth_user WHERE id = ?` + roles | `findById` (assign-role, change-password, refresh) | PK; JOINs `auth_user_role`/`auth_role_permission` |
| `auth_refresh_token WHERE token_hash = ?` | `findByTokenHash` (refresh, revoke) | índice em `token_hash` |
| `auth_refresh_token WHERE user_id = ? AND revoked_at IS NULL` | `findRevocableByUserId` (refresh, revoke, change-password) | índice composto `(user_id, revoked_at)` (a avaliar pelo DBA) |
| `auth_role WHERE id = ?` + permissions | `RoleRepository.findById` | PK; JOIN `auth_role_permission` |

## Decisões de modelagem para o DBA resolver (com citação)

1. **`auth_user.status` sem `ENUM` nativo** (proibido ADR-0020): `varchar` + `CHECK (status IN ('active','disabled'))`?
   Invariante `status='disabled' ⟺ disabled_at IS NOT NULL` como CHECK? (espelha F-L1 do contracts).
2. **`Permission`: descompasso domínio↔schema.** O domínio modela `Permission` como **valor** (branded string
   `resource:action`, sem id); ADR-0024 especifica `auth_permission(id, name)` como **entidade**. Reconciliar:
   o mapper resolve `name`↔`id`? `auth_role_permission` referencia `permission_id` (FK) ou `permission_name`?
   Decidir honrando o ADR-0024 (entidade) sem poluir o domínio.
3. **FKs `ON DELETE`**: `auth_user_role`/`auth_role_permission`/`auth_refresh_token.user_id` — CASCADE vs RESTRICT
   (best-practice 06).
4. **`replaced_by`**: self-FK para `auth_refresh_token.id`? ou só varchar(36) sem FK (evita ciclo)?

## Fora de escopo

- Adapters Drizzle dos repos (P1–P3) e mappers. Wiring do driver mysql na CLI/composition root (P4). Read/write
  split físico (ADR-0026, I1) — o schema é o mesmo; o split é de pool, não de tabela.

## Notas

- Migration em `src/modules/auth/adapters/persistence/migrations/mysql/` (espelha contracts).
- CHARSET/COLLATE manual no SQL (drizzle 0.45 não expõe na API — ver header do schema do contracts):
  `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`; UUIDs `COLLATE utf8mb4_bin`.
