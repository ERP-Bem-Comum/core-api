/**
 * Schemas Zod das rotas de Fornecedores (ADR-0027). Zod só na borda. Espelha o schema
 * `Supplier`/`PaginatedSuppliers` do legado (handbook/legacy_docs/openapi.yaml:2549).
 *
 * S1 (reads): query da lista (search/active/categories) + detalhe + envelope paginado + id param.
 * `serviceCategory`/`categories` como `z.string()` (39 categorias legadas; o domínio valida o valor).
 */

import * as z from 'zod/v4';

const LIST_LIMIT_MAX = 100;
const LIST_LIMIT_DEFAULT = 5;

const toArray = (v: unknown): unknown => (v === undefined ? undefined : Array.isArray(v) ? v : [v]);

/** Query do GET /api/v1/suppliers (subconjunto legado: search, active, categories). */
export const supplierListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(LIST_LIMIT_MAX).default(LIST_LIMIT_DEFAULT),
  order: z.enum(['ASC', 'DESC']).default('ASC'),
  search: z.string().min(1).optional(),
  active: z.coerce.number().int().min(0).max(1).optional(),
  categories: z.preprocess(toArray, z.array(z.string()).optional()),
});

export type SupplierListQuery = z.infer<typeof supplierListQuerySchema>;

/** Query do GET /api/v1/suppliers/export — filtros sem paginação (exporta tudo que casa). */
export const supplierExportQuerySchema = z.object({
  search: z.string().min(1).optional(),
  active: z.coerce.number().int().min(0).max(1).optional(),
  categories: z.preprocess(toArray, z.array(z.string()).optional()),
});

export type SupplierExportQuery = z.infer<typeof supplierExportQuerySchema>;

/** Resposta do GET /api/v1/suppliers/service-categories — catálogo canônico (códigos legados). */
export const serviceCategoriesSchema = z
  .array(z.string())
  .meta({ description: 'Categorias de serviço canônicas (códigos legados, FR-017)' });

/** Resposta do GET /api/v1/suppliers/service-ratings — catálogo de níveis de avaliação. */
export const serviceRatingsSchema = z
  .array(z.string())
  .meta({ description: 'Níveis de avaliação canônicos (RUIM/REGULAR/BOM/OTIMO)' });

/** Param `:id` — UUID do fornecedor (core-api). Formato inválido → 400. */
export const supplierIdParamSchema = z.object({
  id: z.uuid().meta({ description: 'UUID do fornecedor (core-api)' }),
});

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

/** Detalhe — espelha o schema `Supplier` legado. `id` UUID do core; `legacyId` int antigo. */
export const supplierDetailSchema = z.object({
  id: z.uuid(),
  legacyId: z.number().int().nullable(),
  name: z.string(),
  email: z.string(),
  cnpj: z.string().meta({ description: 'CNPJ (14 dígitos)' }),
  corporateName: z.string(),
  fantasyName: z.string(),
  serviceCategory: z.string(),
  bankAccount: bankAccountSchema.nullable(),
  pixKey: pixKeySchema.nullable(),
  serviceRating: z.string().nullable(),
  ratingComment: z.string().nullable(),
  active: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  contractCount: z
    .number()
    .int()
    .nonnegative()
    .meta({ description: 'Contratos ativos da contraparte (read-model par_contract_count_view)' }),
});

export type SupplierDetailDto = z.infer<typeof supplierDetailSchema>;

/** Meta de paginação legada (openapi.yaml:2331). */
export const supplierPaginationMetaSchema = z.object({
  itemCount: z.number().int().nonnegative(),
  totalItems: z.number().int().nonnegative(),
  itemsPerPage: z.number().int(),
  totalPages: z.number().int().nonnegative(),
  currentPage: z.number().int(),
});

/** Response paginado do GET /api/v1/suppliers — item = detalhe (inclui contractCount). */
export const supplierPaginatedSchema = z.object({
  items: z.array(supplierDetailSchema),
  meta: supplierPaginationMetaSchema,
});

export type SupplierPaginatedDto = z.infer<typeof supplierPaginatedSchema>;

// ─── S2 — escrita ────────────────────────────────────────────────────────────

const bankAccountInputSchema = z.object({
  bank: z.string(),
  agency: z.string(),
  accountNumber: z.string(),
  checkDigit: z.string(),
});

const pixKeyInputSchema = z.object({
  keyType: z.string(),
  key: z.string(),
});

/**
 * Body do POST /suppliers. Espelha `CreateSupplier` legado. A invariante "ao menos um
 * payment target" é do domínio (ausência de ambos → 422), não do Zod. `serviceCategory`
 * e `pixKey.keyType` como string (validados no domínio).
 */
export const createSupplierBodySchema = z.object({
  name: z.string().min(1),
  email: z.string().min(1),
  cnpj: z.string().length(14).meta({ description: 'CNPJ — 14 dígitos (DV validado no domínio)' }),
  corporateName: z.string().min(1),
  fantasyName: z.string().min(1),
  serviceCategory: z.string().min(1),
  bankAccount: bankAccountInputSchema.nullable().default(null),
  pixKey: pixKeyInputSchema.nullable().default(null),
  // Avaliação opcional. Domínio é autoridade do conjunto (rating inválido → 422).
  serviceRating: z.string().nullable().default(null),
  ratingComment: z.string().nullable().default(null),
});

export type CreateSupplierBody = z.infer<typeof createSupplierBodySchema>;

/** Body do PUT /suppliers/:id — substituição total (= create). Espelha `UpdateSupplier` legado. */
export const updateSupplierBodySchema = createSupplierBodySchema;

export type UpdateSupplierBody = z.infer<typeof updateSupplierBodySchema>;
