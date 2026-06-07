/**
 * Schemas Zod das rotas de Users (spec 005, US1 — ADR-0027).
 *
 * GET /api/v1/users: listagem paginada administrativa.
 * pageSize in {5,10,25} (espelha o use case); status na borda usa active|inactive|all,
 * mapeado para active|disabled|all no handler antes de chamar o use case.
 * Zod fica so nesta camada de borda; o dominio valida via smart constructors.
 */

import * as z from 'zod/v4';

/** Status na borda HTTP (conforme spec 005 http-users.md). */
export const userStatusQuerySchema = z.enum(['active', 'inactive', 'all']).default('all');

/** Query do GET /api/v1/users. */
export const userListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .refine((v): v is 5 | 10 | 25 => v === 5 || v === 10 || v === 25, {
      message: 'pageSize deve ser 5, 10 ou 25',
    })
    .default(5),
  search: z.string().min(1).optional(),
  status: userStatusQuerySchema,
});

export type UserListQuery = z.infer<typeof userListQuerySchema>;

/** Item individual da listagem. */
export const userListItemSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string(),
  status: z.enum(['active', 'disabled']),
});

/** Meta de paginacao (shape do use case — nao usa o legado partners). */
export const userPaginationMetaSchema = z.object({
  currentPage: z.number().int(),
  pageSize: z.number().int(),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

/** Response 200 do GET /api/v1/users. */
export const userListResponseSchema = z.object({
  items: z.array(userListItemSchema),
  meta: userPaginationMetaSchema,
});

export type UserListResponse = z.infer<typeof userListResponseSchema>;

/** Param do GET /api/v1/users/:id. */
export const userIdParamSchema = z.object({ id: z.string().min(1) });

/** Response 200 do GET /api/v1/users/:id (detalhe — spec 005 US2). */
export const userDetailResponseSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string(),
  cpf: z.string().nullable(),
  telephone: z.string().nullable(),
  imageUrl: z.string().nullable(),
  active: z.boolean(),
  massApprovalPermission: z.boolean(),
  collaboratorId: z.string().nullable(),
});

export type UserDetailResponse = z.infer<typeof userDetailResponseSchema>;

/** Body do POST /api/v1/users (criar). Formato de cpf/email/telefone validado no use case (VOs). */
export const createUserBodySchema = z.object({
  name: z.string().min(1),
  cpf: z.string().min(1),
  email: z.string().min(1),
  telephone: z.string().min(1),
});

export type CreateUserBody = z.infer<typeof createUserBodySchema>;

/** Response 201 do POST /api/v1/users. */
export const createUserResponseSchema = z.object({ id: z.string() });

/**
 * Body do PUT /api/v1/users/:id (editar perfil — spec 005 US4).
 * Patch parcial: todos os campos opcionais; ausente preserva o atual. Formato de cpf/email/telefone
 * validado no use case (VOs). `collaboratorId` aceita null para limpar o vinculo.
 */
export const updateUserBodySchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().min(1).optional(),
  cpf: z.string().min(1).optional(),
  telephone: z.string().min(1).optional(),
  collaboratorId: z.string().nullable().optional(),
});

export type UpdateUserBody = z.infer<typeof updateUserBodySchema>;
