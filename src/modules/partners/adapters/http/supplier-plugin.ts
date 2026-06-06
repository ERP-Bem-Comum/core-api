/**
 * Plugin HTTP do recurso Fornecedores (ADR-0024/0025/0026/0028/0033). Encapsula `/suppliers`;
 * o root registra sob `/api/v1`. Espelha `plugin.ts` (collaborators).
 *
 * S1 (reads): `GET /suppliers` (lista paginada + filtros) e `GET /:id` (detalhe), `supplier:read`.
 */

import type {
  FastifyPluginAsync,
  FastifyReply,
  FastifyRequest,
  preHandlerAsyncHookHandler,
} from 'fastify';
import type {
  FastifyPluginAsyncZodOpenApi,
  FastifyZodOpenApiSchema,
  FastifyZodOpenApiTypeProvider,
} from 'fastify-zod-openapi';

import { ok, err } from '#src/shared/primitives/result.ts';
import { sendResult } from '#src/shared/http/reply.ts';
import { toErrorEnvelope } from '#src/shared/http/errors.ts';
import { currentCorrelationId } from '#src/shared/observability/correlation.ts';

import type { PartnersHttpDeps } from './composition.ts';
import { supplierToDetailDto } from './supplier-dto.ts';
import { queryToFilter, paginateRecords, suppliersForExport } from './supplier-list-query.ts';
import { suppliersToCsv } from '../export/supplier-csv.ts';
import {
  supplierListQuerySchema,
  supplierExportQuerySchema,
  supplierPaginatedSchema,
  supplierDetailSchema,
  supplierIdParamSchema,
  createSupplierBodySchema,
  updateSupplierBodySchema,
} from './supplier-schemas.ts';
import { SUPPLIER_PERMISSION } from '../../public-api/permissions.ts';

export type SuppliersHttpHooks = Readonly<{
  requireAuth: preHandlerAsyncHookHandler;
  authorize: (permissionName: string) => preHandlerAsyncHookHandler;
  /** Checagem consultável de permissão (RBAC condicional do campo vital — edição). */
  hasPermission: (req: FastifyRequest, permissionName: string) => Promise<boolean>;
}>;

const SENSITIVE_PERMISSION = 'supplier:edit-sensitive';

// Conflito de estado/unicidade → 409.
const CONFLICT_CODES: ReadonlySet<string> = new Set([
  'register-supplier-cnpj-duplicate',
  'supplier-cnpj-duplicate',
  'edit-supplier-cnpj-duplicate',
  'supplier-already-inactive',
  'supplier-already-active',
]);
const NOT_FOUND_CODES: ReadonlySet<string> = new Set([
  'deactivate-supplier-not-found',
  'reactivate-supplier-not-found',
  'edit-supplier-not-found',
]);
const BAD_REQUEST_CODES: ReadonlySet<string> = new Set([
  'deactivate-supplier-invalid-id',
  'reactivate-supplier-invalid-id',
  'edit-supplier-invalid-id',
]);
const FORBIDDEN_CODES: ReadonlySet<string> = new Set(['edit-supplier-sensitive-forbidden']);
const REPO_UNAVAILABLE_CODES: ReadonlySet<string> = new Set(['supplier-repo-unavailable']);

// Erro de escrita → status. Default 422 (invariante de domínio: email/cnpj/categoria/payment-target).
const writeErrorStatus = (code: string): number => {
  if (FORBIDDEN_CODES.has(code)) return 403;
  if (CONFLICT_CODES.has(code)) return 409;
  if (NOT_FOUND_CODES.has(code)) return 404;
  if (BAD_REQUEST_CODES.has(code)) return 400;
  if (REPO_UNAVAILABLE_CODES.has(code)) return 503;
  return 422;
};

const sendWriteError = (reply: FastifyReply, code: string): Promise<void> => {
  const requestId = currentCorrelationId() ?? reply.request.id;
  return reply
    .code(writeErrorStatus(code))
    .send(toErrorEnvelope(code, code, requestId)) as unknown as Promise<void>;
};

const suppliersRoutes =
  (deps: PartnersHttpDeps, hooks: SuppliersHttpHooks): FastifyPluginAsyncZodOpenApi =>
  async (scope) => {
    scope.route({
      method: 'GET',
      url: '/suppliers',
      preHandler: [hooks.requireAuth, hooks.authorize(SUPPLIER_PERMISSION.read)],
      schema: {
        querystring: supplierListQuerySchema,
        response: { 200: supplierPaginatedSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.listSupplierRecords();
        if (!result.ok) {
          return sendResult(reply, err(result.error), {
            errors: { 'supplier-read-unavailable': 503 },
          });
        }
        const page = paginateRecords(result.value, queryToFilter(req.query), req.query);
        return sendResult(
          reply,
          ok({ items: page.items.map(supplierToDetailDto), meta: page.meta }),
          { ok: 200 },
        );
      },
    });

    // Export CSV (US-003): filtra (search/active/categories) e serializa via util compartilhado
    // (escape anti-fórmula). Rota estática tem precedência sobre `/:id` no Fastify. `supplier:read`.
    scope.route({
      method: 'GET',
      url: '/suppliers/export',
      preHandler: [hooks.requireAuth, hooks.authorize(SUPPLIER_PERMISSION.read)],
      schema: {
        querystring: supplierExportQuerySchema,
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.listSupplierRecords();
        if (!result.ok) {
          return sendResult(reply, err(result.error), {
            errors: { 'supplier-read-unavailable': 503 },
          });
        }
        const csv = suppliersToCsv(suppliersForExport(result.value, queryToFilter(req.query)));
        return reply
          .code(200)
          .header('content-type', 'text/csv; charset=utf-8')
          .header('content-disposition', 'attachment; filename="suppliers.csv"')
          .header('x-content-type-options', 'nosniff')
          .send(csv) as unknown as Promise<void>;
      },
    });

    scope.route({
      method: 'GET',
      url: '/suppliers/:id',
      preHandler: [hooks.requireAuth, hooks.authorize(SUPPLIER_PERMISSION.read)],
      schema: {
        params: supplierIdParamSchema,
        response: { 200: supplierDetailSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.getSupplierById(req.params.id);
        if (!result.ok) {
          return sendResult(reply, err(result.error), {
            errors: { 'supplier-read-unavailable': 503 },
          });
        }
        if (result.value === null) {
          return sendResult(reply, err('supplier-not-found'), {
            errors: { 'supplier-not-found': 404 },
          });
        }
        return sendResult(reply, ok(supplierToDetailDto(result.value)), { ok: 200 });
      },
    });

    // Cadastro (S2): cria fornecedor. 201 + Location (sem corpo). Invariante payment target → 422.
    scope.route({
      method: 'POST',
      url: '/suppliers',
      preHandler: [hooks.requireAuth, hooks.authorize(SUPPLIER_PERMISSION.write)],
      schema: {
        body: createSupplierBodySchema,
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.registerSupplier(req.body);
        if (!result.ok) return sendWriteError(reply, result.error);
        const id = String(result.value.supplier.id);
        return reply
          .code(201)
          .header('location', `/api/v1/suppliers/${id}`)
          .send() as unknown as Promise<void>;
      },
    });

    // Desativar (S3): Active → Inactive (soft-delete; sem disableBy).
    scope.route({
      method: 'POST',
      url: '/suppliers/:id/deactivate',
      preHandler: [hooks.requireAuth, hooks.authorize(SUPPLIER_PERMISSION.write)],
      schema: {
        params: supplierIdParamSchema,
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.deactivateSupplier({ supplierId: req.params.id });
        if (!result.ok) return sendWriteError(reply, result.error);
        return reply.code(200).send() as unknown as Promise<void>;
      },
    });

    // Reativar (S3): Inactive → Active.
    scope.route({
      method: 'POST',
      url: '/suppliers/:id/reactivate',
      preHandler: [hooks.requireAuth, hooks.authorize(SUPPLIER_PERMISSION.write)],
      schema: {
        params: supplierIdParamSchema,
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.reactivateSupplier({ supplierId: req.params.id });
        if (!result.ok) return sendWriteError(reply, result.error);
        return reply.code(200).send() as unknown as Promise<void>;
      },
    });

    // Edição (PUT total). `supplier:write` edita campos não-vitais (incl. payment target);
    // mudar o CNPJ (vital) exige `supplier:edit-sensitive` (regra no use case).
    scope.route({
      method: 'PUT',
      url: '/suppliers/:id',
      preHandler: [hooks.requireAuth, hooks.authorize(SUPPLIER_PERMISSION.write)],
      schema: {
        params: supplierIdParamSchema,
        body: updateSupplierBodySchema,
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const canEditSensitive = await hooks.hasPermission(req, SENSITIVE_PERMISSION);
        const result = await deps.editSupplier({
          supplierId: req.params.id,
          canEditSensitive,
          ...req.body,
        });
        if (!result.ok) return sendWriteError(reply, result.error);
        return reply.code(200).send() as unknown as Promise<void>;
      },
    });
  };

export const suppliersHttpPlugin =
  (deps: PartnersHttpDeps, hooks: SuppliersHttpHooks): FastifyPluginAsync =>
  async (app) => {
    await app
      .withTypeProvider<FastifyZodOpenApiTypeProvider>()
      .register(suppliersRoutes(deps, hooks));
  };
