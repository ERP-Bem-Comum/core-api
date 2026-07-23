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
 *   PATCH  /financial/documents/:id/payables/:pid    fiscal-document:write  → updatePayableDueDate (#270)
 *   POST   /financial/documents/:id/approve          payable:approve        → approveDocument
 *   POST   /financial/documents/:id/undo-approval    payable:approve        → undoApproval
 *   DELETE /financial/documents/:id                  fiscal-document:cancel → cancelDocument (204)
 *   GET    /financial/documents                      fiscal-document:read   → listDocuments
 *   GET    /financial/documents/:id                  fiscal-document:read   → findDocumentById
 *   GET    /financial/dashboard/recent-payments      reference:read         → listRecentPaid (#239)
 *   POST   /financial/payables:batch                 fiscal-document:read   → getPayablesSummaryByIds (#357)
 *   POST   /financial/documents:batch                fiscal-document:read   → getDocumentsSummaryByIds (#358)
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
import * as CedenteAccountId from '../../domain/cedente/cedente-account-id.ts';
import type { CedenteAccount } from '../../domain/cedente/types.ts';
import { allMetadata } from '../../domain/document/document-type-metadata.ts';
import type { RetentionInput } from '../../domain/shared/retention.ts';
import type { RegisteredTaxInput } from '../../domain/shared/registered-tax.ts';
import { FINANCIAL_PERMISSION } from '../../public-api/permissions.ts';
import {
  documentToDto,
  listItemToSummaryDto,
  timelineToDto,
  statementTransactionsToDto,
  paidPayablesToDto,
  suggestionsToDto,
  counterpartSuggestionsToDto,
  accountStatementToDto,
  transactionReconciliationToDto,
  reconciliationPeriodsToDto,
  statementSuggestionsToDto,
  categoriesToDto,
  costCentersToDto,
  programsToDto,
  documentTypeMetadataToDto,
  recentPaymentsToDto,
  payableBatchItemToDto,
  documentBatchItemToDto,
} from './dto.ts';
import type { DocumentListFilter } from '../../domain/document/query.ts';
import type { PayableListFilter, PayableListItem } from '../../domain/payable/query.ts';
import type { FinancialHttpDeps } from './composition.ts';
import {
  createDocumentBodySchema,
  adjustDocumentBodySchema,
  bulkUpdateDueDateBodySchema,
  bulkUpdateDueDateResponseSchema,
  approveBodySchema,
  cancelDocumentBodySchema,
  documentIdParamSchema,
  documentPayableParamsSchema,
  manualPaymentBodySchema,
  updatePayableDueDateBodySchema,
  listDocumentsQuerySchema,
  documentResponseSchema,
  documentListResponseSchema,
  listPayablesQuerySchema,
  payableListResponseSchema,
  payableCountsQuerySchema,
  payableCountsResponseSchema,
  type PayableSummaryDto,
  payablesBatchBodySchema,
  payablesBatchResponseSchema,
  documentsBatchBodySchema,
  documentsBatchResponseSchema,
  documentTimelineResponseSchema,
  importBankStatementBodySchema,
  importBankStatementResponseSchema,
  bankStatementIdParamSchema,
  statementTransactionsResponseSchema,
  confirmReconciliationBodySchema,
  confirmReconciliationResponseSchema,
  reconciliationIdParamSchema,
  undoReconciliationBodySchema,
  undoReconciliationResponseSchema,
  paidPayablesQuerySchema,
  paidPayablesResponseSchema,
  statementTransactionIdParamSchema,
  suggestionsResponseSchema,
  counterpartSuggestionsResponseSchema,
  confirmCounterpartBodySchema,
  confirmCounterpartResponseSchema,
  rejectSuggestionBodySchema,
  rejectSuggestionResponseSchema,
  manualEntryBodySchema,
  manualEntryResponseSchema,
  batchBodySchema,
  batchResponseSchema,
  closePeriodBodySchema,
  closePeriodResponseSchema,
  reopenPeriodResponseSchema,
  reconciliationPeriodIdParamSchema,
  exportReconciliationQuerySchema,
  createCedenteAccountBodySchema,
  editCedenteAccountBodySchema,
  cedenteAccountIdParamSchema,
  cedenteAccountResponseSchema,
  cedenteAccountListResponseSchema,
  cedenteAccountListQuerySchema,
  categoryListResponseSchema,
  costCenterListResponseSchema,
  programListResponseSchema,
  documentTypeMetadataListResponseSchema,
  recentPaymentsResponseSchema,
  type CedenteAccountResponseDto,
  accountStatementQuerySchema,
  accountStatementResponseSchema,
  transactionReconciliationResponseSchema,
  reconciliationPeriodsQuerySchema,
  reconciliationPeriodsResponseSchema,
  statementSuggestionsResponseSchema,
  ingestDocumentQuerySchema,
  octetStreamIngestBody,
  ingestDocumentResponseSchema,
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
// `composePayee=true` resolve o bloco bancário do favorecido via ADR-0032 (só no GET /:id).
const loadAndSerialize = async (
  deps: FinancialHttpDeps,
  reply: FastifyReply,
  rawId: string,
  composePayee = false,
): Promise<void> => {
  const idR = DocumentId.rehydrate(rawId);
  if (!idR.ok) return sendDomainError(reply, 'document-id-invalid');

  const found = await deps.findDocumentById(idR.value);
  if (!found.ok) return sendDomainError(reply, found.error);

  const { document, payables, version } = found.value;
  const payeeBank = composePayee
    ? await deps.resolvePayeeBank({
        kind: document.payeeKind ?? null,
        id: document.supplier !== null ? String(document.supplier) : null,
      })
    : null;

  return sendResult(reply, ok(documentToDto(document, payables, version, payeeBank)), {
    ok: reply.statusCode === 201 ? 201 : 200,
  });
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

// Serializa a conta-cedente (019). Money em string (convenção); opcionais → null.
// #222: item da listagem payable-centric → DTO (centavos em string; data ISO).
const payableListItemToDto = (it: PayableListItem): PayableSummaryDto => ({
  payableId: it.payableId,
  documentId: it.documentId,
  documentNumber: it.documentNumber,
  series: it.series,
  documentType: it.documentType,
  kind: it.kind,
  retentionType: it.retentionType,
  valueCents: String(it.valueCents),
  dueDate: it.dueDate.toISOString().slice(0, 10), // #229: date-only (YYYY-MM-DD)
  status: it.status,
  supplierRef: it.supplierRef,
  contractRef: it.contractRef,
  issueDate: it.issueDate === null ? null : it.issueDate.toISOString().slice(0, 10),
  paymentMethod: it.paymentMethod,
  version: it.version,
  grossValueCents: it.grossValueCents === null ? null : String(it.grossValueCents),
  netValueCents: it.netValueCents === null ? null : String(it.netValueCents),
  paidAt: it.paidAt === null ? null : it.paidAt.toISOString().slice(0, 10),
});

const cedenteAccountToDto = (a: CedenteAccount): CedenteAccountResponseDto => ({
  id: String(a.id),
  bankCode: a.bankCode,
  bankName: a.bankName ?? null,
  type: a.type ?? null,
  typeLabel: a.typeLabel ?? null,
  agency: a.agency,
  accountNumber: a.accountNumber,
  accountDigit: a.accountDigit,
  convenio: a.convenio,
  document: a.document,
  status: a.status,
  nickname: a.nickname ?? null,
  openingBalanceCents: a.openingBalanceCents !== undefined ? String(a.openingBalanceCents) : null,
  openingBalanceDate: a.openingBalanceDate ?? null,
});

// #62: upload seguro da ingestão (portado de contracts/http/plugin.ts:125-167). bodyLimit por rota
// (não vaza o global de 1 MiB); magic-bytes contra mimeType mentido; sanitização anti header-injection.
const MAX_INGEST_BYTES = 20 * 1024 * 1024; // 20 MiB
const PDF_MAGIC = Buffer.from('%PDF');
const XML_MIMES: ReadonlySet<string> = new Set(['text/xml', 'application/xml']);
// Sniff de conteúdo vs mimeType declarado (M2, CWE-434): PDF começa com `%PDF`; XML, com `<` (após
// BOM/whitespace). Bloqueia upload de blob arbitrário com Content-Type mentido.
const magicBytesMatch = (mimeType: string, bytes: Buffer): boolean => {
  if (mimeType === 'application/pdf') return bytes.subarray(0, 4).equals(PDF_MAGIC);
  if (XML_MIMES.has(mimeType)) {
    let i = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? 3 : 0; // pula BOM UTF-8
    while (i < bytes.length) {
      const b = bytes[i];
      if (b !== 0x20 && b !== 0x09 && b !== 0x0a && b !== 0x0d) break; // pula whitespace
      i += 1;
    }
    return bytes[i] === 0x3c; // '<'
  }
  return true;
};
// eslint-disable-next-line no-control-regex
const FILENAME_UNSAFE = /["\\\r\n\x00-\x1F\x7F]/g;
const sanitizeFilename = (name: string): string => {
  const cleaned = name.replace(FILENAME_UNSAFE, '_').trim();
  return cleaned.length > 0 ? cleaned : 'document';
};

// ─── Rotas ───────────────────────────────────────────────────────────────────

const financialRoutes =
  (deps: FinancialHttpDeps, hooks: FinancialHttpHooks): FastifyPluginAsyncZodOpenApi =>
  async (scope) => {
    // #62 (M1): parser + rota de ingest ISOLADOS num sub-scope — o parser octet-stream (bodyLimit
    // 20 MiB) fica encapsulado aqui e NÃO vaza para as demais rotas de /financial. Sem isolamento, o
    // Parsing (que ocorre ANTES do preHandler no lifecycle do Fastify) alocaria 20 MiB pré-auth em
    // qualquer POST /financial/* com Content-Type: application/octet-stream.
    await scope.register(async (ingestScope: typeof scope) => {
      ingestScope.addContentTypeParser(
        'application/octet-stream',
        { parseAs: 'buffer', bodyLimit: MAX_INGEST_BYTES },
        (_req, body, done) => {
          done(null, body);
        },
      );

      // #62: POST /financial/documents/ingest — lê o PDF/XML, guarda o comprovante-fonte, cria
      // rascunho pré-preenchido (humano confere/submete). Upload seguro: magic-bytes + mime allowlist + auth.
      ingestScope.route({
        method: 'POST',
        url: '/financial/documents/ingest',
        preHandler: [hooks.requireAuth, hooks.authorize(FINANCIAL_PERMISSION.write)],
        schema: {
          querystring: ingestDocumentQuerySchema,
          body: octetStreamIngestBody(),
          response: { 201: ingestDocumentResponseSchema },
        } satisfies FastifyZodOpenApiSchema,
        handler: async (req, reply) => {
          const bytes = req.body as unknown as Buffer;
          const q = req.query;
          if (!magicBytesMatch(q.mimeType, bytes)) {
            return sendDomainError(reply, 'document-magic-bytes-mismatch');
          }
          const result = await deps.ingestDocument({
            bytes, // Buffer é Uint8Array — sem cópia extra (m2)
            fileName: sanitizeFilename(q.fileName),
            mimeType: q.mimeType,
            uploadedBy: req.userId,
          });
          if (!result.ok) return sendDomainError(reply, result.error);
          return reply.code(201).send({
            documentId: String(result.value.documentId),
            resolvedVia: result.value.resolvedVia,
          }) as unknown as Promise<void>;
        },
      });
    });

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
            documentNumber: body.documentNumber ?? null,
            series: body.series ?? null,
            type: body.type ?? null,
            supplierRef: body.supplierRef ?? null,
            ...(body.payeeKind !== undefined ? { payeeKind: body.payeeKind } : {}),
            approverRef: body.approverRef ?? null,
            contractRef: body.contractRef ?? null,
            budgetPlanRef: body.budgetPlanRef ?? null,
            categoryRef: body.categoryRef ?? null,
            subcategoryRef: body.subcategoryRef ?? null,
            costCenterRef: body.costCenterRef ?? null,
            programRef: body.programRef ?? null,
            paymentMethod: body.paymentMethod ?? null,
            grossValueCents:
              body.grossValueCents !== undefined ? Number(body.grossValueCents) : null,
            sourceDiscountsCents: Number(body.sourceDiscountsCents),
            discountsCents: Number(body.discountsCents),
            penaltyCents: Number(body.penaltyCents),
            interestCents: Number(body.interestCents),
            retentions: toRetentionInputs(body.retentions),
            registeredTaxes: toRegisteredTaxInputs(body.registeredTaxes),
            dueDate: body.dueDate !== undefined ? new Date(body.dueDate) : null,
            issueDate: body.issueDate !== undefined ? new Date(body.issueDate) : null,
            description: body.description ?? null,
            accessKey: body.accessKey ?? null,
            competencia: body.competencia ?? null,
            contaDebitoRef: body.contaDebitoRef ?? null,
            paymentDetail: body.paymentDetail ?? null,
          });
          if (!result.ok) return sendDomainError(reply, result.error);
          const idStr = String(result.value.documentId);
          reply.header('location', `/api/v2/financial/documents/${idStr}`);
          reply.code(201);
          return loadAndSerialize(deps, reply, idStr);
        }

        // Open — dueDate + os 5 campos do #534 obrigatórios (o superRefine já garante o 400; este
        // guard estreita os opcionais do tipo para o saveDocument sem non-null assertion).
        if (
          body.dueDate === undefined ||
          body.type === undefined ||
          body.documentNumber === undefined ||
          body.supplierRef === undefined ||
          body.paymentMethod === undefined ||
          body.grossValueCents === undefined
        ) {
          return sendDomainError(reply, 'document-incomplete');
        }
        const result = await deps.saveDocument({
          documentNumber: body.documentNumber,
          series: body.series ?? null,
          type: body.type,
          supplierRef: body.supplierRef,
          ...(body.payeeKind !== undefined ? { payeeKind: body.payeeKind } : {}),
          approverRef: body.approverRef ?? null,
          contractRef: body.contractRef ?? null,
          budgetPlanRef: body.budgetPlanRef ?? null,
          categoryRef: body.categoryRef ?? null,
          subcategoryRef: body.subcategoryRef ?? null,
          costCenterRef: body.costCenterRef ?? null,
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
          issueDate: body.issueDate !== undefined ? new Date(body.issueDate) : null,
          description: body.description ?? null,
          accessKey: body.accessKey ?? null,
          competencia: body.competencia ?? null,
          contaDebitoRef: body.contaDebitoRef ?? null,
          paymentDetail: body.paymentDetail ?? null,
        });
        if (!result.ok) return sendDomainError(reply, result.error);
        const idStr = String(result.value.documentId);
        reply.header('location', `/api/v2/financial/documents/${idStr}`);
        reply.code(201);
        return loadAndSerialize(deps, reply, idStr);
      },
    });

    // PATCH /financial/documents/due-date — alteração de vencimento em LOTE (#162).
    // Rota ESTÁTICA: no find-my-way precede `/:id` (não é sombreada pelo parametrico).
    // Falha PARCIAL por item — sempre 200 com o mapa de resultados; 400 só p/ payload inválido.
    scope.route({
      method: 'PATCH',
      url: '/financial/documents/due-date',
      preHandler: [hooks.requireAuth, hooks.authorize(FINANCIAL_PERMISSION.write)],
      schema: {
        body: bulkUpdateDueDateBodySchema,
        response: { 200: bulkUpdateDueDateResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const body = req.body;
        const result = await deps.bulkUpdateDueDate({
          items: body.items.map((i) => ({ documentId: i.id, expectedVersion: i.version })),
          dueDate: new Date(body.dueDate),
        });
        if (!result.ok) return sendDomainError(reply, result.error);
        return sendResult(reply, ok({ results: result.value }), { ok: 200 });
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
          // #273 US2: null apaga; undefined preserva (exactOptionalPropertyTypes).
          ...(body.paymentDetail !== undefined ? { paymentDetail: body.paymentDetail } : {}),
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

    // POST /financial/documents/:id/payables/:payableId/manual-payment — baixa manual de UM título
    // (Aprovado→Pago, por título — #201/#219). RBAC payable:approve; actor = usuário autenticado.
    scope.route({
      method: 'POST',
      url: '/financial/documents/:id/payables/:payableId/manual-payment',
      preHandler: [hooks.requireAuth, hooks.authorize(FINANCIAL_PERMISSION.payableApprove)],
      schema: {
        params: documentPayableParamsSchema,
        body: manualPaymentBodySchema,
        response: { 200: documentResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.registerManualPayment({
          documentId: req.params.id,
          payableId: req.params.payableId,
          paidBy: req.userId,
          // Optimistic lock (FR-009): propaga `body.version` → `cmd.expectedVersion`.
          expectedVersion: req.body.version,
          // #232: data de pagamento informada pelo operador (ancora o match da conciliação).
          ...(req.body.paidAt !== undefined ? { paidAt: req.body.paidAt } : {}),
          ...(req.body.reason !== undefined ? { reason: req.body.reason } : {}),
        });
        if (!result.ok) return sendDomainError(reply, result.error);
        return loadAndSerialize(deps, reply, req.params.id);
      },
    });

    // PATCH /financial/documents/:id/payables/:payableId — vencimento de UM título isolado (#270).
    // Não propaga ao documento-pai nem aos irmãos (contrasta com PATCH /documents/:id → editMetadata).
    scope.route({
      method: 'PATCH',
      url: '/financial/documents/:id/payables/:payableId',
      preHandler: [hooks.requireAuth, hooks.authorize(FINANCIAL_PERMISSION.write)],
      schema: {
        params: documentPayableParamsSchema,
        body: updatePayableDueDateBodySchema,
        response: { 200: documentResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.updatePayableDueDate({
          documentId: req.params.id,
          payableId: req.params.payableId,
          // Optimistic lock (FR-009): propaga `body.version` → `cmd.expectedVersion`.
          expectedVersion: req.body.version,
          dueDate: new Date(req.body.dueDate),
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

    // POST /financial/documents/:id/submit — finaliza rascunho (Draft → Open) (#91).
    scope.route({
      method: 'POST',
      url: '/financial/documents/:id/submit',
      preHandler: [hooks.requireAuth, hooks.authorize(FINANCIAL_PERMISSION.write)],
      schema: {
        params: documentIdParamSchema,
        response: { 200: documentResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.submitDraft({ documentId: req.params.id });
        if (!result.ok) return sendDomainError(reply, result.error);
        return loadAndSerialize(deps, reply, req.params.id);
      },
    });

    // DELETE /financial/documents/:id — cancela (só Open); hard delete. 204 sem corpo.
    // Exige `version` no body (optimistic lock — #55/FR-009): versão defasada → 409.
    scope.route({
      method: 'DELETE',
      url: '/financial/documents/:id',
      preHandler: [hooks.requireAuth, hooks.authorize(FINANCIAL_PERMISSION.cancel)],
      schema: {
        params: documentIdParamSchema,
        body: cancelDocumentBodySchema,
        // 204 sem body → sem response schema (convenção das rotas 204 deste projeto).
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.cancelDocument({
          documentId: req.params.id,
          expectedVersion: req.body.version,
        });
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
        // #164: type/supplierRef aceitam single (retrocompat) ou lista → normaliza para o campo certo.
        const supplierFilter = Array.isArray(q.supplierRef)
          ? { supplierRefs: q.supplierRef }
          : q.supplierRef !== undefined
            ? { supplierRef: q.supplierRef }
            : {};
        const typeFilter = Array.isArray(q.type)
          ? { types: q.type }
          : q.type !== undefined
            ? { type: q.type }
            : {};
        const filter: DocumentListFilter = {
          ...(q.status !== undefined ? { status: q.status } : {}),
          ...supplierFilter,
          ...typeFilter,
          ...(q.dueFrom !== undefined ? { dueFrom: new Date(q.dueFrom) } : {}),
          ...(q.dueTo !== undefined ? { dueTo: new Date(q.dueTo) } : {}),
          ...(q.issuedFrom !== undefined ? { issuedFrom: new Date(q.issuedFrom) } : {}),
          ...(q.issuedTo !== undefined ? { issuedTo: new Date(q.issuedTo) } : {}),
          ...(q.q !== undefined ? { q: q.q } : {}), // #167: busca textual (já trimada pelo schema)
          ...(q.contractRef !== undefined ? { contractRef: q.contractRef } : {}),
          ...(q.programRef !== undefined ? { programRef: q.programRef } : {}),
          ...(q.valorMin !== undefined ? { valorMin: q.valorMin } : {}),
          ...(q.valorMax !== undefined ? { valorMax: q.valorMax } : {}),
          ...(q.sort !== undefined ? { sort: q.sort } : {}),
          ...(q.order !== undefined ? { order: q.order } : {}),
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

    // GET /financial/payable-titles/counts — contagem agregada por status (#536). 1 request no lugar
    // de ~6 (chips do grid). Rota estática — precede a lista `/payable-titles` (sem conflito no find-my-way).
    scope.route({
      method: 'GET',
      url: '/financial/payable-titles/counts',
      preHandler: [hooks.requireAuth, hooks.authorize(FINANCIAL_PERMISSION.read)],
      schema: {
        querystring: payableCountsQuerySchema,
        response: { 200: payableCountsResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const q = req.query;
        // Filtro dos TÍTULOS (sem `status` — queremos o breakdown completo).
        const payableFilter: PayableListFilter = {
          ...(q.documentType !== undefined ? { documentType: q.documentType } : {}),
          ...(q.supplierRef !== undefined ? { supplierRef: q.supplierRef } : {}),
          ...(q.dueFrom !== undefined ? { dueFrom: new Date(q.dueFrom) } : {}),
          ...(q.dueTo !== undefined ? { dueTo: new Date(q.dueTo) } : {}),
        };
        const counts = await deps.countPayableTitles(payableFilter);
        if (!counts.ok) return sendDomainError(reply, counts.error);

        // Rascunho (Draft) vive na tabela de documentos (sem título) — reusa a listagem com pageSize 1
        // só para o `total`, aplicando os mesmos filtros da lista.
        const draftFilter: DocumentListFilter = {
          status: 'Draft',
          ...(q.supplierRef !== undefined ? { supplierRef: q.supplierRef } : {}),
          ...(q.documentType !== undefined ? { type: q.documentType } : {}),
          ...(q.dueFrom !== undefined ? { dueFrom: new Date(q.dueFrom) } : {}),
          ...(q.dueTo !== undefined ? { dueTo: new Date(q.dueTo) } : {}),
        };
        const drafts = await deps.listDocuments(draftFilter, 1, 1);
        if (!drafts.ok) return sendDomainError(reply, drafts.error);

        return sendResult(
          reply,
          ok({
            total: counts.value.total,
            draft: drafts.value.total,
            byStatus: counts.value.byStatus,
          }),
          { ok: 200 },
        );
      },
    });

    // GET /financial/payable-titles — listagem payable-centric (#201/#222): pai + filhos como linhas
    // pagáveis (status próprio por título). Distinta da busca de conciliação GET /payables?status=Paid.
    scope.route({
      method: 'GET',
      url: '/financial/payable-titles',
      preHandler: [hooks.requireAuth, hooks.authorize(FINANCIAL_PERMISSION.read)],
      schema: {
        querystring: listPayablesQuerySchema,
        response: { 200: payableListResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const q = req.query;
        const filter: PayableListFilter = {
          ...(q.status !== undefined ? { status: q.status } : {}),
          ...(q.documentType !== undefined ? { documentType: q.documentType } : {}),
          ...(q.supplierRef !== undefined ? { supplierRef: q.supplierRef } : {}),
          ...(q.dueFrom !== undefined ? { dueFrom: new Date(q.dueFrom) } : {}),
          ...(q.dueTo !== undefined ? { dueTo: new Date(q.dueTo) } : {}),
        };
        const result = await deps.listPayables(filter, q.page, q.pageSize);
        if (!result.ok) return sendDomainError(reply, result.error);
        return sendResult(
          reply,
          ok({
            items: result.value.items.map(payableListItemToDto),
            page: result.value.page,
            pageSize: result.value.pageSize,
            total: result.value.total,
          }),
          { ok: 200 },
        );
      },
    });

    // POST /financial/payables:batch — resolve payableId[] em lote (#357, ADR-0049). Custom method
    // AIP-136: find-my-way trata ':' como início de parâmetro, então `/payables:batch` cru capturaria
    // qualquer `/payables*` (ex.: POST /payablesXYZ → 200). A regex `^:batch$` fixa o literal e devolve
    // 404 p/ paths irmãos fora do custom method (ver 000-request.md §Decisão de roteamento). Declarada
    // como rota estática, antes de eventuais `/:id` irmãs.
    scope.route({
      method: 'POST',
      url: '/financial/payables:action(^:batch$)',
      preHandler: [hooks.requireAuth, hooks.authorize(FINANCIAL_PERMISSION.read)],
      schema: {
        body: payablesBatchBodySchema,
        response: { 200: payablesBatchResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const { refs } = req.body;
        const result = await deps.getPayablesSummaryByIds(refs);
        if (!result.ok) return sendDomainError(reply, result.error);
        const rows = result.value;
        const found = new Set(rows.map((r) => r.payableId));
        const missing = refs.filter((ref) => !found.has(ref));
        return sendResult(reply, ok({ items: rows.map(payableBatchItemToDto), missing }), {
          ok: 200,
        });
      },
    });

    // POST /financial/documents:batch — resolve documentId[] em lote (#358, ADR-0049). Custom method
    // AIP-136: mesma técnica do payables:batch — a regex `^:batch$` fixa o literal e devolve 404 p/
    // paths irmãos (ex.: POST /documentsXYZ). Declarada como rota estática, antes da `/:id` irmã.
    scope.route({
      method: 'POST',
      url: '/financial/documents:action(^:batch$)',
      preHandler: [hooks.requireAuth, hooks.authorize(FINANCIAL_PERMISSION.read)],
      schema: {
        body: documentsBatchBodySchema,
        response: { 200: documentsBatchResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const { refs } = req.body;
        const result = await deps.getDocumentsSummaryByIds(refs);
        if (!result.ok) return sendDomainError(reply, result.error);
        const rows = result.value;
        const found = new Set(rows.map((r) => r.documentId));
        const missing = refs.filter((ref) => !found.has(ref));
        return sendResult(reply, ok({ items: rows.map(documentBatchItemToDto), missing }), {
          ok: 200,
        });
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
        return loadAndSerialize(deps, reply, req.params.id, true);
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

    // POST /financial/bank-statements — importa extrato OFX/CSV (US1 conciliação).
    scope.route({
      method: 'POST',
      url: '/financial/bank-statements',
      preHandler: [hooks.requireAuth, hooks.authorize(FINANCIAL_PERMISSION.reconciliationImport)],
      schema: {
        body: importBankStatementBodySchema,
        response: { 201: importBankStatementResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const body = req.body;
        const result = await deps.importBankStatement({
          debitAccountRef: body.debitAccountRef,
          format: body.format,
          content: body.content,
          ...(body.fileName !== undefined ? { fileName: body.fileName } : {}),
        });
        if (!result.ok) return sendDomainError(reply, result.error);
        return sendResult(
          reply,
          ok({
            statementId: String(result.value.statementId),
            imported: result.value.imported,
            duplicatesDiscarded: result.value.discardedDuplicates,
            period: {
              start: result.value.period.start.toISOString(),
              end: result.value.period.end.toISOString(),
            },
          }),
          { ok: 201 },
        );
      },
    });

    // GET /financial/bank-statements/:id/transactions — transações do extrato importado.
    scope.route({
      method: 'GET',
      url: '/financial/bank-statements/:id/transactions',
      preHandler: [hooks.requireAuth, hooks.authorize(FINANCIAL_PERMISSION.reconciliationRead)],
      schema: {
        params: bankStatementIdParamSchema,
        response: { 200: statementTransactionsResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.listStatementTransactions(req.params.id);
        if (!result.ok) return sendDomainError(reply, result.error);
        if (result.value === null) return sendDomainError(reply, 'bank-statement-not-found');
        return sendResult(reply, ok(statementTransactionsToDto(result.value)), { ok: 200 });
      },
    });

    // GET /financial/bank-statements/:id/suggestions — palpite de topo por transação (#174, lote).
    scope.route({
      method: 'GET',
      url: '/financial/bank-statements/:id/suggestions',
      preHandler: [hooks.requireAuth, hooks.authorize(FINANCIAL_PERMISSION.reconciliationRead)],
      schema: {
        params: bankStatementIdParamSchema,
        response: { 200: statementSuggestionsResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.getStatementSuggestions({ statementId: req.params.id });
        if (!result.ok) return sendDomainError(reply, result.error);
        return sendResult(reply, ok(statementSuggestionsToDto(result.value)), { ok: 200 });
      },
    });

    // POST /financial/reconciliations — concilia transação↔título(s) (US2/US4). Nunca automático (R1).
    scope.route({
      method: 'POST',
      url: '/financial/reconciliations',
      preHandler: [hooks.requireAuth, hooks.authorize(FINANCIAL_PERMISSION.reconciliationWrite)],
      schema: {
        body: confirmReconciliationBodySchema,
        response: { 201: confirmReconciliationResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const body = req.body;
        // exactOptionalPropertyTypes: monta a diferença omitindo chaves opcionais ausentes (não
        // pode passar `categoryRef: undefined`). Mantém valueCents/treatment e só inclui o que veio.
        const difference =
          body.difference !== undefined
            ? {
                valueCents: body.difference.valueCents,
                treatment: body.difference.treatment,
                ...(body.difference.categoryRef !== undefined
                  ? { categoryRef: body.difference.categoryRef }
                  : {}),
                ...(body.difference.costCenterRef !== undefined
                  ? { costCenterRef: body.difference.costCenterRef }
                  : {}),
                ...(body.difference.note !== undefined ? { note: body.difference.note } : {}),
              }
            : undefined;
        const result = await deps.confirmReconciliation({
          transactionId: body.transactionId,
          payableIds: body.payableIds,
          ...(difference !== undefined ? { difference } : {}),
          ...(body.allocations !== undefined ? { allocations: body.allocations } : {}),
          reconciledBy: req.userId,
        });
        if (!result.ok) return sendDomainError(reply, result.error);
        return sendResult(
          reply,
          ok({
            reconciliationId: String(result.value.reconciliationId),
            type: result.value.type,
            itemCount: result.value.itemCount,
          }),
          { ok: 201 },
        );
      },
    });

    // POST /financial/reconciliations/:id/undo — desfaz a conciliação (US3, R7).
    scope.route({
      method: 'POST',
      url: '/financial/reconciliations/:id/undo',
      preHandler: [hooks.requireAuth, hooks.authorize(FINANCIAL_PERMISSION.reconciliationWrite)],
      schema: {
        params: reconciliationIdParamSchema,
        body: undoReconciliationBodySchema,
        response: { 200: undoReconciliationResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.undoReconciliation({
          reconciliationId: req.params.id,
          undoneBy: req.userId,
          ...(req.body.reason !== undefined ? { reason: req.body.reason } : {}),
        });
        if (!result.ok) return sendDomainError(reply, result.error);
        return sendResult(
          reply,
          ok({
            reconciliationId: String(result.value.reconciliationId),
            status: result.value.status,
          }),
          { ok: 200 },
        );
      },
    });

    // GET /financial/payables?status=Paid — títulos disponíveis para conciliar (US2).
    scope.route({
      method: 'GET',
      url: '/financial/payables',
      preHandler: [hooks.requireAuth, hooks.authorize(FINANCIAL_PERMISSION.reconciliationRead)],
      schema: {
        querystring: paidPayablesQuerySchema,
        response: { 200: paidPayablesResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (_req, reply) => {
        const result = await deps.searchPaidPayables({});
        if (!result.ok) return sendDomainError(reply, result.error);
        return sendResult(reply, ok(paidPayablesToDto(result.value)), { ok: 200 });
      },
    });

    // GET /financial/statement-transactions/:id/suggestions — sugestões de match (US2, read; R1).
    scope.route({
      method: 'GET',
      url: '/financial/statement-transactions/:id/suggestions',
      preHandler: [hooks.requireAuth, hooks.authorize(FINANCIAL_PERMISSION.reconciliationRead)],
      schema: {
        params: statementTransactionIdParamSchema,
        response: { 200: suggestionsResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.suggestMatches(req.params.id);
        if (!result.ok) return sendDomainError(reply, result.error);
        return sendResult(reply, ok(suggestionsToDto(result.value)), { ok: 200 });
      },
    });

    // GET /financial/statement-transactions/:id/counterpart-suggestions — casa a transação real de B
    // com a contrapartida esperada da transferência (#269/US2, read; R1).
    scope.route({
      method: 'GET',
      url: '/financial/statement-transactions/:id/counterpart-suggestions',
      preHandler: [hooks.requireAuth, hooks.authorize(FINANCIAL_PERMISSION.reconciliationRead)],
      schema: {
        params: statementTransactionIdParamSchema,
        response: { 200: counterpartSuggestionsResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.suggestCounterpartMatches(req.params.id);
        if (!result.ok) return sendDomainError(reply, result.error);
        return sendResult(reply, ok(counterpartSuggestionsToDto(result.value)), { ok: 200 });
      },
    });

    // POST /financial/reconciliations/counterpart — confirma o casamento transação×contrapartida:
    // concilia a perna de B (ManualEntry Transfer) e consome a contrapartida (#269/US2).
    scope.route({
      method: 'POST',
      url: '/financial/reconciliations/counterpart',
      preHandler: [hooks.requireAuth, hooks.authorize(FINANCIAL_PERMISSION.reconciliationWrite)],
      schema: {
        body: confirmCounterpartBodySchema,
        response: { 201: confirmCounterpartResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.confirmCounterpartMatch({
          transactionId: req.body.transactionId,
          counterpartId: req.body.counterpartId,
          reconciledBy: req.userId,
        });
        if (!result.ok) return sendDomainError(reply, result.error);
        return sendResult(
          reply,
          ok({
            reconciliationId: String(result.value.reconciliationId),
            counterpartId: result.value.counterpartId,
          }),
          { ok: 201 },
        );
      },
    });

    // GET /financial/statement-transactions/:id/reconciliation — conciliação ativa da transação (#175).
    // Destrava o "Desfazer" pós-reload (id p/ POST /reconciliations/:id/undo) + modal de detalhes.
    scope.route({
      method: 'GET',
      url: '/financial/statement-transactions/:id/reconciliation',
      preHandler: [hooks.requireAuth, hooks.authorize(FINANCIAL_PERMISSION.reconciliationRead)],
      schema: {
        params: statementTransactionIdParamSchema,
        response: { 200: transactionReconciliationResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.getTransactionReconciliation({ transactionId: req.params.id });
        if (!result.ok) return sendDomainError(reply, result.error);
        // #207: compõe o nome do executor server-side (ADR-0032). Graceful → null.
        const reconciledByName = await deps.resolveUserName(result.value.audit.reconciledBy);
        return sendResult(
          reply,
          ok(transactionReconciliationToDto(result.value, reconciledByName)),
          { ok: 200 },
        );
      },
    });

    // POST /financial/statement-transactions/:id/reject-suggestion — rejeita sugestão (US2).
    scope.route({
      method: 'POST',
      url: '/financial/statement-transactions/:id/reject-suggestion',
      preHandler: [hooks.requireAuth, hooks.authorize(FINANCIAL_PERMISSION.reconciliationWrite)],
      schema: {
        params: statementTransactionIdParamSchema,
        body: rejectSuggestionBodySchema,
        response: { 200: rejectSuggestionResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.rejectSuggestion({
          transactionId: req.params.id,
          payableId: req.body.payableId,
          rejectedBy: req.userId,
        });
        if (!result.ok) return sendDomainError(reply, result.error);
        return sendResult(reply, ok(result.value), { ok: 200 });
      },
    });

    // POST /financial/statement-transactions/:id/manual-entry — lançamento manual (US5; transação sem título).
    scope.route({
      method: 'POST',
      url: '/financial/statement-transactions/:id/manual-entry',
      preHandler: [hooks.requireAuth, hooks.authorize(FINANCIAL_PERMISSION.reconciliationWrite)],
      schema: {
        params: statementTransactionIdParamSchema,
        body: manualEntryBodySchema,
        response: { 201: manualEntryResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const body = req.body;
        const result = await deps.recordManualEntry({
          transactionId: req.params.id,
          type: body.type,
          ...(body.supplierRef !== undefined ? { supplierRef: body.supplierRef } : {}),
          ...(body.budgetPlanRef !== undefined ? { budgetPlanRef: body.budgetPlanRef } : {}),
          ...(body.subcategoryRef !== undefined ? { subcategoryRef: body.subcategoryRef } : {}),
          ...(body.categoryRef !== undefined ? { categoryRef: body.categoryRef } : {}),
          ...(body.costCenterRef !== undefined ? { costCenterRef: body.costCenterRef } : {}),
          ...(body.programRef !== undefined ? { programRef: body.programRef } : {}),
          ...(body.description !== undefined ? { description: body.description } : {}),
          ...(body.destinationAccountRef !== undefined
            ? { destinationAccountRef: body.destinationAccountRef }
            : {}),
          ...(body.productLabel !== undefined ? { productLabel: body.productLabel } : {}),
          reconciledBy: req.userId,
        });
        if (!result.ok) return sendDomainError(reply, result.error);
        return sendResult(
          reply,
          ok({
            reconciliationId: String(result.value.reconciliationId),
            type: 'ManualEntry' as const,
            manualEntryId: String(result.value.manualEntryId),
            // #502/S2: ecoa o carimbo de taxonomia recebido (opaco; null quando ausente — back-compat).
            budgetPlanRef: body.budgetPlanRef ?? null,
            subcategoryRef: body.subcategoryRef ?? null,
          }),
          { ok: 201 },
        );
      },
    });

    // POST /financial/reconciliations/batch — conciliação em lote (US5; N transações × 1 template).
    scope.route({
      method: 'POST',
      url: '/financial/reconciliations/batch',
      preHandler: [hooks.requireAuth, hooks.authorize(FINANCIAL_PERMISSION.reconciliationWrite)],
      schema: {
        body: batchBodySchema,
        response: { 201: batchResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const body = req.body;
        const t = body.template;
        const result = await deps.confirmBatch({
          transactionIds: body.transactionIds,
          // Bridge undefined→omitido (exactOptionalPropertyTypes vs Zod .optional()).
          template: {
            type: t.type,
            ...(t.supplierRef !== undefined ? { supplierRef: t.supplierRef } : {}),
            ...(t.categoryRef !== undefined ? { categoryRef: t.categoryRef } : {}),
            ...(t.costCenterRef !== undefined ? { costCenterRef: t.costCenterRef } : {}),
            ...(t.programRef !== undefined ? { programRef: t.programRef } : {}),
            ...(t.description !== undefined ? { description: t.description } : {}),
          },
          reconciledBy: req.userId,
        });
        if (!result.ok) return sendDomainError(reply, result.error);
        return sendResult(
          reply,
          ok({
            created: result.value.created,
            reconciliationIds: result.value.reconciliationIds.map((id) => String(id)),
            // Code público estável por transação falha (não vaza o slug interno — OWASP API8).
            failed: result.value.failed.map((f) => ({
              transactionId: f.transactionId,
              error: toPublicCode(f.error),
            })),
          }),
          { ok: 201 },
        );
      },
    });

    // GET /financial/reconciliation-periods?debitAccountRef=... — lista períodos da conta (#173).
    scope.route({
      method: 'GET',
      url: '/financial/reconciliation-periods',
      preHandler: [hooks.requireAuth, hooks.authorize(FINANCIAL_PERMISSION.reconciliationRead)],
      schema: {
        querystring: reconciliationPeriodsQuerySchema,
        response: { 200: reconciliationPeriodsResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.listReconciliationPeriods({
          debitAccountRef: req.query.debitAccountRef,
        });
        if (!result.ok) return sendDomainError(reply, result.error);
        // #207: resolve o nome de cada closer distinto server-side (ADR-0032). Graceful → null.
        const closerIds = [
          ...new Set(result.value.flatMap((p) => (p.closedBy !== null ? [p.closedBy] : []))),
        ];
        const names = new Map<string, string | null>(
          await Promise.all(
            closerIds.map(
              async (id): Promise<readonly [string, string | null]> => [
                id,
                await deps.resolveUserName(id),
              ],
            ),
          ),
        );
        return sendResult(reply, ok(reconciliationPeriodsToDto(result.value, names)), { ok: 200 });
      },
    });

    // POST /financial/reconciliation-periods/close — fecha o período (US6, FR-013).
    scope.route({
      method: 'POST',
      url: '/financial/reconciliation-periods/close',
      preHandler: [hooks.requireAuth, hooks.authorize(FINANCIAL_PERMISSION.reconciliationClose)],
      schema: {
        body: closePeriodBodySchema,
        response: { 200: closePeriodResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const body = req.body;
        const result = await deps.closeReconciliationPeriod({
          debitAccountRef: body.debitAccountRef,
          periodStart: new Date(body.periodStart),
          periodEnd: new Date(body.periodEnd),
          closedBy: req.userId,
        });
        if (!result.ok) return sendDomainError(reply, result.error);
        return sendResult(
          reply,
          ok({ periodId: String(result.value.periodId), status: result.value.status }),
          { ok: 200 },
        );
      },
    });

    // POST /financial/reconciliation-periods/:id/reopen — reabre o período (#203, Closed → Open).
    scope.route({
      method: 'POST',
      url: '/financial/reconciliation-periods/:id/reopen',
      preHandler: [hooks.requireAuth, hooks.authorize(FINANCIAL_PERMISSION.reconciliationClose)],
      schema: {
        params: reconciliationPeriodIdParamSchema,
        response: { 200: reopenPeriodResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.reopenReconciliationPeriod({
          periodId: req.params.id,
          reopenedBy: req.userId,
        });
        if (!result.ok) return sendDomainError(reply, result.error);
        return sendResult(
          reply,
          ok({ periodId: String(result.value.periodId), status: result.value.status }),
          { ok: 200 },
        );
      },
    });

    // GET /financial/reconciliation-periods/:id/export?format=ofx|csv|csv-nibo — exporta a conciliação (US6 + #146).
    scope.route({
      method: 'GET',
      url: '/financial/reconciliation-periods/:id/export',
      preHandler: [hooks.requireAuth, hooks.authorize(FINANCIAL_PERMISSION.reconciliationRead)],
      schema: {
        params: reconciliationPeriodIdParamSchema,
        querystring: exportReconciliationQuerySchema,
        // Resposta é arquivo texto (OFX/CSV) — sem response schema JSON (convenção das rotas não-JSON).
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const { format } = req.query;
        if (format === 'csv-nibo') {
          const result = await deps.exportReconciliationNibo({ periodId: req.params.id });
          if (!result.ok) return sendDomainError(reply, result.error);
          return reply
            .code(200)
            .header('content-type', 'text/csv; charset=utf-8')
            .send(result.value.content) as unknown as Promise<void>;
        }
        // format narrowed to 'ofx' | 'csv' após o branch csv-nibo acima.
        const result = await deps.exportReconciliation({
          periodId: req.params.id,
          format,
        });
        if (!result.ok) return sendDomainError(reply, result.error);
        const contentType = result.value.format === 'csv' ? 'text/csv' : 'application/x-ofx';
        return reply
          .code(200)
          .header('content-type', `${contentType}; charset=utf-8`)
          .send(result.value.content) as unknown as Promise<void>;
      },
    });

    // ─── Conta-cedente (019 — CRUD + encerrar) ─────────────────────────────────
    // POST /financial/cedente-accounts — cria conta (bank-account:write).
    scope.route({
      method: 'POST',
      url: '/financial/cedente-accounts',
      preHandler: [hooks.requireAuth, hooks.authorize(FINANCIAL_PERMISSION.bankAccountWrite)],
      schema: {
        body: createCedenteAccountBodySchema,
        response: { 201: cedenteAccountResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const b = req.body;
        const result = await deps.createCedenteAccount({
          bankCode: b.bankCode,
          type: b.type,
          agency: b.agency,
          accountNumber: b.accountNumber,
          accountDigit: b.accountDigit,
          document: b.document,
          ...(b.typeLabel !== undefined ? { typeLabel: b.typeLabel } : {}),
          ...(b.bankName !== undefined ? { bankName: b.bankName } : {}),
          ...(b.convenio !== undefined ? { convenio: b.convenio } : {}),
          ...(b.nickname !== undefined ? { nickname: b.nickname } : {}),
          ...(b.openingBalanceCents !== undefined
            ? { openingBalanceCents: Number(b.openingBalanceCents) }
            : {}),
          ...(b.openingBalanceDate !== undefined
            ? { openingBalanceDate: b.openingBalanceDate }
            : {}),
        });
        if (!result.ok) return sendDomainError(reply, result.error);
        reply.header('location', `/api/v2/financial/cedente-accounts/${String(result.value.id)}`);
        return sendResult(reply, ok(cedenteAccountToDto(result.value)), { ok: 201 });
      },
    });

    // GET /financial/categories — dados de referência de categorização (020 · US1, reference:read).
    scope.route({
      method: 'GET',
      url: '/financial/categories',
      preHandler: [hooks.requireAuth, hooks.authorize(FINANCIAL_PERMISSION.referenceRead)],
      schema: {
        response: { 200: categoryListResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (_req, reply) => {
        const result = await deps.listCategories();
        if (!result.ok) return sendDomainError(reply, result.error);
        return sendResult(reply, ok(categoriesToDto(result.value)), { ok: 200 });
      },
    });

    // GET /financial/cost-centers — dados de referência de rateio (020 · US2, reference:read).
    scope.route({
      method: 'GET',
      url: '/financial/cost-centers',
      preHandler: [hooks.requireAuth, hooks.authorize(FINANCIAL_PERMISSION.referenceRead)],
      schema: {
        response: { 200: costCenterListResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (_req, reply) => {
        const result = await deps.listCostCenters();
        if (!result.ok) return sendDomainError(reply, result.error);
        return sendResult(reply, ok(costCentersToDto(result.value)), { ok: 200 });
      },
    });

    // GET /financial/programs — passthrough da fonte canônica de programa (020 · US3, reference:read).
    scope.route({
      method: 'GET',
      url: '/financial/programs',
      preHandler: [hooks.requireAuth, hooks.authorize(FINANCIAL_PERMISSION.referenceRead)],
      schema: {
        response: { 200: programListResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (_req, reply) => {
        const result = await deps.listPrograms();
        if (!result.ok) return sendDomainError(reply, result.error);
        return sendResult(reply, ok(programsToDto(result.value)), { ok: 200 });
      },
    });

    // GET /financial/document-types/metadata — catálogo estático por tipo de documento (#292,
    // reference:read). Domínio PURO (sem I/O): não usa `deps`/port, só `allMetadata()`.
    scope.route({
      method: 'GET',
      url: '/financial/document-types/metadata',
      preHandler: [hooks.requireAuth, hooks.authorize(FINANCIAL_PERMISSION.referenceRead)],
      schema: {
        response: { 200: documentTypeMetadataListResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (_req, reply) => {
        return sendResult(reply, ok(documentTypeMetadataToDto(allMetadata())), { ok: 200 });
      },
    });

    // GET /financial/dashboard/recent-payments — widget "Últimos pagamentos" (#239, reference:read).
    // Top-5 títulos Pagos, ordenados por data de pagamento (paidAt) desc. Read-model `fin_payable_view`
    // (#235/ADR-0022) alimentado assincronamente pelo worker payable-view-projection.
    scope.route({
      method: 'GET',
      url: '/financial/dashboard/recent-payments',
      preHandler: [hooks.requireAuth, hooks.authorize(FINANCIAL_PERMISSION.referenceRead)],
      schema: {
        response: { 200: recentPaymentsResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (_req, reply) => {
        const result = await deps.listRecentPaid(5);
        if (!result.ok) return sendDomainError(reply, result.error);
        return sendResult(reply, ok(recentPaymentsToDto(result.value)), { ok: 200 });
      },
    });

    // GET /financial/cedente-accounts — lista (bank-account:read).
    scope.route({
      method: 'GET',
      url: '/financial/cedente-accounts',
      preHandler: [hooks.requireAuth, hooks.authorize(FINANCIAL_PERMISSION.bankAccountRead)],
      schema: {
        querystring: cedenteAccountListQuerySchema,
        response: { 200: cedenteAccountListResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        // #89c F1: saldo atual (abertura + Σ extratos) por conta junto da listagem.
        // #293: `?status=active` filtra contas encerradas para o seletor "Pagar da Conta".
        const result = await deps.listCedenteAccountsWithBalance({
          onlyActive: req.query.status === 'active',
        });
        if (!result.ok) return sendDomainError(reply, result.error);
        return sendResult(
          reply,
          ok(
            result.value.map((a) => ({
              ...cedenteAccountToDto(a.account),
              currentBalanceCents: String(a.currentBalanceCents),
            })),
          ),
          { ok: 200 },
        );
      },
    });

    // GET /financial/cedente-accounts/:id — consulta por id (bank-account:read).
    scope.route({
      method: 'GET',
      url: '/financial/cedente-accounts/:id',
      preHandler: [hooks.requireAuth, hooks.authorize(FINANCIAL_PERMISSION.bankAccountRead)],
      schema: {
        params: cedenteAccountIdParamSchema,
        response: { 200: cedenteAccountResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const idR = CedenteAccountId.rehydrate(req.params.id);
        if (!idR.ok) return sendDomainError(reply, idR.error);
        const result = await deps.findCedenteAccountById(idR.value);
        if (!result.ok) return sendDomainError(reply, result.error);
        if (result.value === null) return sendDomainError(reply, 'cedente-account-not-found');
        return sendResult(reply, ok(cedenteAccountToDto(result.value)), { ok: 200 });
      },
    });

    // GET /financial/cedente-accounts/:id/statement — read-model do extrato por período (#139).
    // `to` é estendido ao fim do dia (UTC) para incluir todo o dia final do intervalo.
    scope.route({
      method: 'GET',
      url: '/financial/cedente-accounts/:id/statement',
      preHandler: [hooks.requireAuth, hooks.authorize(FINANCIAL_PERMISSION.reconciliationRead)],
      schema: {
        params: cedenteAccountIdParamSchema,
        querystring: accountStatementQuerySchema,
        response: { 200: accountStatementResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.getAccountStatement({
          accountId: req.params.id,
          from: new Date(`${req.query.from}T00:00:00.000Z`),
          to: new Date(`${req.query.to}T23:59:59.999Z`),
          ...(req.query.filter !== undefined ? { filter: req.query.filter } : {}),
        });
        if (!result.ok) return sendDomainError(reply, result.error);
        return sendResult(reply, ok(accountStatementToDto(result.value)), { ok: 200 });
      },
    });

    // PATCH /financial/cedente-accounts/:id — edita (bank-account:write; FR-008 trava dados bancários).
    scope.route({
      method: 'PATCH',
      url: '/financial/cedente-accounts/:id',
      preHandler: [hooks.requireAuth, hooks.authorize(FINANCIAL_PERMISSION.bankAccountWrite)],
      schema: {
        params: cedenteAccountIdParamSchema,
        body: editCedenteAccountBodySchema,
        response: { 200: cedenteAccountResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const b = req.body;
        const result = await deps.editCedenteAccount({
          id: req.params.id,
          ...(b.bankCode !== undefined ? { bankCode: b.bankCode } : {}),
          ...(b.agency !== undefined ? { agency: b.agency } : {}),
          ...(b.accountNumber !== undefined ? { accountNumber: b.accountNumber } : {}),
          ...(b.accountDigit !== undefined ? { accountDigit: b.accountDigit } : {}),
          ...(b.type !== undefined ? { type: b.type } : {}),
          ...(b.typeLabel !== undefined ? { typeLabel: b.typeLabel } : {}),
          ...(b.nickname !== undefined ? { nickname: b.nickname } : {}),
          ...(b.bankName !== undefined ? { bankName: b.bankName } : {}),
        });
        if (!result.ok) return sendDomainError(reply, result.error);
        return sendResult(reply, ok(cedenteAccountToDto(result.value)), { ok: 200 });
      },
    });

    // POST /financial/cedente-accounts/:id/close — encerra (bank-account:write).
    scope.route({
      method: 'POST',
      url: '/financial/cedente-accounts/:id/close',
      preHandler: [hooks.requireAuth, hooks.authorize(FINANCIAL_PERMISSION.bankAccountWrite)],
      schema: {
        params: cedenteAccountIdParamSchema,
        response: { 200: cedenteAccountResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.closeCedenteAccount({ id: req.params.id });
        if (!result.ok) return sendDomainError(reply, result.error);
        return sendResult(reply, ok(cedenteAccountToDto(result.value)), { ok: 200 });
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
