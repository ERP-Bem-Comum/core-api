/**
 * Schemas Zod das rotas de Financiadores (ADR-0027). Espelha o schema `Financier`/
 * `PaginatedFinanciers` legado. Mais simples que supplier (sem payment-target/categoria).
 */

import * as z from 'zod/v4';

const LIST_LIMIT_MAX = 100;
const LIST_LIMIT_DEFAULT = 5;

/** Query do GET /api/v1/financiers (subconjunto legado: search + active). */
export const financierListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(LIST_LIMIT_MAX).default(LIST_LIMIT_DEFAULT),
  order: z.enum(['ASC', 'DESC']).default('ASC'),
  search: z.string().min(1).optional(),
  active: z.coerce.number().int().min(0).max(1).optional(),
});

export type FinancierListQuery = z.infer<typeof financierListQuerySchema>;

/** Param `:id` — UUID do financiador. Formato inválido → 400. */
export const financierIdParamSchema = z.object({
  id: z.uuid().meta({ description: 'UUID do financiador (core-api)' }),
});

// Payment target (US1 feature 015) — espelha o molde de Supplier/Act. `agency` valida no domínio.
const bankAccountSchema = z.object({
  bank: z.string(),
  agency: z.string(),
  accountNumber: z.string(),
  checkDigit: z.string(),
});

const pixKeySchema = z.object({
  keyType: z.enum(['cpf', 'cnpj', 'email', 'phone', 'random-key']),
  key: z.string(),
});

/** Detalhe — espelha o schema `Financier` legado + payment target (US1). */
export const financierDetailSchema = z.object({
  id: z.uuid(),
  legacyId: z.number().int().nullable(),
  name: z.string(),
  corporateName: z.string(),
  legalRepresentative: z.string(),
  cnpj: z.string().meta({ description: 'CNPJ (14 dígitos)' }),
  telephone: z.string(),
  address: z.string(),
  bankAccount: bankAccountSchema.nullable(),
  pixKey: pixKeySchema.nullable(),
  active: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  contractCount: z
    .number()
    .int()
    .nonnegative()
    .meta({ description: 'Contratos ativos da contraparte (read-model par_contract_count_view)' }),
});

export type FinancierDetailDto = z.infer<typeof financierDetailSchema>;

export const financierPaginationMetaSchema = z.object({
  itemCount: z.number().int().nonnegative(),
  totalItems: z.number().int().nonnegative(),
  itemsPerPage: z.number().int(),
  totalPages: z.number().int().nonnegative(),
  currentPage: z.number().int(),
});

/** Response paginado do GET /api/v1/financiers — item = detalhe (inclui contractCount). */
export const financierPaginatedSchema = z.object({
  items: z.array(financierDetailSchema),
  meta: financierPaginationMetaSchema,
});

export type FinancierPaginatedDto = z.infer<typeof financierPaginatedSchema>;

/**
 * Body do POST /financiers. Espelha `CreateFinancier` legado + payment target (US1).
 * `bankAccount`/`pixKey` são OPCIONAIS (omitidos → null). `agency` (formato) validada no domínio.
 */
export const createFinancierBodySchema = z.object({
  name: z.string().min(1),
  corporateName: z.string().min(1),
  legalRepresentative: z.string().min(1),
  cnpj: z.string().length(14).meta({ description: 'CNPJ — 14 dígitos (DV validado no domínio)' }),
  telephone: z.string().min(1),
  address: z.string().min(1),
  bankAccount: bankAccountSchema.nullable().default(null),
  pixKey: pixKeySchema.nullable().default(null),
});

export type CreateFinancierBody = z.infer<typeof createFinancierBodySchema>;

/** Body do PUT /financiers/:id — substituição total (= create). Espelha `UpdateFinancier` legado. */
export const updateFinancierBodySchema = createFinancierBodySchema;

export type UpdateFinancierBody = z.infer<typeof updateFinancierBodySchema>;
