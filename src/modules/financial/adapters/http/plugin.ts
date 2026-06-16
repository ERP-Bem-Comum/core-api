/**
 * Plugin HTTP do módulo financial (ADR-0025/0027/0037).
 *
 * Greenfield V2 → montado sob `/api/v2/financial` (ADR-0033; DEFAULT_API_PREFIX='/api/v2').
 * Zod contract-first (ADR-0027): schemas em schemas.ts, validação na borda, domínio recebe primitivos.
 * RBAC: requireAuth (401) + authorize(permission) (403) por rota.
 *
 * Rotas (todas sob /financial/documents):
 *   POST   /financial/documents                      fiscal-document:write  → saveDocument | saveDraft
 *   PATCH  /financial/documents/:id                  fiscal-document:write  → adjustDocument
 *   POST   /financial/documents/:id/approve          payable:approve        → approveDocument
 *   POST   /financial/documents/:id/undo-approval    payable:approve        → undoApproval
 *   DELETE /financial/documents/:id                  fiscal-document:cancel → cancelDocument (204)
 *   GET    /financial/documents                      fiscal-document:read   → listDocuments
 *   GET    /financial/documents/:id                  fiscal-document:read   → findDocumentById
 *
 * Mapa erro→HTTP (financial-http.md §Status codes):
 *   400 schema/ref inválida         Zod + financial-ref-invalid + document-id-invalid
 *   401/403                         requireAuth / authorize
 *   404 document-not-found
 *   409 transição inválida / cancel fora de Open
 *   422 net-value-not-positive / retention-not-allowed-for-type / document-incomplete
 */

import type { FastifyPluginAsync, FastifyReply, preHandlerAsyncHookHandler } from 'fastify';
import type {
  FastifyPluginAsyncZodOpenApi,
  FastifyZodOpenApiSchema,
  FastifyZodOpenApiTypeProvider,
} from 'fastify-zod-openapi';

import { ok } from '#src/shared/primitives/result.ts';
import { sendResult } from '#src/shared/http/reply.ts';
import { toErrorEnvelope } from '#src/shared/http/errors.ts';
import { currentCorrelationId } from '#src/shared/observability/correlation.ts';
import { writeErrorStatus, toPublicCode, toPublicMessage } from './error-mapping.ts';

import * as DocumentId from '../../domain/shared/document-id.ts';
import type { RetentionInput } from '../../domain/shared/retention.ts';
import type { RegisteredTaxInput } from '../../domain/shared/registered-tax.ts';
import { FINANCIAL_PERMISSION } from '../../public-api/permissions.ts';
import { documentToDto, listItemToSummaryDto, timelineToDto } from './dto.ts';
import type { DocumentListFilter } from '../../domain/document/query.ts';
import type { FinancialHttpDeps } from './composition.ts';
import {
  createDocumentBodySchema,
  adjustDocumentBodySchema,
  approveBodySchema,
  documentIdParamSchema,
  listDocumentsQuerySchema,
  documentResponseSchema,
  documentListResponseSchema,
  documentTimelineResponseSchema,
} from './schemas.ts';

export type FinancialHttpHooks = Readonly<{
  requireAuth: preHandlerAsyncHookHandler;
  /** Fábrica de preHandler RBAC — espelha ContractsHttpHooks. */
  authorize: (permissionName: string) => preHandlerAsyncHookHandler;
}>;

// ─── Classificação de erros → status HTTP + envelope público (OWASP API8 — #52) ──

const sendDomainError = (reply: FastifyReply, error: string): Promise<void> => {
  const requestId = currentCorrelationId() ?? reply.request.id;
  const status = writeErrorStatus(error);

  // 5xx não revela o componente interno (ex.: 'document-repository-failure', 'outbox-append-failed'):
  // envelope genérico ao cliente, code real apenas no log do servidor (espelha shared/http/reply.ts).
  if (status >= 500) {
    reply.request.log.error({ errorCode: error, status, requestId }, 'financial-domain-error-5xx');
    return reply
      .code(status)
      .send(
        toErrorEnvelope('internal', 'An internal error occurred', requestId),
      ) as unknown as Promise<void>;
  }

  // 4xx: o slug interno (mecanismo de concorrência, máquina de estados) NUNCA vaza no body —
  // code público estável + message PT-BR; o slug fica só no log (OWASP API8:2023).
  reply.request.log.debug({ errorCode: error, status, requestId }, 'financial-domain-error-4xx');
  return reply
    .code(status)
    .send(
      toErrorEnvelope(toPublicCode(error), toPublicMessage(error), requestId),
    ) as unknown as Promise<void>;
};

// ─── Helper: carrega stored document e serializa ──────────────────────────────

// Lê o estado pós-mutação do repositório e envia como DTO.
// `reply` já deve ter o status code correto definido pelo caller (200 ou 201).
const loadAndSerialize = async (
  deps: FinancialHttpDeps,
  reply: FastifyReply,
  rawId: string,
): Promise<void> => {
  const idR = DocumentId.rehydrate(rawId);
  if (!idR.ok) return sendDomainError(reply, 'document-id-invalid');

  const found = await deps.findDocumentById(idR.value);
  if (!found.ok) return sendDomainError(reply, found.error);

  return sendResult(
    reply,
    ok(documentToDto(found.value.document, found.value.payables, found.value.version)),
    { ok: reply.statusCode === 201 ? 201 : 200 },
  );
};

// ─── Mapeadores de body Zod → command (bridge undefined→null para exactOptionalPropertyTypes) ──

// Campos opcionais do Zod chegam como `string | undefined`; os commands do domínio tipam como
// `string | null` (exactOptionalPropertyTypes proíbe undefined onde não é explícito). A ponte
// `?? null` converte antes de passar ao use case.

const toRetentionInputs = (
  retentions: readonly {
    type: 'ISS' | 'IRRF' | 'INSS' | 'CSRF';
    baseCents: string;
    rateBps: number;
    valueCents: string;
  }[],
): RetentionInput[] =>
  retentions.map((r) => ({
    type: r.type,
    baseCents: Number(r.baseCents),
    rateBps: r.rateBps,
    valueCents: Number(r.valueCents),
  }));

const toRegisteredTaxInputs = (
  taxes: readonly {
    type: 'ICMS' | 'IPI' | 'PIS' | 'COFINS' | 'CBS' | 'IBS_Municipal' | 'IBS_Estadual';
    baseCents: string;
    rateBps: number;
    valueCents: string;
  }[],
): RegisteredTaxInput[] =>
  taxes.map((t) => ({
    type: t.type,
    baseCents: Number(t.baseCents),
    rateBps: t.rateBps,
    valueCents: Number(t.valueCents),
  }));

// ─── Rotas ───────────────────────────────────────────────────────────────────

const financialRoutes =
  (deps: FinancialHttpDeps, hooks: FinancialHttpHooks): FastifyPluginAsyncZodOpenApi =>
  async (scope) => {
    // POST /financial/documents — cria documento (Open ou Draft).
    scope.route({
      method: 'POST',
      url: '/financial/documents',
      preHandler: [hooks.requireAuth, hooks.authorize(FINANCIAL_PERMISSION.write)],
      schema: {
        body: createDocumentBodySchema,
        response: { 201: documentResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const body = req.body;

        if (body.asDraft) {
          // Rascunho — campos opcionais. `undefined` → `null` (exactOptionalPropertyTypes).
          const result = await deps.saveDraft({
            documentNumber: body.documentNumber,
            series: body.series ?? null,
            type: body.type,
            supplierRef: body.supplierRef,
            contractRef: body.contractRef ?? null,
            budgetPlanRef: body.budgetPlanRef ?? null,
            categoryRef: body.categoryRef ?? null,
            programRef: body.programRef ?? null,
            paymentMethod: body.paymentMethod,
            grossValueCents: Number(body.grossValueCents),
            sourceDiscountsCents: Number(body.sourceDiscountsCents),
            discountsCents: Number(body.discountsCents),
            penaltyCents: Number(body.penaltyCents),
            interestCents: Number(body.interestCents),
            retentions: toRetentionInputs(body.retentions),
            registeredTaxes: toRegisteredTaxInputs(body.registeredTaxes),
            dueDate: body.dueDate !== undefined ? new Date(body.dueDate) : null,
            description: body.description ?? null,
          });
          if (!result.ok) return sendDomainError(reply, result.error);
          const idStr = String(result.value.documentId);
          reply.header('location', `/api/v2/financial/documents/${idStr}`);
          reply.code(201);
          return loadAndSerialize(deps, reply, idStr);
        }

        // Open — dueDate obrigatória.
        if (body.dueDate === undefined) {
          return sendDomainError(reply, 'document-incomplete');
        }
        const result = await deps.saveDocument({
          documentNumber: body.documentNumber,
          series: body.series ?? null,
          type: body.type,
          supplierRef: body.supplierRef,
          contractRef: body.contractRef ?? null,
          budgetPlanRef: body.budgetPlanRef ?? null,
          categoryRef: body.categoryRef ?? null,
          programRef: body.programRef ?? null,
          paymentMethod: body.paymentMethod,
          grossValueCents: Number(body.grossValueCents),
          sourceDiscountsCents: Number(body.sourceDiscountsCents),
          discountsCents: Number(body.discountsCents),
          penaltyCents: Number(body.penaltyCents),
          interestCents: Number(body.interestCents),
          retentions: toRetentionInputs(body.retentions),
          registeredTaxes: toRegisteredTaxInputs(body.registeredTaxes),
          dueDate: new Date(body.dueDate),
          description: body.description ?? null,
        });
        if (!result.ok) return sendDomainError(reply, result.error);
        const idStr = String(result.value.documentId);
        reply.header('location', `/api/v2/financial/documents/${idStr}`);
        reply.code(201);
        return loadAndSerialize(deps, reply, idStr);
      },
    });

    // PATCH /financial/documents/:id — ajusta documento Open.
    scope.route({
      method: 'PATCH',
      url: '/financial/documents/:id',
      preHandler: [hooks.requireAuth, hooks.authorize(FINANCIAL_PERMISSION.write)],
      schema: {
        params: documentIdParamSchema,
        body: adjustDocumentBodySchema,
        response: { 200: documentResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const body = req.body;
        const result = await deps.adjustDocument({
          documentId: req.params.id,
          // Optimistic lock (FR-009): propaga `body.version` → `cmd.expectedVersion`.
          expectedVersion: body.version,
          ...(body.grossValueCents !== undefined
            ? { grossValueCents: Number(body.grossValueCents) }
            : {}),
          ...(body.sourceDiscountsCents !== undefined
            ? { sourceDiscountsCents: Number(body.sourceDiscountsCents) }
            : {}),
          ...(body.discountsCents !== undefined
            ? { discountsCents: Number(body.discountsCents) }
            : {}),
          ...(body.penaltyCents !== undefined ? { penaltyCents: Number(body.penaltyCents) } : {}),
          ...(body.interestCents !== undefined
            ? { interestCents: Number(body.interestCents) }
            : {}),
          ...(body.retentions !== undefined
            ? { retentions: toRetentionInputs(body.retentions) }
            : {}),
          ...(body.dueDate !== undefined ? { dueDate: new Date(body.dueDate) } : {}),
          ...(body.description !== undefined ? { description: body.description } : {}),
        });
        if (!result.ok) return sendDomainError(reply, result.error);
        return loadAndSerialize(deps, reply, req.params.id);
      },
    });

    // POST /financial/documents/:id/approve — Open → Approved.
    scope.route({
      method: 'POST',
      url: '/financial/documents/:id/approve',
      preHandler: [hooks.requireAuth, hooks.authorize(FINANCIAL_PERMISSION.payableApprove)],
      schema: {
        params: documentIdParamSchema,
        body: approveBodySchema,
        response: { 200: documentResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.approveDocument({
          documentId: req.params.id,
          approvedBy: req.userId,
          // Optimistic lock (FR-009): propaga `body.version` → `cmd.expectedVersion`.
          expectedVersion: req.body.version,
        });
        if (!result.ok) return sendDomainError(reply, result.error);
        return loadAndSerialize(deps, reply, req.params.id);
      },
    });

    // POST /financial/documents/:id/undo-approval — Approved → Open.
    scope.route({
      method: 'POST',
      url: '/financial/documents/:id/undo-approval',
      preHandler: [hooks.requireAuth, hooks.authorize(FINANCIAL_PERMISSION.payableApprove)],
      schema: {
        params: documentIdParamSchema,
        body: approveBodySchema,
        response: { 200: documentResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.undoApproval({
          documentId: req.params.id,
          // Optimistic lock (FR-009): propaga `body.version` → `cmd.expectedVersion`.
          expectedVersion: req.body.version,
        });
        if (!result.ok) return sendDomainError(reply, result.error);
        return loadAndSerialize(deps, reply, req.params.id);
      },
    });

    // DELETE /financial/documents/:id — cancela (só Open); hard delete. 204 sem corpo.
    scope.route({
      method: 'DELETE',
      url: '/financial/documents/:id',
      preHandler: [hooks.requireAuth, hooks.authorize(FINANCIAL_PERMISSION.cancel)],
      schema: {
        params: documentIdParamSchema,
        // 204 sem body → sem response schema (convenção das rotas 204 deste projeto).
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.cancelDocument({ documentId: req.params.id });
        if (!result.ok) return sendDomainError(reply, result.error);
        return reply.code(204).send() as unknown as Promise<void>;
      },
    });

    // GET /financial/documents — listagem paginada real (US1; read path no writer pool — ADR-0003).
    scope.route({
      method: 'GET',
      url: '/financial/documents',
      preHandler: [hooks.requireAuth, hooks.authorize(FINANCIAL_PERMISSION.read)],
      schema: {
        querystring: listDocumentsQuerySchema,
        response: { 200: documentListResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const q = req.query;
        const filter: DocumentListFilter = {
          ...(q.status !== undefined ? { status: q.status } : {}),
          ...(q.supplierRef !== undefined ? { supplierRef: q.supplierRef } : {}),
          ...(q.type !== undefined ? { type: q.type } : {}),
          ...(q.dueFrom !== undefined ? { dueFrom: new Date(q.dueFrom) } : {}),
          ...(q.dueTo !== undefined ? { dueTo: new Date(q.dueTo) } : {}),
        };
        const result = await deps.listDocuments(filter, q.page, q.pageSize);
        if (!result.ok) return sendDomainError(reply, result.error);
        return sendResult(
          reply,
          ok({
            items: result.value.items.map(listItemToSummaryDto),
            page: result.value.page,
            pageSize: result.value.pageSize,
            total: result.value.total,
          }),
          { ok: 200 },
        );
      },
    });

    // GET /financial/documents/:id — detalhe completo.
    scope.route({
      method: 'GET',
      url: '/financial/documents/:id',
      preHandler: [hooks.requireAuth, hooks.authorize(FINANCIAL_PERMISSION.read)],
      schema: {
        params: documentIdParamSchema,
        response: { 200: documentResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        return loadAndSerialize(deps, reply, req.params.id);
      },
    });

    // GET /financial/documents/:id/timeline — trilha por-campo (Time Travel, US2).
    scope.route({
      method: 'GET',
      url: '/financial/documents/:id/timeline',
      preHandler: [hooks.requireAuth, hooks.authorize(FINANCIAL_PERMISSION.read)],
      schema: {
        params: documentIdParamSchema,
        response: { 200: documentTimelineResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        // 1. Verificar existência do documento → 404 se não encontrado.
        const idR = DocumentId.rehydrate(req.params.id);
        if (!idR.ok) return sendDomainError(reply, 'document-id-invalid');

        const found = await deps.findDocumentById(idR.value);
        if (!found.ok) return sendDomainError(reply, found.error);

        // 2. Buscar trilha.
        const result = await deps.getDocumentTimeline({ documentId: req.params.id });
        if (!result.ok) return sendDomainError(reply, result.error);

        return sendResult(reply, ok(timelineToDto(result.value)), { ok: 200 });
      },
    });
  };

export const financialHttpPlugin =
  (deps: FinancialHttpDeps, hooks: FinancialHttpHooks): FastifyPluginAsync =>
  async (app) => {
    await app
      .withTypeProvider<FastifyZodOpenApiTypeProvider>()
      .register(financialRoutes(deps, hooks));
  };
