// Schema MySQL — módulo auth, alinhado com ADR-0020 (MySQL como único dialeto).
// Tipos: varchar/char/datetime(3). Sem JSON, sem ENUM, sem AUTO_INCREMENT.
// IDs (UUID v4): varchar(36). token_hash: char(64). Instantes: datetime(3).
//
// Convenção de nomenclatura (ADR-0020 §"Convenção"):
//   - Tabelas: prefixo `auth_*` dentro do database `core` — ADR-0014 (isolamento por prefixo).
//   - CHECKs: `auth_<tabela_sem_prefixo>_<descrição>_chk`.
//   - Índices: `auth_<abreviação>_<coluna(s)>_idx`.
//   - FKs: `auth_<abreviação>_<col>_fk`.
//
// ⚠️ CHARSET/COLLATE — aplicado em SQL manual (limitação Drizzle 0.45.x)
// =============================================================================
// `drizzle-orm@0.45.x` NÃO expõe `charset`/`collate` na API table-level.
// Aplicamos em SQL puro na migration `0000_*.sql`:
//   - Por tabela:     `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
//   - Em UUIDs (id, user_id, role_id, permission_id, replaced_by):
//                     `COLLATE utf8mb4_bin` — comparação binária, elimina drift Unicode em FK matches.
//   - Em token_hash char(64): `COLLATE utf8mb4_bin` — hash SHA-256 hex é ASCII; bin evita
//                     colação case-insensitive acidental.
//   - email varchar(254): mantém `utf8mb4_unicode_ci` (case-insensitive, blueprint §"Riscos").
//   - auth_permission.name varchar(128): `utf8mb4_bin` (formato resource:action, sensível a caso).
//
// **RESPONSABILIDADE DO PRÓXIMO DEV**: ao rodar `pnpm db:generate:auth` para migration
// 0001+, editar o SQL gerado com ENGINE/charset/collate nas novas tabelas, e
// `COLLATE utf8mb4_bin` em novas colunas UUID.
//
// Ordem de criação (respeita FK deps — blueprint §"Ordem de criação"):
//   auth_permission → auth_role → auth_user →
//   auth_role_permission → auth_user_role → auth_refresh_token.

import {
  char,
  check,
  datetime,
  foreignKey,
  index,
  int,
  mysqlTable,
  primaryKey,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

// ─── auth_permission ──────────────────────────────────────────────────────────
// Entidade de permissão. Domínio modela Permission como branded string
// (resource:action); este schema armazena a entidade com id para FK.
// Mapper reconcilia name→id na escrita (upsert em auth_permission).
// Decisão 2 do blueprint: auth_role_permission referencia permission_id (FK), não name.
export const authPermission = mysqlTable(
  'auth_permission',
  {
    // UUID v4 gerado no domínio. COLLATE utf8mb4_bin aplicado manualmente no SQL.
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    // formato resource:action — case-sensitive (utf8mb4_bin no SQL manual).
    // Unicidade via uniqueIndex nomeado abaixo (mapper resolve name→id; idempotência do upsert).
    name: varchar('name', { length: 128 }).notNull(),
    // Instante de criação (UTC, milissegundo). Sem updated_at (permissões são imutáveis após criação).
    createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull(),
  },
  (t) => [
    // CHECK: formato resource:action via REGEXP_LIKE (blueprint §auth_permission).
    // Defesa em profundidade — domínio já valida via branded string.
    check(
      'auth_permission_name_format_chk',
      sql`REGEXP_LIKE(${t.name}, '^[a-z0-9]+(-[a-z0-9]+)*:[a-z0-9]+(-[a-z0-9]+)*$')`,
    ),
    // Unicidade nomeada (sem `.unique()` na coluna p/ evitar índice duplicado + drift de snapshot).
    uniqueIndex('auth_permission_name_idx').on(t.name),
  ],
);

// ─── auth_role ────────────────────────────────────────────────────────────────
// Papel do sistema (ex.: 'admin', 'operator'). Nome é chave alternada única.
export const authRole = mysqlTable(
  'auth_role',
  {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    // varchar(64) — suficiente para nomes de role (blueprint §auth_role).
    // utf8mb4_unicode_ci no SQL manual (herdado do charset da tabela).
    name: varchar('name', { length: 64 }).notNull(),
    // Descrição opcional (OIDC-ready: pode ser null em roles externas).
    description: varchar('description', { length: 255 }),
    createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull(),
    updatedAt: datetime('updated_at', { mode: 'date', fsp: 3 }).notNull(),
  },
  (t) => [
    // CHECK: nome não-vazio (CHAR_LENGTH para segurança multi-byte).
    check('auth_role_name_nonempty_chk', sql`CHAR_LENGTH(${t.name}) > 0`),
    // Unicidade nomeada (sem `.unique()` na coluna — convenção `_idx`, evita drift).
    uniqueIndex('auth_role_name_idx').on(t.name),
  ],
);

// ─── auth_user ────────────────────────────────────────────────────────────────
// Usuário do sistema. password_hash nullable → OIDC-ready (usuários federados).
// status: 'active' | 'disabled' (varchar+CHECK — ADR-0020 §"sem ENUM").
export const authUser = mysqlTable(
  'auth_user',
  {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    // Q1: findByEmail. Unicidade via uniqueIndex nomeado abaixo; utf8mb4_unicode_ci
    // (case-insensitive) conforme blueprint §"Riscos" (escolhido ci para unicidade de rede).
    email: varchar('email', { length: 254 }).notNull(),
    // nullable: usuários OIDC não têm senha local (blueprint §auth_user).
    passwordHash: varchar('password_hash', { length: 255 }),
    // 'active' | 'disabled' — VARCHAR+CHECK (ADR-0020, Decisão 1 do blueprint).
    status: varchar('status', { length: 16 }).notNull(),
    // null quando status='active'; NOT NULL quando status='disabled'.
    // Bicondicional enforçado via CHECK auth_user_disabled_consistency_chk.
    disabledAt: datetime('disabled_at', { mode: 'date', fsp: 3 }),
    createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull(),
    updatedAt: datetime('updated_at', { mode: 'date', fsp: 3 }).notNull(),
    // Proveniência de migração ETL (AUTH-ETL-USER-PROVISIONING): NULL = nativo;
    // não-NULL = id do usuário no sistema legado. UNIQUE (idempotência do bootstrap one-shot).
    legacyId: int('legacy_id'),
    // Perfil administrativo (spec 005, AUTH-USER-PROFILE-AGG). Todos NULLABLE: register-user/OIDC
    // criam sem perfil; create-user-by-admin preenche. CPF/telefone normalizados (so digitos).
    name: varchar('name', { length: 128 }),
    cpf: varchar('cpf', { length: 11 }),
    telephone: varchar('telephone', { length: 13 }),
    imageUrl: varchar('image_url', { length: 1024 }),
    collaboratorId: varchar('collaborator_id', { length: 64 }),
  },
  (t) => [
    // CHECK: status restrito ao enum do domínio (Decisão 1 do blueprint).
    check('auth_user_status_chk', sql`${t.status} IN ('active','disabled')`),

    // CHECK bicondicional: (status='disabled') = (disabled_at IS NOT NULL).
    // Espelha ctr_contracts_ended_at_consistency_chk (blueprint §"Decisão 1").
    // `=` entre booleans = bicondicional em MySQL.
    check(
      'auth_user_disabled_consistency_chk',
      sql`(${t.status} = 'disabled') = (${t.disabledAt} IS NOT NULL)`,
    ),

    // Índice no email já coberto pela UNIQUE constraint (cria índice implícito no InnoDB).
    // Declaramos explicitamente para auditoria e para o teste CA3.
    uniqueIndex('auth_user_email_idx').on(t.email),

    // Idempotência da ETL: UNIQUE em legacy_id (múltiplos NULL permitidos no InnoDB).
    uniqueIndex('auth_user_legacy_id_idx').on(t.legacyId),
  ],
);

// ─── auth_role_permission (N:N) ───────────────────────────────────────────────
// Junção role ↔ permission. PK composta (role_id, permission_id).
// InnoDB cria índice na 1ª coluna da PK automaticamente; precisamos de índice
// explícito na 2ª coluna (permission_id) para FK lookup eficiente (blueprint §auth_role_permission).
export const authRolePermission = mysqlTable(
  'auth_role_permission',
  {
    // COLLATE utf8mb4_bin nas duas colunas (UUID) — aplicado manualmente no SQL.
    roleId: varchar('role_id', { length: 36 }).notNull(),
    permissionId: varchar('permission_id', { length: 36 }).notNull(),
  },
  (t) => [
    // PK composta (blueprint §auth_role_permission).
    primaryKey({ columns: [t.roleId, t.permissionId] }),

    // FK auth_rp_role_fk → auth_role.id (RESTRICT/RESTRICT — Decisão 3 do blueprint).
    // Cita best-practice 06: CASCADE em prod = antipattern por amplificação de locks.
    foreignKey({
      name: 'auth_rp_role_fk',
      columns: [t.roleId],
      foreignColumns: [authRole.id],
    })
      .onDelete('restrict')
      .onUpdate('restrict'),

    // FK auth_rp_permission_fk → auth_permission.id (RESTRICT/RESTRICT).
    foreignKey({
      name: 'auth_rp_permission_fk',
      columns: [t.permissionId],
      foreignColumns: [authPermission.id],
    })
      .onDelete('restrict')
      .onUpdate('restrict'),

    // Índice na 2ª coluna da PK: FK index para lookup por permission_id.
    // InnoDB não cobre automaticamente a 2ª coluna da PK composta.
    index('auth_rp_permission_idx').on(t.permissionId),
  ],
);

// ─── auth_user_role (N:N) ─────────────────────────────────────────────────────
// Junção user ↔ role. assigned_at para rastreabilidade (quem atribuiu = evento, não coluna).
export const authUserRole = mysqlTable(
  'auth_user_role',
  {
    userId: varchar('user_id', { length: 36 }).notNull(),
    roleId: varchar('role_id', { length: 36 }).notNull(),
    // Rastreabilidade de atribuição (blueprint §"Nota 9"). assigned_by vai no evento,
    // não nesta junção (evita coluna de auditoria desnaturada em tabela pivô).
    assignedAt: datetime('assigned_at', { mode: 'date', fsp: 3 }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.roleId] }),

    // FK auth_urt_user_fk → auth_user.id (RESTRICT — Decisão 3 do blueprint).
    foreignKey({
      name: 'auth_urt_user_fk',
      columns: [t.userId],
      foreignColumns: [authUser.id],
    })
      .onDelete('restrict')
      .onUpdate('restrict'),

    // FK auth_urt_role_fk → auth_role.id (RESTRICT).
    foreignKey({
      name: 'auth_urt_role_fk',
      columns: [t.roleId],
      foreignColumns: [authRole.id],
    })
      .onDelete('restrict')
      .onUpdate('restrict'),

    // Índice na 2ª coluna da PK: FK index para lookup por role_id.
    index('auth_urt_role_idx').on(t.roleId),
  ],
);

// ─── auth_refresh_token ───────────────────────────────────────────────────────
// Token de refresh opaco (SHA-256 hex do valor aleatório). Ciclo de vida:
//   emitido → (ativo) → revogado → (replaced_by = id do token sucessor).
export const authRefreshToken = mysqlTable(
  'auth_refresh_token',
  {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    // user_id: soft FK (FK física abaixo: auth_rt_user_fk).
    // COLLATE utf8mb4_bin no SQL manual.
    userId: varchar('user_id', { length: 36 }).notNull(),

    // SHA-256 hex (64 chars fixos). CHAR(64) por clareza semântica (blueprint §"Riscos").
    // UNIQUE (Q4: findByTokenHash). COLLATE utf8mb4_bin (hash ASCII — sem risco de
    // colação case-insensitive, embora hex seja case-neutral na prática).
    tokenHash: char('token_hash', { length: 64 }).notNull(),

    issuedAt: datetime('issued_at', { mode: 'date', fsp: 3 }).notNull(),
    expiresAt: datetime('expires_at', { mode: 'date', fsp: 3 }).notNull(),
    // null = token ativo. NOT NULL = token revogado.
    revokedAt: datetime('revoked_at', { mode: 'date', fsp: 3 }),

    // Referência de auditoria one-way para o token sucessor (rotação).
    // VARCHAR(36) SEM .references() (Decisão 4 do blueprint): evita self-FK que
    // exigiria ordem de insert específica em rotação atômica e cria ciclo no purge.
    // O mapper valida com RefreshTokenId.parse → Result<T, MapperError>.
    replacedBy: varchar('replaced_by', { length: 36 }),
  },
  (t) => [
    // CHECK: expires_at > issued_at (blueprint §auth_refresh_token).
    check('auth_rt_expiry_chk', sql`${t.expiresAt} > ${t.issuedAt}`),

    // CHECK: token_hash não-vazio (defesa em profundidade).
    check('auth_rt_hash_nonempty_chk', sql`CHAR_LENGTH(${t.tokenHash}) > 0`),

    // FK auth_rt_user_fk → auth_user.id (RESTRICT — Decisão 3 do blueprint).
    foreignKey({
      name: 'auth_rt_user_fk',
      columns: [t.userId],
      foreignColumns: [authUser.id],
    })
      .onDelete('restrict')
      .onUpdate('restrict'),

    // Índice UNIQUE em token_hash: Q4 findByTokenHash (CA4 do teste).
    // Única fonte de unicidade (sem `.unique()` na coluna — evita índice duplicado + drift de snapshot).
    uniqueIndex('auth_rt_token_hash_idx').on(t.tokenHash),

    // Índice composto (user_id, revoked_at): Q5 findRevocableByUserId.
    // WHERE user_id=? AND revoked_at IS NULL — refman §optimization: IS NULL usa índice.
    // Ordem: user_id (mais seletivo em subconjunto do user) → revoked_at (IS NULL filter).
    index('auth_rt_user_revoked_idx').on(t.userId, t.revokedAt),
  ],
);

// ─── auth_password_reset ──────────────────────────────────────────────────────
// Token de reset de senha (BE-REC-003). Opaco (SHA-256 hex do valor aleatório), one-time + TTL:
//   emitido → (pending) → consumido (used_at NOT NULL) ou expirado (now >= expires_at).
export const authPasswordReset = mysqlTable(
  'auth_password_reset',
  {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    // user_id: soft FK (FK física abaixo: auth_pr_user_fk). COLLATE utf8mb4_bin no SQL manual.
    userId: varchar('user_id', { length: 36 }).notNull(),
    // SHA-256 hex (64 chars). UNIQUE (findByTokenHash). COLLATE utf8mb4_bin (hash ASCII).
    tokenHash: char('token_hash', { length: 64 }).notNull(),
    requestedAt: datetime('requested_at', { mode: 'date', fsp: 3 }).notNull(),
    expiresAt: datetime('expires_at', { mode: 'date', fsp: 3 }).notNull(),
    // null = pending; NOT NULL = consumido (one-time).
    usedAt: datetime('used_at', { mode: 'date', fsp: 3 }),
  },
  (t) => [
    // CHECK: expires_at > requested_at.
    check('auth_pr_expiry_chk', sql`${t.expiresAt} > ${t.requestedAt}`),
    // CHECK: token_hash não-vazio (defesa em profundidade).
    check('auth_pr_hash_nonempty_chk', sql`CHAR_LENGTH(${t.tokenHash}) > 0`),
    // FK auth_pr_user_fk → auth_user.id (RESTRICT, espelha auth_rt_user_fk).
    foreignKey({
      name: 'auth_pr_user_fk',
      columns: [t.userId],
      foreignColumns: [authUser.id],
    })
      .onDelete('restrict')
      .onUpdate('restrict'),
    // UNIQUE em token_hash: findByTokenHash (type=const).
    uniqueIndex('auth_pr_token_hash_idx').on(t.tokenHash),
    // Composto (user_id, used_at): findUnusedByUserId (WHERE user_id=? AND used_at IS NULL).
    index('auth_pr_user_used_idx').on(t.userId, t.usedAt),
  ],
);

// ─── auth_login_lockout ───────────────────────────────────────────────────────
// Cooldown de login por conta (BE-REC-001). Uma linha por usuário (PK = user_id):
//   failed_attempts (contador) + locked_until (NULL = sem cooldown ativo).
export const authLoginLockout = mysqlTable(
  'auth_login_lockout',
  {
    // PK = user_id: 1 lockout por conta. FK física abaixo (auth_ll_user_fk).
    userId: varchar('user_id', { length: 36 }).primaryKey().notNull(),
    failedAttempts: int('failed_attempts').notNull(),
    // null = sem bloqueio ativo; Date = bloqueado até este instante.
    lockedUntil: datetime('locked_until', { mode: 'date', fsp: 3 }),
  },
  (t) => [
    // CHECK: contador não-negativo.
    check('auth_ll_attempts_chk', sql`${t.failedAttempts} >= 0`),
    // FK auth_ll_user_fk → auth_user.id (RESTRICT, espelha as demais).
    foreignKey({
      name: 'auth_ll_user_fk',
      columns: [t.userId],
      foreignColumns: [authUser.id],
    })
      .onDelete('restrict')
      .onUpdate('restrict'),
  ],
);

// ─── Tipos do schema — consumidos pelos mappers ───────────────────────────────
export type PermissionRow = typeof authPermission.$inferSelect;
export type NewPermissionRow = typeof authPermission.$inferInsert;

export type RoleRow = typeof authRole.$inferSelect;
export type NewRoleRow = typeof authRole.$inferInsert;

export type UserRow = typeof authUser.$inferSelect;
export type NewUserRow = typeof authUser.$inferInsert;

export type RolePermissionRow = typeof authRolePermission.$inferSelect;
export type NewRolePermissionRow = typeof authRolePermission.$inferInsert;

export type UserRoleRow = typeof authUserRole.$inferSelect;
export type NewUserRoleRow = typeof authUserRole.$inferInsert;

export type RefreshTokenRow = typeof authRefreshToken.$inferSelect;
export type NewRefreshTokenRow = typeof authRefreshToken.$inferInsert;

export type PasswordResetRow = typeof authPasswordReset.$inferSelect;
export type NewPasswordResetRow = typeof authPasswordReset.$inferInsert;

export type LoginLockoutRow = typeof authLoginLockout.$inferSelect;
export type NewLoginLockoutRow = typeof authLoginLockout.$inferInsert;
