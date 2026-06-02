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

import { boolean, check, datetime, mysqlTable, uniqueIndex, varchar } from 'drizzle-orm/mysql-core';
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
  },
  (t) => [
    // CHECK: active=false ⟺ deactivated_at preenchido (coerência do soft-delete).
    check(
      'par_financiers_active_consistency_chk',
      sql`(${t.active} = FALSE) = (${t.deactivatedAt} IS NOT NULL)`,
    ),
    // UNIQUE(cnpj) — legado `financiers.cnpj` UNIQUE.
    uniqueIndex('par_financiers_cnpj_idx').on(t.cnpj),
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
    createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull(),
    updatedAt: datetime('updated_at', { mode: 'date', fsp: 3 }).notNull(),
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
    uniqueIndex('par_suppliers_cnpj_idx').on(t.cnpj),
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
  ],
);

export type CollaboratorRow = typeof parCollaborators.$inferSelect;
export type NewCollaboratorRow = typeof parCollaborators.$inferInsert;
