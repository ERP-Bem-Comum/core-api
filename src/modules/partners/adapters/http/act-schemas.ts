/**
 * Schemas Zod das rotas de Acts — Acordo de Cooperação Técnica (ADR-0027). Zod só na borda.
 * Espelha o schema de Suppliers (cnpj/corporateName/fantasyName/payment target) + vigência
 * (`startDate`/`endDate`) + `actNumber` + `legalRepresentative` + `hasFinancialTransfer`.
 */

import * as z from 'zod/v4';

const LIST_LIMIT_MAX = 100;
const LIST_LIMIT_DEFAULT = 5;

/** Param `:id` — UUID do Act (core-api). Formato inválido → 400. */
export const actIdParamSchema = z.object({
  id: z.uuid().meta({ description: 'UUID do Acordo (core-api)' }),
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

/** Detalhe do Acordo. `startDate`/`endDate` derivados da vigência (Period). */
export const actDetailSchema = z.object({
  id: z.uuid(),
  legacyId: z.number().int().nullable(),
  actNumber: z.string(),
  name: z.string(),
  email: z.string(),
  cnpj: z.string().meta({ description: 'CNPJ (14 dígitos)' }),
  corporateName: z.string(),
  fantasyName: z.string(),
  occupationArea: z.string(),
  legalRepresentative: z.string(),
  startDate: z.string().meta({ description: 'Início da vigência (ISO date)' }),
  endDate: z.string().meta({ description: 'Fim da vigência (ISO date)' }),
  hasFinancialTransfer: z.boolean(),
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

export type ActDetailDto = z.infer<typeof actDetailSchema>;

/** Meta de paginação legada. */
export const actPaginationMetaSchema = z.object({
  itemCount: z.number().int().nonnegative(),
  totalItems: z.number().int().nonnegative(),
  itemsPerPage: z.number().int(),
  totalPages: z.number().int().nonnegative(),
  currentPage: z.number().int(),
});

/** Query do GET /api/v1/acts — busca + filtros tipo (repasse) e área. */
export const actListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(LIST_LIMIT_MAX).default(LIST_LIMIT_DEFAULT),
  order: z.enum(['ASC', 'DESC']).default('ASC'),
  search: z.string().min(1).optional(),
  active: z.coerce.number().int().min(0).max(1).optional(),
  hasFinancialTransfer: z.coerce.number().int().min(0).max(1).optional(),
  occupationArea: z.enum(['PARC', 'DDI', 'DCE', 'EPV']).optional(),
});

export type ActListQuery = z.infer<typeof actListQuerySchema>;

/** Response paginado do GET /api/v1/acts — item = detalhe (inclui contractCount). */
export const actPaginatedSchema = z.object({
  items: z.array(actDetailSchema),
  meta: actPaginationMetaSchema,
});

export type ActPaginatedDto = z.infer<typeof actPaginatedSchema>;

// ─── Escrita ────────────────────────────────────────────────────────────────

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
 * Body do POST /acts. A invariante de repasse (hasFinancialTransfer ⇒ ≥1 payment target)
 * é do domínio (422), não do Zod. `cnpj` 14 dígitos (DV no domínio); vigência via `startDate`/
 * `endDate` (validade da data e ordem validadas no domínio → 422).
 */
export const createActBodySchema = z.object({
  actNumber: z.string().min(1),
  name: z.string().min(1),
  email: z.string().min(1),
  cnpj: z.string().length(14).meta({ description: 'CNPJ — 14 dígitos (DV validado no domínio)' }),
  corporateName: z.string().min(1),
  fantasyName: z.string().min(1),
  occupationArea: z.enum(['PARC', 'DDI', 'DCE', 'EPV']),
  legalRepresentative: z.string().min(1),
  startDate: z.string().min(1).meta({ description: 'Início da vigência (ISO date YYYY-MM-DD)' }),
  endDate: z.string().min(1).meta({ description: 'Fim da vigência (ISO date YYYY-MM-DD)' }),
  hasFinancialTransfer: z.boolean(),
  bankAccount: bankAccountInputSchema.nullable().default(null),
  pixKey: pixKeyInputSchema.nullable().default(null),
});

export type CreateActBody = z.infer<typeof createActBodySchema>;

/** Body do PUT /acts/:id — substituição total (= create). */
export const updateActBodySchema = createActBodySchema;

export type UpdateActBody = z.infer<typeof updateActBodySchema>;
