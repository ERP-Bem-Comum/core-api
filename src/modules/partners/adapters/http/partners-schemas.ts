/**
 * Schemas Zod do agregador `GET /api/v1/partners` (ADR-0027; Zod só na borda).
 * Query (search/type/page/limit) + envelope paginado com `meta` canônico do partners
 * (`itemCount/totalItems/itemsPerPage/totalPages/currentPage`) — consistência com as
 * listas por-tipo (`supplier-schemas.ts`).
 */

import * as z from 'zod/v4';

const LIST_LIMIT_MAX = 100;
const LIST_LIMIT_DEFAULT = 20;

export const partnersAggregateQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(LIST_LIMIT_MAX).default(LIST_LIMIT_DEFAULT),
  search: z.string().min(1).optional(),
  type: z.enum(['supplier', 'financier', 'collaborator', 'act']).optional(),
});

export type PartnersAggregateQueryDto = z.infer<typeof partnersAggregateQuerySchema>;

const partnerListItemSchema = z.object({
  type: z.enum(['supplier', 'financier', 'collaborator', 'act']),
  id: z.string(),
  name: z.string(),
  document: z.string(),
  active: z.boolean(),
});

const partnersPaginationMetaSchema = z.object({
  itemCount: z.number().int().nonnegative(),
  totalItems: z.number().int().nonnegative(),
  itemsPerPage: z.number().int(),
  totalPages: z.number().int().nonnegative(),
  currentPage: z.number().int(),
});

export const partnersPaginatedSchema = z.object({
  items: z.array(partnerListItemSchema),
  meta: partnersPaginationMetaSchema,
});

export type PartnersPaginatedDto = z.infer<typeof partnersPaginatedSchema>;
