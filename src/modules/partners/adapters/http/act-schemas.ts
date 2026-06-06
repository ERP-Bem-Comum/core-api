/**
 * Schemas Zod das rotas de Acts (ADR-0027). Zod só na borda. Espelha os schemas
 * de Collaborators — Act tem os mesmos 7 campos de pré-cadastro + status duplo.
 */

import * as z from 'zod/v4';

const LIST_LIMIT_MAX = 100;
const LIST_LIMIT_DEFAULT = 5;

/** Param `:id` — UUID do Act (core-api). Formato inválido → 400. */
export const actIdParamSchema = z.object({
  id: z.uuid().meta({ description: 'UUID do Act (core-api)' }),
});

/**
 * Detalhe do Act — espelha os 7 campos de pré-cadastro + status duplo.
 * `status` = registrationStatus; `active` = soft-delete.
 */
export const actDetailSchema = z.object({
  id: z.uuid(),
  legacyId: z.number().int().nullable(),
  name: z.string(),
  email: z.string(),
  cpf: z.string(),
  occupationArea: z.string(),
  role: z.string(),
  startOfContract: z.string(),
  employmentRelationship: z.string(),
  registrationStatus: z.enum(['PreRegistration', 'Complete']),
  active: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
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

/** Query do GET /api/v1/acts. */
export const actListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(LIST_LIMIT_MAX).default(LIST_LIMIT_DEFAULT),
  order: z.enum(['ASC', 'DESC']).default('ASC'),
  search: z.string().min(1).optional(),
  active: z.coerce.number().int().min(0).max(1).optional(),
});

export type ActListQuery = z.infer<typeof actListQuerySchema>;

/** Response paginado do GET /api/v1/acts. */
export const actPaginatedSchema = z.object({
  items: z.array(actDetailSchema),
  meta: actPaginationMetaSchema,
});

export type ActPaginatedDto = z.infer<typeof actPaginatedSchema>;

// ─── Escrita ────────────────────────────────────────────────────────────────

/** Body do POST /acts (pré-cadastro). Espelha os 7 campos canônicos do Collaborator. */
export const createActBodySchema = z.object({
  name: z.string().min(1),
  email: z.string().min(1),
  cpf: z.string().length(11).meta({ description: 'CPF — 11 dígitos (DV validado no domínio)' }),
  occupationArea: z.enum(['PARC', 'DDI', 'DCE', 'EPV']),
  role: z.string().min(1),
  startOfContract: z.coerce.date().meta({ description: 'Início do contrato (ISO date)' }),
  employmentRelationship: z.enum(['CLT', 'PJ']),
});

export type CreateActBody = z.infer<typeof createActBodySchema>;

/** Body do PUT /acts/:id — substituição total dos 7 campos cadastrais. */
export const updateActBodySchema = createActBodySchema;

export type UpdateActBody = z.infer<typeof updateActBodySchema>;
