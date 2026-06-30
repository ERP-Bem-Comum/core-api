// Schema MySQL — módulo partners, alinhado com ADR-0020 (MySQL como único dialeto).
// Tipos: varchar/boolean/datetime(3). Sem JSON, sem ENUM, sem AUTO_INCREMENT.
// IDs (UUID v4): varchar(36). Instantes: datetime(3).
//
// Convenção (ADR-0020 §"Convenção" + ADR-0014 §"isolamento por prefixo"):
//   - Tabelas: prefixo `par_*` dentro do database `core`.
//   - CHECKs: `par_<tabela_sem_prefixo>_<descrição>_chk`.
//   - Índices/únicos: `par_<abreviação>_<coluna(s)>_idx`.
//
// ⚠️ CHARSET/COLLATE — aplicado em SQL manual (limitação Drizzle 0.45.x):
//   - Por tabela:  `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
//   - `id` varchar(36): `COLLATE utf8mb4_bin` (UUID — comparação binária).
//   - `cnpj` varchar(14): `COLLATE utf8mb4_bin` (apenas dígitos; UNIQUE determinístico).
//
// **RESPONSABILIDADE DO PRÓXIMO DEV**: ao rodar `pnpm db:generate:partners`, editar o
// SQL gerado com ENGINE/charset e `COLLATE utf8mb4_bin` em novas colunas UUID/CNPJ.

import {
  boolean,
  check,
  date,
  datetime,
  index,
  int,
  mysqlTable,
  smallint,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

// ─── par_financiers ─────────────────────────────────────────────────────────
// Financiador (legado `financiers`, database-er.md:175-184). `cnpj` UNIQUE.
// Soft-delete via `active` + `deactivated_at` (estado Inactive do agregado).
export const parFinanciers = mysqlTable(
  'par_financiers',
  {
    // UUID v4 gerado no domínio. COLLATE utf8mb4_bin no SQL manual.
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    corporateName: varchar('corporate_name', { length: 255 }).notNull(),
    legalRepresentative: varchar('legal_representative', { length: 255 }).notNull(),
    // 14 dígitos (sem máscara). UNIQUE + COLLATE utf8mb4_bin no SQL manual.
    cnpj: varchar('cnpj', { length: 14 }).notNull(),
    telephone: varchar('telephone', { length: 30 }).notNull(),
    address: varchar('address', { length: 500 }).notNull(),
    // Payment target (US1 feature 015) — banco/PIX OPCIONAIS (sem invariante "ao menos um").
    bankAccountBank: varchar('bank_account_bank', { length: 50 }),
    bankAccountAgency: varchar('bank_account_agency', { length: 20 }),
    bankAccountNumber: varchar('bank_account_number', { length: 30 }),
    bankAccountCheckDigit: varchar('bank_account_check_digit', { length: 5 }),
    pixKeyType: varchar('pix_key_type', { length: 20 }),
    pixKey: varchar('pix_key', { length: 255 }),
    active: boolean('active').notNull().default(true),
    // Preenchido sse inativo (estado Inactive carrega deactivatedAt).
    deactivatedAt: datetime('deactivated_at', { mode: 'date', fsp: 3 }),
    createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull(),
    updatedAt: datetime('updated_at', { mode: 'date', fsp: 3 }).notNull(),
    // Correlação ETL (P2): id de origem no legado (int AUTO_INCREMENT). NULL = registro
    // nativo do core-api; não-NULL = registro migrado. UNIQUE garante idempotência.
    legacyId: int('legacy_id'),
  },
  (t) => [
    // CHECK: active=false ⟺ deactivated_at preenchido (coerência do soft-delete).
    check(
      'par_financiers_active_consistency_chk',
      sql`(${t.active} = FALSE) = (${t.deactivatedAt} IS NOT NULL)`,
    ),
    // Coerência do bloco bank (4 colunas preenchidas juntas) — sem exigir presença (opcional).
    check(
      'par_financiers_bank_block_chk',
      sql`(${t.bankAccountBank} IS NULL) = (${t.bankAccountAgency} IS NULL)
        AND (${t.bankAccountBank} IS NULL) = (${t.bankAccountNumber} IS NULL)
        AND (${t.bankAccountBank} IS NULL) = (${t.bankAccountCheckDigit} IS NULL)`,
    ),
    // Coerência do bloco pix (pix_key_type ⟺ pix_key).
    check('par_financiers_pix_block_chk', sql`(${t.pixKeyType} IS NULL) = (${t.pixKey} IS NULL)`),
    // UNIQUE(cnpj) — legado `financiers.cnpj` UNIQUE.
    uniqueIndex('par_financiers_cnpj_idx').on(t.cnpj),
    // UNIQUE(legacy_id) — idempotência da ETL (múltiplos NULL convivem no InnoDB).
    uniqueIndex('par_financiers_legacy_id_idx').on(t.legacyId),
  ],
);

export type FinancierRow = typeof parFinanciers.$inferSelect;
export type NewFinancierRow = typeof parFinanciers.$inferInsert;

// ─── par_suppliers ──────────────────────────────────────────────────────────
// Fornecedor (legado `suppliers`, database.dbml:153-176). `cnpj` UNIQUE. Soft-delete
// via `active` + `deactivated_at`. Destino de pagamento embedded (`bancaryInfo`/`pixInfo`
// do legado) ACHATADO em colunas nullable — invariante "ao menos um destino" via CHECK.
export const parSuppliers = mysqlTable(
  'par_suppliers',
  {
    // UUID v4 gerado no domínio. COLLATE utf8mb4_bin no SQL manual.
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    // 14 dígitos (sem máscara). UNIQUE + COLLATE utf8mb4_bin no SQL manual.
    cnpj: varchar('cnpj', { length: 14 }).notNull(),
    corporateName: varchar('corporate_name', { length: 255 }).notNull(),
    fantasyName: varchar('fantasy_name', { length: 255 }).notNull(),
    // Literal legado (ex.: INFORMATICA). varchar, NÃO ENUM (ADR-0020).
    serviceCategory: varchar('service_category', { length: 50 }).notNull(),
    active: boolean('active').notNull().default(true),
    deactivatedAt: datetime('deactivated_at', { mode: 'date', fsp: 3 }),
    // Destino de pagamento — bloco bancário (juntos NULL ou juntos preenchidos).
    bankAccountBank: varchar('bank_account_bank', { length: 50 }),
    bankAccountAgency: varchar('bank_account_agency', { length: 20 }),
    bankAccountNumber: varchar('bank_account_number', { length: 30 }),
    bankAccountCheckDigit: varchar('bank_account_check_digit', { length: 5 }),
    // Destino de pagamento — bloco pix (juntos NULL ou juntos preenchidos).
    pixKeyType: varchar('pix_key_type', { length: 20 }),
    pixKey: varchar('pix_key', { length: 255 }),
    // Avaliação do prestador (opcional). Standard Type literal, varchar + CHECK (NÃO ENUM — ADR-0020).
    serviceRating: varchar('service_rating', { length: 16 }),
    ratingComment: varchar('rating_comment', { length: 1000 }),
    createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull(),
    updatedAt: datetime('updated_at', { mode: 'date', fsp: 3 }).notNull(),
    // Correlação ETL (P2): id de origem no legado. NULL = nativo; não-NULL = migrado.
    legacyId: int('legacy_id'),
  },
  (t) => [
    // (a) soft-delete: active=false ⟺ deactivated_at preenchido.
    check(
      'par_suppliers_active_consistency_chk',
      sql`(${t.active} = FALSE) = (${t.deactivatedAt} IS NOT NULL)`,
    ),
    // (b) ao menos um destino de pagamento.
    check(
      'par_suppliers_payment_target_chk',
      sql`(${t.bankAccountBank} IS NOT NULL) OR (${t.pixKey} IS NOT NULL)`,
    ),
    // (c) coerência do bloco bancário (4 colunas juntas NULL ou juntas preenchidas).
    check(
      'par_suppliers_bank_block_chk',
      sql`(${t.bankAccountBank} IS NULL) = (${t.bankAccountAgency} IS NULL)
        AND (${t.bankAccountBank} IS NULL) = (${t.bankAccountNumber} IS NULL)
        AND (${t.bankAccountBank} IS NULL) = (${t.bankAccountCheckDigit} IS NULL)`,
    ),
    // (c) coerência do bloco pix (pix_key_type ⟺ pix_key).
    check('par_suppliers_pix_block_chk', sql`(${t.pixKeyType} IS NULL) = (${t.pixKey} IS NULL)`),
    // (d) avaliação: conjunto fechado (NULL = não avaliado).
    check(
      'par_suppliers_service_rating_chk',
      sql`${t.serviceRating} IS NULL OR ${t.serviceRating} IN ('RUIM','REGULAR','BOM','OTIMO')`,
    ),
    uniqueIndex('par_suppliers_cnpj_idx').on(t.cnpj),
    // UNIQUE(legacy_id) — idempotência da ETL (múltiplos NULL convivem no InnoDB).
    uniqueIndex('par_suppliers_legacy_id_idx').on(t.legacyId),
  ],
);

export type SupplierRow = typeof parSuppliers.$inferSelect;
export type NewSupplierRow = typeof parSuppliers.$inferInsert;

// ─── par_collaborators ──────────────────────────────────────────────────────
// Colaborador (legado `collaborators`, database.dbml:84). `cpf` UNIQUE **e** `email`
// UNIQUE. Duas dimensões de estado ORTOGONAIS: registro (`registration_status`
// PreRegistration/Complete — varchar livre, sem CHECK de enum, igual service_category)
// e soft-delete (`active`/`deactivated_at`/`disable_by`). Inactive carrega disableBy +
// deactivatedAt. Enums (occupation_area/employment_relationship/gender_identity/race/
// education/food_category/disable_by) são varchar com literal legado (ADR-0020 — sem ENUM).
export const parCollaborators = mysqlTable(
  'par_collaborators',
  {
    // UUID v4 gerado no domínio. COLLATE utf8mb4_bin no SQL manual.
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    // 11 dígitos (sem máscara). UNIQUE + COLLATE utf8mb4_bin no SQL manual.
    cpf: varchar('cpf', { length: 11 }).notNull(),
    occupationArea: varchar('occupation_area', { length: 10 }).notNull(),
    role: varchar('role', { length: 255 }).notNull(),
    startOfContract: datetime('start_of_contract', { mode: 'date', fsp: 3 }).notNull(),
    employmentRelationship: varchar('employment_relationship', { length: 5 }).notNull(),
    registrationStatus: varchar('registration_status', { length: 20 }).notNull(),
    // Campos pessoais (preenchidos em completeRegistration; todos nullable — D3).
    rg: varchar('rg', { length: 20 }),
    dateOfBirth: datetime('date_of_birth', { mode: 'date', fsp: 3 }),
    genderIdentity: varchar('gender_identity', { length: 30 }),
    race: varchar('race', { length: 30 }),
    education: varchar('education', { length: 30 }),
    // varchar(30) alinhado com gender_identity/race/education (#274 — 'PREFIRO_NAO_RESPONDER' = 21 chars)
    foodCategory: varchar('food_category', { length: 30 }),
    foodCategoryDescription: varchar('food_category_description', { length: 255 }),
    completeAddress: varchar('complete_address', { length: 500 }),
    telephone: varchar('telephone', { length: 30 }),
    emergencyContactName: varchar('emergency_contact_name', { length: 255 }),
    emergencyContactTelephone: varchar('emergency_contact_telephone', { length: 30 }),
    allergies: varchar('allergies', { length: 500 }),
    biography: varchar('biography', { length: 2000 }),
    experienceInThePublicSector: boolean('experience_in_the_public_sector'),
    // Perfil completo (US2 feature 015) — todos nullable. childrenAges = CSV (sem JSON — ADR-0020).
    sex: varchar('sex', { length: 1 }),
    maritalStatus: varchar('marital_status', { length: 20 }),
    hasChildren: boolean('has_children'),
    childrenCount: int('children_count'),
    childrenAges: varchar('children_ages', { length: 100 }),
    isPwd: boolean('is_pwd'),
    pwdDescription: varchar('pwd_description', { length: 255 }),
    isOnLeave: boolean('is_on_leave'),
    leaveDuration: varchar('leave_duration', { length: 50 }),
    leaveRenewable: boolean('leave_renewable'),
    leaveRenewalDuration: varchar('leave_renewal_duration', { length: 50 }),
    publicSectorExperienceDuration: varchar('public_sector_experience_duration', { length: 50 }),
    // Território de atuação (US3 feature 015) — uf (sigla IBGE) + município (texto livre), nullable.
    territoryUf: varchar('territory_uf', { length: 2 }),
    territoryMunicipality: varchar('territory_municipality', { length: 255 }),
    // Payment target (US1 feature 015) — banco/PIX OPCIONAIS (sem invariante "ao menos um").
    bankAccountBank: varchar('bank_account_bank', { length: 50 }),
    bankAccountAgency: varchar('bank_account_agency', { length: 20 }),
    bankAccountNumber: varchar('bank_account_number', { length: 30 }),
    bankAccountCheckDigit: varchar('bank_account_check_digit', { length: 5 }),
    pixKeyType: varchar('pix_key_type', { length: 20 }),
    pixKey: varchar('pix_key', { length: 255 }),
    // Soft-delete: Inactive carrega disable_by + deactivated_at.
    active: boolean('active').notNull().default(true),
    disableBy: varchar('disable_by', { length: 40 }),
    deactivatedAt: datetime('deactivated_at', { mode: 'date', fsp: 3 }),
    createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull(),
    updatedAt: datetime('updated_at', { mode: 'date', fsp: 3 }).notNull(),
    // Correlação ETL (P2): id de origem no legado. NULL = nativo; não-NULL = migrado.
    legacyId: int('legacy_id'),
  },
  (t) => [
    // soft-delete: active=false ⟺ deactivated_at preenchido ⟺ disable_by preenchido
    // (estado Inactive do agregado exige ambos).
    check(
      'par_collaborators_soft_delete_chk',
      sql`((${t.active} = FALSE) = (${t.deactivatedAt} IS NOT NULL))
        AND ((${t.active} = FALSE) = (${t.disableBy} IS NOT NULL))`,
    ),
    // Coerência do bloco bank (4 colunas preenchidas juntas) — sem exigir presença (opcional).
    check(
      'par_collaborators_bank_block_chk',
      sql`(${t.bankAccountBank} IS NULL) = (${t.bankAccountAgency} IS NULL)
        AND (${t.bankAccountBank} IS NULL) = (${t.bankAccountNumber} IS NULL)
        AND (${t.bankAccountBank} IS NULL) = (${t.bankAccountCheckDigit} IS NULL)`,
    ),
    // Coerência do bloco pix (pix_key_type ⟺ pix_key).
    check(
      'par_collaborators_pix_block_chk',
      sql`(${t.pixKeyType} IS NULL) = (${t.pixKey} IS NULL)`,
    ),
    // UNIQUE(cpf) e UNIQUE(email) — legado `collaborators`.
    uniqueIndex('par_collaborators_cpf_idx').on(t.cpf),
    uniqueIndex('par_collaborators_email_idx').on(t.email),
    // UNIQUE(legacy_id) — idempotência da ETL (múltiplos NULL convivem no InnoDB).
    uniqueIndex('par_collaborators_legacy_id_idx').on(t.legacyId),
  ],
);

export type CollaboratorRow = typeof parCollaborators.$inferSelect;
export type NewCollaboratorRow = typeof parCollaborators.$inferInsert;

// ─── par_collaborator_history ─────────────────────────────────────────────────
// Audit trail (US4 feature 015) — LOG DE ATUALIZAÇÕES por campo (Ramakrishnan & Gehrke
// §rastreamento de auditoria). Uma linha por campo alterado. `field_label` PT desnormalizado
// (imutabilidade histórica). Sem FK formal: o módulo usa soft-delete (colaborador nunca é
// hard-deleted), e ADR-0014 evita FK cross-agregado. Idempotência via UNIQUE.
export const parCollaboratorHistory = mysqlTable(
  'par_collaborator_history',
  {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    collaboratorId: varchar('collaborator_id', { length: 36 }).notNull(),
    eventType: varchar('event_type', { length: 64 }).notNull(),
    fieldName: varchar('field_name', { length: 100 }).notNull(),
    fieldLabel: varchar('field_label', { length: 100 }).notNull(),
    valueBefore: varchar('value_before', { length: 1000 }),
    valueAfter: varchar('value_after', { length: 1000 }),
    occurredAt: datetime('occurred_at', { mode: 'date', fsp: 3 }).notNull(),
  },
  (t) => [
    // Export por colaborador ordenado por data (WHERE collaborator_id = ? ORDER BY occurred_at).
    index('par_collaborator_history_collab_date_idx').on(t.collaboratorId, t.occurredAt),
    // Idempotência: mesmo evento (occurred_at) + campo não duplica.
    uniqueIndex('par_collaborator_history_idem_idx').on(
      t.collaboratorId,
      t.occurredAt,
      t.fieldName,
    ),
  ],
);

export type CollaboratorHistoryRow = typeof parCollaboratorHistory.$inferSelect;
export type NewCollaboratorHistoryRow = typeof parCollaboratorHistory.$inferInsert;

// ─── par_invite_tokens ──────────────────────────────────────────────────────
// Convite de autocadastro do colaborador (US5). Espelha o molde auth password-reset:
// token opaco minteado no adapter (CSPRNG), persiste só o HASH (sha256 hex). Uso-único
// (`used_at`) + TTL (`expires_at`). `collaborator_id` referencia o colaborador por ID +
// índice (sem FK rígida — ADR-0014, padrão `par_collaborator_history`/`par_user_profiles`).
export const parInviteTokens = mysqlTable(
  'par_invite_tokens',
  {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    collaboratorId: varchar('collaborator_id', { length: 36 }).notNull(),
    // sha256 hex (64 chars). UNIQUE: lookup do fluxo público (`findByTokenHash`); `COLLATE
    // utf8mb4_bin` no SQL manual (comparação binária determinística — como `id`/`cnpj`).
    tokenHash: varchar('token_hash', { length: 64 }).notNull(),
    issuedAt: datetime('issued_at', { mode: 'date', fsp: 3 }).notNull(),
    expiresAt: datetime('expires_at', { mode: 'date', fsp: 3 }).notNull(),
    // null = pending; preenchido = consumido (uso-único). `markUsed`: UPDATE ... WHERE used_at IS NULL.
    usedAt: datetime('used_at', { mode: 'date', fsp: 3 }),
  },
  (t) => [
    // Lookup + unicidade do hash (`findByTokenHash`; nunca dois convites com o mesmo hash).
    uniqueIndex('par_invite_tokens_token_hash_idx').on(t.tokenHash),
    // Convites de um colaborador (referência por ID, sem FK física — ADR-0014).
    index('par_invite_tokens_collaborator_idx').on(t.collaboratorId),
  ],
);

export type InviteTokenRow = typeof parInviteTokens.$inferSelect;
export type NewInviteTokenRow = typeof parInviteTokens.$inferInsert;

// ─── par_contract_count_view ────────────────────────────────────────────────
// Read-model de contagem de contratos por contraparte (US6b — ADR-0046/0022). DERIVADO e
// reconstruível: projeção sobre o `ctr_outbox` (via `contracts/public-api`), idempotente por
// eventId. Chaveado por `contractor_ref` (UUID do contratado). `count` aplicado por delta (±1).
export const parContractCountView = mysqlTable('par_contract_count_view', {
  contractorRef: varchar('contractor_ref', { length: 36 }).primaryKey().notNull(),
  // ADR-0046 §4: `active_count` (contratos vigentes — delta −1 em Ended/Cancelled).
  activeCount: int('active_count').notNull().default(0),
});

export type ContractCountRow = typeof parContractCountView.$inferSelect;
export type NewContractCountRow = typeof parContractCountView.$inferInsert;

// ─── par_contract_count_processed ───────────────────────────────────────────
// Dedup de eventId da projeção de contagem (idempotência por message ID — Vernon, IDDD, p.412).
// `event_id` PK: o INSERT no processed gateia a aplicação do delta (at-least-once → exactly-once).
export const parContractCountProcessed = mysqlTable('par_contract_count_processed', {
  eventId: varchar('event_id', { length: 36 }).primaryKey().notNull(),
  processedAt: datetime('processed_at', { mode: 'date', fsp: 3 }).notNull(),
});

export type ContractCountProcessedRow = typeof parContractCountProcessed.$inferSelect;

// ─── par_user_profiles ──────────────────────────────────────────────────────
// Perfil de usuário (legado `users` — porção de perfil; autenticação fica no auth).
// Identidade = `user_ref` (PK natural, 1:1 com auth.User). Sem soft-delete (ciclo de
// vida é do auth.User). `cpf` UNIQUE. `collaborator_ref` referencia o colaborador por
// ID (sem FK cross-agregado — ADR-0014).
export const parUserProfiles = mysqlTable(
  'par_user_profiles',
  {
    // UUID v4 do auth.User. COLLATE utf8mb4_bin no SQL manual.
    userRef: varchar('user_ref', { length: 36 }).primaryKey().notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    // 11 dígitos. UNIQUE + COLLATE utf8mb4_bin no SQL manual.
    cpf: varchar('cpf', { length: 11 }).notNull(),
    telephone: varchar('telephone', { length: 30 }).notNull(),
    avatarUrl: varchar('avatar_url', { length: 500 }),
    // UUID do colaborador (referência por ID, sem FK). COLLATE utf8mb4_bin no SQL manual.
    collaboratorRef: varchar('collaborator_ref', { length: 36 }),
    createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull(),
    updatedAt: datetime('updated_at', { mode: 'date', fsp: 3 }).notNull(),
    // Correlação ETL (P2): id de origem no legado (`users.id`). NULL = nativo; não-NULL = migrado.
    legacyId: int('legacy_id'),
  },
  (t) => [
    uniqueIndex('par_user_profiles_cpf_idx').on(t.cpf),
    // UNIQUE(legacy_id) — idempotência da ETL (múltiplos NULL convivem no InnoDB).
    uniqueIndex('par_user_profiles_legacy_id_idx').on(t.legacyId),
  ],
);

export type UserProfileRow = typeof parUserProfiles.$inferSelect;
export type NewUserProfileRow = typeof parUserProfiles.$inferInsert;

// ─── par_states ─────────────────────────────────────────────────────────────
// Parceria territorial por UF (US-002 — ADR-0001 da feature). PK natural: `uf` varchar(2).
// Sem FK para catálogo (seed estático — ADR-0031 §3). Soft-delete idêntico ao padrão do módulo.
export const parStates = mysqlTable(
  'par_states',
  {
    // Sigla da UF (2 chars, ex.: 'SP'). PK natural — não é UUID.
    uf: varchar('uf', { length: 2 }).primaryKey().notNull(),
    active: boolean('active').notNull().default(true),
    // Preenchido sse inativo (coerência garantida pelo CHECK abaixo).
    deactivatedAt: datetime('deactivated_at', { mode: 'date', fsp: 3 }),
    createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull(),
    updatedAt: datetime('updated_at', { mode: 'date', fsp: 3 }).notNull(),
  },
  (t) => [
    // CHECK: active=false ⟺ deactivated_at preenchido.
    check(
      'par_states_active_consistency_chk',
      sql`(${t.active} = FALSE) = (${t.deactivatedAt} IS NOT NULL)`,
    ),
  ],
);

export type StateRow = typeof parStates.$inferSelect;
export type NewStateRow = typeof parStates.$inferInsert;

// ─── par_municipalities ─────────────────────────────────────────────────────
// Parceria territorial por município (US-002 — ADR-0001 da feature). PK: `ibge_code` varchar(7).
// `uf` varchar(2) — atributo de organização (cross-state). Sem FK (ADR-0031 §3).
// Soft-delete idêntico ao padrão do módulo.
export const parMunicipalities = mysqlTable(
  'par_municipalities',
  {
    // Código IBGE de 7 dígitos. PK natural.
    ibgeCode: varchar('ibge_code', { length: 7 }).primaryKey().notNull(),
    // UF do município (derivado do catálogo na escrita).
    uf: varchar('uf', { length: 2 }).notNull(),
    active: boolean('active').notNull().default(true),
    // Preenchido sse inativo (coerência garantida pelo CHECK abaixo).
    deactivatedAt: datetime('deactivated_at', { mode: 'date', fsp: 3 }),
    createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull(),
    updatedAt: datetime('updated_at', { mode: 'date', fsp: 3 }).notNull(),
  },
  (t) => [
    // CHECK: active=false ⟺ deactivated_at preenchido.
    check(
      'par_municipalities_active_consistency_chk',
      sql`(${t.active} = FALSE) = (${t.deactivatedAt} IS NOT NULL)`,
    ),
  ],
);

export type MunicipalityRow = typeof parMunicipalities.$inferSelect;
export type NewMunicipalityRow = typeof parMunicipalities.$inferInsert;

// ─── par_acts ───────────────────────────────────────────────────────────────
// Acordo de Cooperação Técnica (EPIC-PAR-ACT-ACORDO) — firmado com instituição
// parceira (CNPJ). `act_number` UNIQUE (nº do instrumento jurídico, D1). Vigência
// (`validity`) decomposta em duas colunas `date` (PlainDate, inquiry 0020). Repasse
// CONDICIONAL: `has_financial_transfer = TRUE` ⇒ ao menos um destino de pagamento.
// Destino achatado em colunas (ADR-0020 — sem JSON). Enums (occupation_area) são
// varchar (ADR-0020 — sem ENUM nativo). Soft-delete via `active`/`deactivated_at`.
// COLLATE utf8mb4_bin em `id`/`cnpj` (aplicar no SQL manual — limitação Drizzle 0.45.x).
export const parActs = mysqlTable(
  'par_acts',
  {
    // UUID v4 gerado no domínio. COLLATE utf8mb4_bin no SQL manual.
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    // Nº do instrumento jurídico, fornecido pelo operador (D1). UNIQUE.
    actNumber: varchar('act_number', { length: 60 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(), // objeto/título do acordo
    email: varchar('email', { length: 255 }).notNull(), // contato
    // 14 dígitos (sem máscara). NÃO UNIQUE (uma instituição pode firmar vários acordos).
    // COLLATE utf8mb4_bin no SQL manual.
    cnpj: varchar('cnpj', { length: 14 }).notNull(),
    corporateName: varchar('corporate_name', { length: 255 }).notNull(), // razão social
    fantasyName: varchar('fantasy_name', { length: 255 }).notNull(), // nome fantasia/sigla
    // Literal legado (ex.: PARC). varchar, NÃO ENUM (ADR-0020).
    occupationArea: varchar('occupation_area', { length: 10 }).notNull(),
    // Representante legal / ponto de contato (ex-`role`).
    legalRepresentative: varchar('legal_representative', { length: 255 }).notNull(),
    // Vigência (Period kind Fixed) decomposta — PlainDate em coluna `date` (inquiry 0020).
    validityStart: date('validity_start', { mode: 'date' }).notNull(),
    validityEnd: date('validity_end', { mode: 'date' }).notNull(),
    hasFinancialTransfer: boolean('has_financial_transfer').notNull(),
    // Destino de pagamento — bloco bancário (juntos NULL ou juntos preenchidos).
    bankAccountBank: varchar('bank_account_bank', { length: 50 }),
    bankAccountAgency: varchar('bank_account_agency', { length: 20 }),
    bankAccountNumber: varchar('bank_account_number', { length: 30 }),
    bankAccountCheckDigit: varchar('bank_account_check_digit', { length: 5 }),
    // Destino de pagamento — bloco pix (juntos NULL ou juntos preenchidos).
    pixKeyType: varchar('pix_key_type', { length: 20 }),
    pixKey: varchar('pix_key', { length: 255 }),
    // Soft-delete simples: active=false ⟺ deactivated_at preenchido (sem disableBy).
    active: boolean('active').notNull().default(true),
    deactivatedAt: datetime('deactivated_at', { mode: 'date', fsp: 3 }),
    createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull(),
    updatedAt: datetime('updated_at', { mode: 'date', fsp: 3 }).notNull(),
    // Correlação ETL (P2): id de origem no legado. NULL = nativo; não-NULL = migrado.
    legacyId: int('legacy_id'),
  },
  (t) => [
    // (a) soft-delete: active=false ⟺ deactivated_at preenchido.
    check(
      'par_acts_active_consistency_chk',
      sql`(${t.active} = FALSE) = (${t.deactivatedAt} IS NOT NULL)`,
    ),
    // (b) repasse condicional: só exige destino quando há transferência financeira.
    check(
      'par_acts_payment_target_chk',
      sql`(${t.hasFinancialTransfer} = FALSE) OR (${t.bankAccountBank} IS NOT NULL) OR (${t.pixKey} IS NOT NULL)`,
    ),
    // (c) coerência do bloco bancário (4 colunas juntas NULL ou juntas preenchidas).
    check(
      'par_acts_bank_block_chk',
      sql`(${t.bankAccountBank} IS NULL) = (${t.bankAccountAgency} IS NULL)
        AND (${t.bankAccountBank} IS NULL) = (${t.bankAccountNumber} IS NULL)
        AND (${t.bankAccountBank} IS NULL) = (${t.bankAccountCheckDigit} IS NULL)`,
    ),
    // (c) coerência do bloco pix (pix_key_type ⟺ pix_key).
    check('par_acts_pix_block_chk', sql`(${t.pixKeyType} IS NULL) = (${t.pixKey} IS NULL)`),
    // UNIQUE(act_number) — nº do instrumento jurídico (D1).
    uniqueIndex('par_acts_act_number_idx').on(t.actNumber),
    // UNIQUE(legacy_id) — idempotência da ETL (múltiplos NULL convivem no InnoDB).
    uniqueIndex('par_acts_legacy_id_idx').on(t.legacyId),
  ],
);

export type ActRow = typeof parActs.$inferSelect;
export type NewActRow = typeof parActs.$inferInsert;

// ─── par_outbox — eventos pendentes/em processamento ─────────────────────────
//
// Espelha `ctr_outbox` (ADR-0015). Fluxo: `save(aggregate, events)` insere aqui
// atomicamente com o estado do agregado (via `appendOutboxInTx`). Worker lê
// WHERE processed_at IS NULL ORDER BY occurred_at LIMIT N FOR UPDATE SKIP LOCKED.
//
// payload: VARCHAR(8192) serializado (sem JSON nativo — ADR-0020 §"proibido").
// IDs em varchar(36) (convenção do módulo partners; COLLATE utf8mb4_bin no SQL manual)
// — diverge do `ctr_outbox` (que usa char(36)) para alinhar com as demais tabelas par_*.
export const parOutbox = mysqlTable(
  'par_outbox',
  {
    // UUID v4 do evento — gerado antes do INSERT. COLLATE utf8mb4_bin no SQL manual.
    eventId: varchar('event_id', { length: 36 }).primaryKey().notNull(),
    // supplierId (UUID v4). COLLATE utf8mb4_bin no SQL manual.
    aggregateId: varchar('aggregate_id', { length: 36 }).notNull(),
    // 'Supplier' — controlado por CHECK abaixo.
    aggregateType: varchar('aggregate_type', { length: 32 }).notNull(),
    // PascalCase EN: SupplierRegistered, SupplierEdited, …
    eventType: varchar('event_type', { length: 64 }).notNull(),
    // Versão do contrato do payload (inicia em 1).
    schemaVersion: smallint('schema_version').notNull(),
    // Timestamp do domain event (moment em que ocorreu no domínio).
    occurredAt: datetime('occurred_at', { mode: 'date', fsp: 3 }).notNull(),
    // Timestamp do INSERT na outbox (audit trail).
    enqueuedAt: datetime('enqueued_at', { mode: 'date', fsp: 3 }).notNull(),
    // NULL = pendente; NOT NULL = worker marcou após delivery OK.
    processedAt: datetime('processed_at', { mode: 'date', fsp: 3 }),
    // Número de tentativas de entrega. Default 0; incrementado pelo worker.
    attempts: smallint('attempts').notNull().default(0),
    // Payload serializado do evento de integração — VARCHAR, nunca JSON nativo (ADR-0020).
    payload: varchar('payload', { length: 8192 }).notNull(),
  },
  (t) => [
    // CHECK attempts >= 0 — defesa em profundidade.
    check('par_outbox_attempts_nonneg_chk', sql`${t.attempts} >= 0`),
    // CHECK event_type não-vazio — PascalCase sem espaço.
    check('par_outbox_event_type_nonempty_chk', sql`CHAR_LENGTH(${t.eventType}) > 0`),
    // CHECK aggregate_type restrito ao catálogo do módulo partners (só Supplier por ora).
    check('par_outbox_aggregate_type_chk', sql`${t.aggregateType} IN ('Supplier')`),
    // Índice composto (ADR-0015 §"Sobre o índice"): processed_at PRIMEIRO → NULLs
    // agrupados → worker faz range scan eficiente na query canônica.
    index('par_outbox_processed_at_occurred_at_idx').on(t.processedAt, t.occurredAt),
    // Índice por agregado — auditoria "todos os eventos do fornecedor X".
    index('par_outbox_aggregate_id_idx').on(t.aggregateId),
  ],
);

export type OutboxRow = typeof parOutbox.$inferSelect;
export type NewOutboxRow = typeof parOutbox.$inferInsert;

// ─── par_outbox_dead_letter — eventos que falharam N tentativas ───────────────
//
// Espelha `ctr_outbox_dead_letter`. O worker move para cá quando `attempts >=
// MAX_ATTEMPTS`. A row é uma cópia da outbox original + `failed_at` + `last_error`.
// Sem FK com `par_outbox` — a row original pode ser apagada da outbox.
export const parOutboxDeadLetter = mysqlTable(
  'par_outbox_dead_letter',
  {
    eventId: varchar('event_id', { length: 36 }).primaryKey().notNull(),
    aggregateId: varchar('aggregate_id', { length: 36 }).notNull(),
    aggregateType: varchar('aggregate_type', { length: 32 }).notNull(),
    eventType: varchar('event_type', { length: 64 }).notNull(),
    schemaVersion: smallint('schema_version').notNull(),
    occurredAt: datetime('occurred_at', { mode: 'date', fsp: 3 }).notNull(),
    // Copiado da outbox original (audit: quando foi enfileirado inicialmente).
    enqueuedAt: datetime('enqueued_at', { mode: 'date', fsp: 3 }).notNull(),
    // Timestamp do roteamento para dead letter (quando MAX_ATTEMPTS foi atingido).
    failedAt: datetime('failed_at', { mode: 'date', fsp: 3 }).notNull(),
    // Número total de tentativas realizadas antes do descarte.
    attempts: smallint('attempts').notNull(),
    // Tag + payload do erro tagged (ex.: 'max-retries-exceeded: ...').
    lastError: varchar('last_error', { length: 2048 }).notNull(),
    // Payload copiado da outbox original — VARCHAR, nunca JSON nativo (ADR-0020).
    payload: varchar('payload', { length: 8192 }).notNull(),
  },
  (t) => [
    // Mesma restrição de aggregate_type da tabela principal.
    check('par_outbox_dlq_aggregate_type_chk', sql`${t.aggregateType} IN ('Supplier')`),
    // Índice por failed_at — monitoramento "eventos mortos nos últimos N dias".
    index('par_outbox_dlq_failed_at_idx').on(t.failedAt),
  ],
);

export type OutboxDeadLetterRow = typeof parOutboxDeadLetter.$inferSelect;
export type NewOutboxDeadLetterRow = typeof parOutboxDeadLetter.$inferInsert;

// ─── par_email_outbox — eventos de e-mail transacional (PARTNERS-INVITE-DOMAIN-EVENT / ADR-0047) ──
//
// Outbox de e-mail DEDICADO do partners, single-consumer (so o worker email-dispatch). Distinto do
// `par_outbox` de integracao (single-consumer destrutivo, ja consumido pelo supplier-view-projection):
// colocar CollaboratorInvited la canibalizaria aquele consumidor. Espelha `auth_outbox` (fatia 01).
//
// Fluxo: o save do invite-token insere aqui na MESMA tx (via appendEmailOutboxInTx) — atomicidade
// evento <=> commit da operacao (ADR-0015). payload: VARCHAR(8192) JSON serializado (sem JSON nativo
// — ADR-0020 §proibido). Carrega o link de autocadastro com token de uso unico (SENSIVEL): outbox
// interno (nunca cruza public-api publica — ADR-0006), nao logado. IDs em varchar(36) (COLLATE
// utf8mb4_bin no SQL manual).
export const parEmailOutbox = mysqlTable(
  'par_email_outbox',
  {
    // UUID v4 do evento — gerado antes do INSERT. COLLATE utf8mb4_bin no SQL manual.
    eventId: varchar('event_id', { length: 36 }).primaryKey().notNull(),
    // collaboratorId (UUID v4). COLLATE utf8mb4_bin no SQL manual.
    aggregateId: varchar('aggregate_id', { length: 36 }).notNull(),
    // 'Collaborator' — controlado por CHECK abaixo.
    aggregateType: varchar('aggregate_type', { length: 32 }).notNull(),
    // PascalCase EN passado: CollaboratorInvited.
    eventType: varchar('event_type', { length: 64 }).notNull(),
    // Versao do contrato do payload (inicia em 1).
    schemaVersion: smallint('schema_version').notNull(),
    // Timestamp do domain event (momento em que ocorreu no dominio).
    occurredAt: datetime('occurred_at', { mode: 'date', fsp: 3 }).notNull(),
    // Timestamp do INSERT na outbox (audit trail).
    enqueuedAt: datetime('enqueued_at', { mode: 'date', fsp: 3 }).notNull(),
    // NULL = pendente; NOT NULL = worker marcou apos delivery OK.
    processedAt: datetime('processed_at', { mode: 'date', fsp: 3 }),
    // Numero de tentativas de entrega. Default 0; incrementado pelo worker.
    attempts: smallint('attempts').notNull().default(0),
    // Payload serializado do evento — VARCHAR, nunca JSON nativo (ADR-0020).
    payload: varchar('payload', { length: 8192 }).notNull(),
  },
  (t) => [
    // CHECK attempts >= 0 — defesa em profundidade.
    check('par_email_outbox_attempts_nonneg_chk', sql`${t.attempts} >= 0`),
    // CHECK event_type nao-vazio.
    check('par_email_outbox_event_type_nonempty_chk', sql`CHAR_LENGTH(${t.eventType}) > 0`),
    // CHECK aggregate_type restrito ao catalogo de e-mail do partners (so Collaborator por ora).
    check('par_email_outbox_aggregate_type_chk', sql`${t.aggregateType} IN ('Collaborator')`),
    // Indice composto (ADR-0015 §"Sobre o indice"): processed_at PRIMEIRO → NULLs agrupados →
    // worker faz range scan eficiente na query canonica.
    index('par_email_outbox_processed_at_occurred_at_idx').on(t.processedAt, t.occurredAt),
    // Indice por agregado — auditoria "todos os e-mails do colaborador X".
    index('par_email_outbox_aggregate_id_idx').on(t.aggregateId),
  ],
);

export type EmailOutboxRow = typeof parEmailOutbox.$inferSelect;
export type NewEmailOutboxRow = typeof parEmailOutbox.$inferInsert;
