# AUTH-DB-REPO-USER (P1) — UserRepository + UserReader Drizzle + mapper

## Origem

Fase P, ticket 2 (depende de P0 schema, closed-green). Decisão `DD-PERSIST-01`. Adiciona o adapter Drizzle dos
ports `UserRepository`/`UserReader` (que hoje só têm InMemory). Reusa o schema `auth_*` (P0). Mesmo fluxo de
papéis da P0 (W1 em duas mãos; DBA valida as queries/JOINs no W1a/W2).

## Escopo

### Domínio (mudança de port — DD-PERSIST-01)
- `domain/identity/user/repository.ts`: `UserRepositoryError` += `'email-already-registered'`.

### Adapters
- **Driver auth** (`adapters/persistence/drivers/mysql-driver.ts`): `openAuthMysql(conn)` → handle `{ db, schema }`
  (pool mysql2 + Drizzle sobre o schema auth). Espelha `contracts/.../drivers/mysql-driver.ts`.
- **Mapper** (`adapters/persistence/mappers/user.mapper.ts`): `userFromRows(userRow, roleRows, permRows)` →
  `Result<User, UserMapperError>` (dispatcher por `status` → ActiveUser|DisabledUser; monta `roles[]` via
  `Role.create`+`Permission.parse`); `userToInsert(user)`; tagged errors → `user-repo-unavailable` na borda.
- **Repo Drizzle** (`adapters/persistence/repos/user-repository.drizzle.ts`): `createDrizzleUserStore(handle)` →
  `{ repository, reader }`.
  - `save`: transação — upsert `auth_user` (SELECT-then-UPDATE-or-INSERT) + replace `auth_user_role` (DELETE do
    `user_id` + INSERT atuais). `ER_DUP_ENTRY` (1062) no índice email → `err('email-already-registered')`.
  - `findById`/`findByEmail`: SELECT `auth_user` + JOIN `auth_user_role`→`auth_role`→`auth_role_permission`→
    `auth_permission`; agrupar e reidratar `roles[]`.
- **InMemory** (`user-repository.in-memory.ts`): `save` passa a detectar e-mail duplicado (outro `id`) →
  `err('email-already-registered')`.

## Critérios de aceitação

### Contract-suite compartilhada (`user-repository.contract.ts` — InMemory **e** Drizzle)
- **CA1–CA5:** já existentes (save/findById/findByEmail/upsert status) — seguem verdes.
- **CA6 (novo):** salvar user B com e-mail já usado por user A (id diferente) → `err('email-already-registered')`.

### Drizzle-específico (`user-repository.drizzle.test.ts`, gated `MYSQL_INTEGRATION`)
- **CA7:** roda a contract-suite (CA1–CA6) contra o adapter Drizzle.
- **CA8 (reidratação de roles):** com `auth_role`/`auth_permission`/`auth_role_permission` populados via **fixture
  SQL**, salvar User associado a esse role → `findById` reidrata `roles[]` com o role e suas `permissions[]`.
- **CA9 (FK):** salvar User com `roleId` inexistente em `auth_role` → erro (violação FK `auth_urt_role_fk`).

## Fluxo de papéis (W1 em duas mãos)

- **W0** (`tdd-strategist`): estende a contract-suite com CA6 (RED no InMemory — não detecta dup); o teste Drizzle
  (CA7–CA9) é criado no W1b junto ao adapter (interface emerge) e roda no W3 (integração).
- **W1a — DBA** (`mysql-database-expert`): modela as queries (upsert SELECT-then-UPDATE-or-INSERT; JOINs de
  reidratação; estratégia replace de `auth_user_role`) + `EXPLAIN` dos JOINs; valida uso dos índices da P0.
- **W1b — Implementador** (`drizzle-orm-expert`): driver auth + mapper + repo Drizzle + extensão do port/InMemory.
- **W2 — validação cruzada**: DBA valida as queries/EXPLAIN; `code-reviewer` audita mapper/repo/isolamento.
- **W3** (`ts-quality-checker`): gate + `test:integration` (rodar o teste Drizzle contra MySQL real).

## Fora de escopo

- `RoleRepository` Drizzle (P2) e `RefreshTokenRepository` Drizzle (P3). Wiring na CLI/composition root (P4).
- O save do User **não** cria `auth_role`/`auth_permission` (P2/RoleRepository).

## Notas

- `Clock` não entra (timestamps `created_at`/`updated_at` vêm do domínio? O User não carrega timestamps — o mapper
  define `created_at`/`updated_at` no insert; **decisão para o W1a/W1b**: usar `now` do handle/Clock ou um default).
- ADR-0020: sem `ON DUPLICATE KEY` (usar SELECT-then-UPDATE-or-INSERT como o contracts). ADR-0014: só `auth_*`.
