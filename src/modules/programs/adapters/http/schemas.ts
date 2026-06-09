/**
 * Schemas Zod das rotas de Programas (ADR-0027). Zod só na borda.
 *
 * Corpo de escrita propositalmente frouxo em `name`/`sigla` (apenas `z.string()`): a
 * validação de invariante é do domínio (`program-name-required`/`program-sigla-invalid` ->
 * 422), não do Zod (shape inválido -> 400). Paginação harmonizada com contracts/auth/partners.
 */

import * as z from 'zod/v4';

const LIST_LIMITS = [5, 10, 25] as const;
const LIST_LIMIT_DEFAULT = 5;

/** Query do GET /api/v1/programs (page/limit/order/search/status). */
export const programListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce
    .number()
    .int()
    .refine((v): v is (typeof LIST_LIMITS)[number] =>
      (LIST_LIMITS as readonly number[]).includes(v),
    )
    .default(LIST_LIMIT_DEFAULT),
  order: z.enum(['ASC', 'DESC']).default('ASC'),
  search: z.string().min(1).optional(),
  status: z.enum(['ATIVO', 'INATIVO']).optional(),
});

export type ProgramListQuery = z.infer<typeof programListQuerySchema>;

/** Param `:id` — UUID v4 do programa. Formato inválido -> 400. */
export const programIdParamSchema = z.object({
  id: z.uuid().meta({ description: 'UUID v4 do programa' }),
});

/** Item da lista (subconjunto enxuto). */
export const programItemSchema = z.object({
  id: z.uuid(),
  programNumber: z.number().int(),
  name: z.string(),
  sigla: z.string(),
  generalCharacteristics: z.string().nullable(),
  logoKey: z.string().nullable(),
  status: z.enum(['ATIVO', 'INATIVO']),
});

export type ProgramItemDto = z.infer<typeof programItemSchema>;

/** Detalhe completo (inclui version + timestamps). */
export const programDetailSchema = z.object({
  id: z.uuid(),
  programNumber: z.number().int(),
  name: z.string(),
  sigla: z.string(),
  director: z.string().nullable(),
  generalCharacteristics: z.string().nullable(),
  logoKey: z.string().nullable(),
  status: z.enum(['ATIVO', 'INATIVO']),
  version: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ProgramDetailDto = z.infer<typeof programDetailSchema>;

/** Meta de paginação harmonizada (espelha contracts/auth/partners). */
export const programPaginationMetaSchema = z.object({
  currentPage: z.number().int(),
  itemsPerPage: z.number().int(),
  itemCount: z.number().int().nonnegative(),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

/** Response paginado do GET /api/v1/programs. */
export const programPaginatedSchema = z.object({
  items: z.array(programItemSchema),
  meta: programPaginationMetaSchema,
});

export type ProgramPaginatedDto = z.infer<typeof programPaginatedSchema>;

/** Body do POST /programs. `director`/`generalCharacteristics`/`logoKey` opcionais (default null). */
export const createProgramBodySchema = z.object({
  name: z.string(),
  sigla: z.string(),
  director: z.string().nullable().default(null),
  generalCharacteristics: z.string().nullable().default(null),
  logoKey: z.string().nullable().default(null),
});

export type CreateProgramBody = z.infer<typeof createProgramBodySchema>;

/** Body do PUT /programs/:id — campos editáveis + `version` esperada (optimistic-lock). */
export const updateProgramBodySchema = createProgramBodySchema.extend({
  version: z.number().int().min(1),
});

export type UpdateProgramBody = z.infer<typeof updateProgramBodySchema>;

/** Response do POST /programs/:id/logo. */
export const logoUploadedSchema = z.object({
  logoKey: z.string(),
});
