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
  text,
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
    foodCategory: varchar('food_category', { length: 20 }),
    foodCategoryDescription: varchar('food_category_description', { length: 255 }),
    completeAddress: varchar('complete_address', { length: 500 }),
    telephone: varchar('telephone', { length: 30 }),
    emergencyContactName: varchar('emergency_contact_name', { length: 255 }),
    emergencyContactTelephone: varchar('emergency_contact_telephone', { length: 30 }),
    allergies: varchar('allergies', { length: 500 }),
    biography: varchar('biography', { length: 2000 }),
    experienceInThePublicSector: boolean('experience_in_the_public_sector'),
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
// Histórico append-only de alterações do Colaborador (#44). Snapshot GENÉRICO before/after do
// agregado (text serializado) — agnóstico aos campos, sem acoplar com a trilha A (CA5). Sem FK
// cross-agregado para `par_collaborators` (referência por ID, padrão par_user_profiles/ADR-0014).
// `change_type` é varchar + CHECK (NÃO ENUM — ADR-0020). `id`/`collaborator_ref`/`changed_by_ref`
// são UUID → COLLATE utf8mb4_bin no SQL manual. Apenas INSERT (sem update/delete).
export const parCollaboratorHistory = mysqlTable(
  'par_collaborator_history',
  {
    // UUID v4 gerado no domínio (PK de domínio — sem AUTO_INCREMENT). COLLATE utf8mb4_bin no SQL manual.
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    // UUID do colaborador (referência por ID, sem FK). COLLATE utf8mb4_bin no SQL manual.
    collaboratorRef: varchar('collaborator_ref', { length: 36 }).notNull(),
    // Tipo de alteração (literal). varchar + CHECK, NÃO ENUM (ADR-0020).
    changeType: varchar('change_type', { length: 20 }).notNull(),
    // Snapshot serializado genérico ANTES (null no 1º registro). text, NÃO JSON nativo (ADR-0020).
    snapshotBefore: text('snapshot_before'),
    // Snapshot serializado genérico DEPOIS (sempre presente).
    snapshotAfter: text('snapshot_after').notNull(),
    // UUID do auth.User autor (nullable enquanto a borda não propaga o ator). COLLATE utf8mb4_bin manual.
    changedByRef: varchar('changed_by_ref', { length: 36 }),
    occurredAt: datetime('occurred_at', { mode: 'date', fsp: 3 }).notNull(),
    createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull(),
  },
  (t) => [
    // change_type ∈ conjunto fechado (espelha CollaboratorChangeType).
    check(
      'par_collaborator_history_change_type_chk',
      sql`${t.changeType} IN ('Cadastro','Complementacao','Edicao','Desativacao','Reativacao')`,
    ),
    // Índice (NÃO unique) que atende a consulta da rota/CSV: por colaborador, mais recente primeiro.
    index('par_ch_collaborator_occurred_idx').on(t.collaboratorRef, t.occurredAt),
  ],
);

export type CollaboratorHistoryRow = typeof parCollaboratorHistory.$inferSelect;
export type NewCollaboratorHistoryRow = typeof parCollaboratorHistory.$inferInsert;

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
