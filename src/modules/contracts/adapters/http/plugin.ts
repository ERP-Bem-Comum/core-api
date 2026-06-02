/**
 * Plugin HTTP do módulo contracts (ADR-0024/0025/0026/0028).
 *
 * Factory `(deps, { requireAuth, authorize }) => FastifyPluginAsync`: recebe os use cases
 * já instanciados (composition.ts) + os hooks do módulo auth, injetados pelo composition
 * root (`server.ts`). Cross-módulo via `auth/public-api/http.ts` (ADR-0006).
 * Encapsula `/contracts`; o root registra sob `/api/v2` → `/api/v2/contracts/*`.
 *
 * Reads (C0/C1): `authorize('contract:read')`. Writes (C2): `authorize('contract:write')`.
 * Mapeamento erro→HTTP (SPEC C2 §3): 400 Zod (validator) · 404 not-found · 409 conflito de
 * estado/transição/unicidade · 422 invariante semântica · 503 repo indisponível.
 * Zod contract-first (ADR-0027).
 */

import type { FastifyPluginAsync, FastifyReply, preHandlerAsyncHookHandler } from 'fastify';
import type {
  FastifyPluginAsyncZodOpenApi,
  FastifyZodOpenApiSchema,
  FastifyZodOpenApiTypeProvider,
} from 'fastify-zod-openapi';

import { ok, err } from '#src/shared/primitives/result.ts';
import { sendResult } from '#src/shared/http/reply.ts';
import { toErrorEnvelope } from '#src/shared/http/errors.ts';
import { currentCorrelationId } from '#src/shared/observability/correlation.ts';

import type { ContractsHttpDeps } from './composition.ts';
import { contractToListItem, contractToDetailDto } from './contract-dto.ts';
import { timelineEntryToDto } from './timeline-dto.ts';
import { amendmentToDto } from './amendment-dto.ts';
import { documentToDto } from './document-dto.ts';
import { contractsToCsv } from './contracts-csv.ts';
import { CONTRACT_PERMISSION } from '../../public-api/permissions.ts';
import {
  contractListPagedSchema,
  contractListQuerySchema,
  contractDetailSchema,
  contractFullDetailSchema,
  contractIdParamSchema,
  timelineSchema,
  createContractBodySchema,
  activateContractBodySchema,
  endContractBodySchema,
  createAmendmentBodySchema,
  homologateBodySchema,
  amendmentParamSchema,
  amendmentSchema,
  uploadDocumentQuerySchema,
  supersedeDocumentBodySchema,
  documentParamSchema,
  documentSchema,
  octetStreamUploadBody,
  csvResponse,
} from './schemas.ts';

export type ContractsHttpHooks = Readonly<{
  requireAuth: preHandlerAsyncHookHandler;
  /** Fábrica de preHandler RBAC por nome de permissão (auth/public-api). */
  authorize: (permissionName: string) => preHandlerAsyncHookHandler;
}>;

// Os error unions misturam string literals e tagged records `{tag,...}`
// (CTR-DOMAIN-TAGGED-ERRORS); a borda HTTP precisa de um code string para o envelope.
const toErrorCode = (e: string | Readonly<{ tag: string }>): string =>
  typeof e === 'string' ? e : e.tag;

// Conflito de estado/transição/unicidade → 409. `ContractNotActive` é tag de ContractError.
const CONFLICT_CODES: ReadonlySet<string> = new Set([
  'contract-sequential-number-duplicated',
  'contract-not-pending',
  'amendment-contract-mismatch',
  'activate-contract-no-signed-document',
  'amendment-retroactive-to-contract-start',
  'ContractNotActive',
  'contract-repo-conflict',
  'amendment-repo-conflict',
  // C3 — documentos
  'document-already-deleted',
  'document-already-superseded',
  'document-contract-mismatch',
]);
const NOT_FOUND_CODES: ReadonlySet<string> = new Set([
  'contract-not-found',
  'amendment-not-found',
  // C3 — documentos
  'parent-not-found',
  'signed-document-not-found',
  'document-not-found',
  'supersede-target-not-found',
  'storage-not-found',
]);
const REPO_UNAVAILABLE_CODES: ReadonlySet<string> = new Set([
  'contract-repo-unavailable',
  'amendment-repo-unavailable',
  'document-repository-unavailable',
  'storage-unavailable',
]);
// Falha de storage atribuível ao backend de objeto (não ao cliente) → 502.
const STORAGE_BAD_GATEWAY_CODES: ReadonlySet<string> = new Set([
  'storage-upload-failed',
  'storage-permission-denied',
]);

// Classifica o code do domínio em status HTTP. Default 422 (invariante semântica) —
// nunca 500 para erro de negócio (SPEC §3). ATENÇÃO: um `*-repo-*`/`storage-*` novo que não
// seja adicionado aos Sets cairá no default 422 — ao introduzir código, atualizar os Sets.
const writeErrorStatus = (code: string): number => {
  if (NOT_FOUND_CODES.has(code)) return 404;
  if (CONFLICT_CODES.has(code)) return 409;
  if (REPO_UNAVAILABLE_CODES.has(code)) return 503;
  if (STORAGE_BAD_GATEWAY_CODES.has(code)) return 502;
  return 422;
};

// Upload (C3 D1): limite por rota (octet-stream), maior que o global de 1 MiB sem vazá-lo.
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MiB

// Magic-bytes: defesa em profundidade contra mimeType mentido (security-backend MUST).
const PDF_MAGIC = Buffer.from('%PDF');
const magicBytesMatch = (mimeType: string, bytes: Buffer): boolean => {
  if (mimeType === 'application/pdf') return bytes.subarray(0, 4).equals(PDF_MAGIC);
  return true; // mimeTypes fora da allowlist já são barrados pelo Zod (400) antes daqui
};

const sendDomainError = (
  reply: FastifyReply,
  error: string | Readonly<{ tag: string }>,
): Promise<void> => {
  const code = toErrorCode(error);
  const requestId = currentCorrelationId() ?? reply.request.id;
  return reply
    .code(writeErrorStatus(code))
    .send(toErrorEnvelope(code, code, requestId)) as unknown as Promise<void>;
};

const contractsRoutes =
  (deps: ContractsHttpDeps, hooks: ContractsHttpHooks): FastifyPluginAsyncZodOpenApi =>
  async (scope) => {
    // Parser binário das rotas de upload (C3 D1): corpo opaco → `Buffer`. `bodyLimit` por
    // parser preserva o global de 1 MiB nas demais rotas (CA8). Só `application/octet-stream`.
    scope.addContentTypeParser(
      'application/octet-stream',
      { parseAs: 'buffer', bodyLimit: MAX_UPLOAD_BYTES },
      (_req, body, done) => {
        done(null, body);
      },
    );

    // ─── Reads (C0/C1) ───────────────────────────────────────────────────────
    scope.route({
      method: 'GET',
      url: '/contracts',
      preHandler: hooks.requireAuth,
      schema: {
        querystring: contractListQuerySchema,
        response: { 200: contractListPagedSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        // Query já validada/coerced pelo Zod (page≥1, limit com teto, order/status enum).
        const q = req.query;
        const result = await deps.listContracts({
          page: q.page,
          limit: q.limit,
          order: q.order,
          ...(q.search !== undefined ? { search: q.search } : {}),
          ...(q.status !== undefined ? { status: q.status } : {}),
        });
        if (!result.ok) {
          return sendResult(reply, err(toErrorCode(result.error)), {
            errors: { 'contract-repo-unavailable': 503 },
          });
        }
        return sendResult(
          reply,
          ok({
            items: result.value.items.map(contractToListItem),
            meta: result.value.meta,
          }),
          { ok: 200 },
        );
      },
    });

    // Export CSV (C4) — rota estática (vence `/:id`, find-my-way). Resposta text/csv (não-JSON).
    scope.route({
      method: 'GET',
      url: '/contracts/export.csv',
      preHandler: [hooks.requireAuth, hooks.authorize(CONTRACT_PERMISSION.read)],
      schema: {
        response: { 200: csvResponse() },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (_req, reply) => {
        // CSV exporta TODOS os contratos (sem filtro/paginação) — reusa list() direto.
        const result = await deps.listAllContracts();
        if (!result.ok) {
          return sendResult(reply, err(toErrorCode(result.error)), {
            errors: { 'contract-repo-unavailable': 503 },
          });
        }
        return reply
          .code(200)
          .header('content-disposition', 'attachment; filename="contracts.csv"')
          .type('text/csv; charset=utf-8')
          .send(contractsToCsv(result.value)) as unknown as Promise<void>;
      },
    });

    // Detalhe enriquecido (ADR-0032): compõe Contract + Amendment[] + Document[] na borda
    // (rota de leitura composta transitória até o BFF v2 assumir). O list-item de
    // GET /contracts permanece enxuto.
    scope.route({
      method: 'GET',
      url: '/contracts/:id',
      preHandler: [hooks.requireAuth, hooks.authorize(CONTRACT_PERMISSION.read)],
      schema: {
        params: contractIdParamSchema,
        response: { 200: contractFullDetailSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.getContractDetail({ contractId: req.params.id });
        if (!result.ok) {
          return sendResult(reply, err(toErrorCode(result.error)), {
            errors: {
              'contract-not-found': 404,
              'contract-repo-unavailable': 503,
              'amendment-repo-unavailable': 503,
              'document-repository-unavailable': 503,
            },
          });
        }
        return sendResult(reply, ok(contractToDetailDto(result.value)), { ok: 200 });
      },
    });

    scope.route({
      method: 'GET',
      url: '/contracts/:id/history',
      preHandler: [hooks.requireAuth, hooks.authorize(CONTRACT_PERMISSION.read)],
      schema: {
        params: contractIdParamSchema,
        response: { 200: timelineSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        // 404 se o contrato não existe: a timeline devolve `[]` para id desconhecido
        // (read-model), então a existência é checada via `getContract`.
        const exists = await deps.getContract({ contractId: req.params.id });
        if (!exists.ok) {
          return sendResult(reply, err(toErrorCode(exists.error)), {
            errors: { 'contract-not-found': 404, 'contract-repo-unavailable': 503 },
          });
        }
        const result = await deps.getContractTimeline({ contractId: req.params.id });
        if (!result.ok) {
          return sendResult(reply, err(toErrorCode(result.error)), {
            errors: { 'timeline-repo-unavailable': 503 },
          });
        }
        return sendResult(reply, ok(result.value.map(timelineEntryToDto)), { ok: 200 });
      },
    });

    // ─── Writes (C2) ───────────────────────────────────────────────────────────
    scope.route({
      method: 'POST',
      url: '/contracts',
      preHandler: [hooks.requireAuth, hooks.authorize(CONTRACT_PERMISSION.write)],
      schema: {
        body: createContractBodySchema,
        response: { 201: contractDetailSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const body = req.body;
        if (body.mode === 'Pending') {
          const result = await deps.createPendingContract({
            sequentialNumber: body.sequentialNumber,
            title: body.title,
            objective: body.objective,
            originalValueCents: body.originalValueCents,
            periodStart: body.periodStart,
            periodEnd: body.periodEnd,
          });
          if (!result.ok) return sendDomainError(reply, result.error);
          return sendResult(reply, ok(contractToListItem(result.value.contract)), { ok: 201 });
        }
        // O body usa `periodStart`/`periodEnd` (API uniforme entre Pending|Active); o
        // `CreateContractCommand` os nomeia `originalPeriodStart`/`originalPeriodEnd`.
        const result = await deps.createContract({
          sequentialNumber: body.sequentialNumber,
          title: body.title,
          objective: body.objective,
          signedAt: body.signedAt,
          originalValueCents: body.originalValueCents,
          originalPeriodStart: body.periodStart,
          originalPeriodEnd: body.periodEnd,
        });
        if (!result.ok) return sendDomainError(reply, result.error);
        return sendResult(reply, ok(contractToListItem(result.value.contract)), { ok: 201 });
      },
    });

    scope.route({
      method: 'POST',
      url: '/contracts/:id/activate',
      preHandler: [hooks.requireAuth, hooks.authorize(CONTRACT_PERMISSION.write)],
      schema: {
        params: contractIdParamSchema,
        body: activateContractBodySchema,
        response: { 200: contractDetailSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.activateContract({
          contractId: req.params.id,
          signedAt: req.body.signedAt,
        });
        if (!result.ok) return sendDomainError(reply, result.error);
        return sendResult(reply, ok(contractToListItem(result.value.contract)), { ok: 200 });
      },
    });

    // Encerramento (UC-07): `Expire` (chegada da data fim) ou `Terminate` (distrato).
    scope.route({
      method: 'POST',
      url: '/contracts/:id/end',
      preHandler: [hooks.requireAuth, hooks.authorize(CONTRACT_PERMISSION.write)],
      schema: {
        params: contractIdParamSchema,
        body: endContractBodySchema,
        response: { 200: contractDetailSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.endContract({
          contractId: req.params.id,
          kind: req.body.kind,
        });
        if (!result.ok) return sendDomainError(reply, result.error);
        return sendResult(reply, ok(contractToListItem(result.value.contract)), { ok: 200 });
      },
    });

    scope.route({
      method: 'POST',
      url: '/contracts/:id/amendments',
      preHandler: [hooks.requireAuth, hooks.authorize(CONTRACT_PERMISSION.write)],
      schema: {
        params: contractIdParamSchema,
        body: createAmendmentBodySchema,
        response: { 201: amendmentSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const body = req.body;
        const base = {
          contractId: req.params.id,
          amendmentNumber: body.amendmentNumber,
          description: body.description,
        };
        const command =
          body.kind === 'TermChange'
            ? { ...base, kind: body.kind, newEndDate: body.newEndDate }
            : body.kind === 'Misc'
              ? { ...base, kind: body.kind }
              : { ...base, kind: body.kind, impactValueCents: body.impactValueCents };
        const result = await deps.createAmendment(command);
        if (!result.ok) return sendDomainError(reply, result.error);
        return sendResult(reply, ok(amendmentToDto(result.value.amendment)), { ok: 201 });
      },
    });

    scope.route({
      method: 'POST',
      url: '/contracts/:id/amendments/:amendmentId/homologate',
      preHandler: [hooks.requireAuth, hooks.authorize(CONTRACT_PERMISSION.write)],
      schema: {
        params: amendmentParamSchema,
        body: homologateBodySchema,
        response: { 200: contractDetailSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.homologateAmendment({
          amendmentId: req.params.amendmentId,
          contractId: req.params.id,
          homologatedBy: req.body.homologatedBy,
        });
        if (!result.ok) return sendDomainError(reply, result.error);
        return sendResult(reply, ok(contractToListItem(result.value.contract)), { ok: 200 });
      },
    });

    // ─── Documents (C3) ──────────────────────────────────────────────────────
    // E1: upload de documento do contrato (raw octet-stream; metadados na query).
    scope.route({
      method: 'POST',
      url: '/contracts/:id/documents',
      preHandler: [hooks.requireAuth, hooks.authorize(CONTRACT_PERMISSION.write)],
      schema: {
        params: contractIdParamSchema,
        querystring: uploadDocumentQuerySchema,
        body: octetStreamUploadBody(),
        response: { 201: documentSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        // O schema OpenAPI declara o corpo como `string/binary` (doc), mas o
        // `addContentTypeParser('application/octet-stream', { parseAs:'buffer' })` entrega
        // um `Buffer` em runtime — daí o cast via `unknown` (corpo opaco, D1 do C3).
        const bytes = req.body as unknown as Buffer;
        const q = req.query;
        if (!magicBytesMatch(q.mimeType, bytes)) {
          return sendDomainError(reply, 'document-magic-bytes-mismatch');
        }
        const result = await deps.uploadDocument({
          parentType: 'Contract',
          parentId: req.params.id,
          categoria: q.categoria,
          fileName: q.fileName,
          mimeType: q.mimeType,
          bytes: new Uint8Array(bytes),
          signedElectronically: q.signedElectronically,
          uploadedBy: req.userId,
          retentionUntil: null,
          bucket: deps.documentBucket,
          storageKeyPrefix: deps.documentKeyPrefix,
        });
        if (!result.ok) return sendDomainError(reply, result.error);
        return sendResult(reply, ok(documentToDto(result.value.document)), { ok: 201 });
      },
    });

    // E2: upload + attach atômico do documento ao aditivo (destrava homologate, C2).
    scope.route({
      method: 'POST',
      url: '/contracts/:id/amendments/:amendmentId/documents',
      preHandler: [hooks.requireAuth, hooks.authorize(CONTRACT_PERMISSION.write)],
      schema: {
        params: amendmentParamSchema,
        querystring: uploadDocumentQuerySchema,
        body: octetStreamUploadBody(),
        response: { 201: documentSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const bytes = req.body as unknown as Buffer; // ver E1: corpo opaco octet-stream → Buffer
        const q = req.query;
        if (!magicBytesMatch(q.mimeType, bytes)) {
          return sendDomainError(reply, 'document-magic-bytes-mismatch');
        }
        // Ownership/IDOR: o aditivo deve pertencer ao contrato do path (BOLA).
        const amendment = await deps.getAmendment(req.params.amendmentId);
        if (!amendment.ok) return sendDomainError(reply, amendment.error);
        if (amendment.value === null) return sendDomainError(reply, 'amendment-not-found');
        if (String(amendment.value.contractId) !== req.params.id) {
          return sendDomainError(reply, 'amendment-contract-mismatch');
        }
        const uploaded = await deps.uploadDocument({
          parentType: 'Amendment',
          parentId: req.params.amendmentId,
          categoria: q.categoria,
          fileName: q.fileName,
          mimeType: q.mimeType,
          bytes: new Uint8Array(bytes),
          signedElectronically: q.signedElectronically,
          uploadedBy: req.userId,
          retentionUntil: null,
          bucket: deps.documentBucket,
          storageKeyPrefix: deps.documentKeyPrefix,
        });
        if (!uploaded.ok) return sendDomainError(reply, uploaded.error);
        const attached = await deps.attachSignedDocument({
          amendmentId: req.params.amendmentId,
          signedDocumentRef: uploaded.value.document.id,
        });
        if (!attached.ok) return sendDomainError(reply, attached.error);
        return sendResult(reply, ok(documentToDto(uploaded.value.document)), { ok: 201 });
      },
    });

    // E3: supersede de documento Active por uma nova versão.
    scope.route({
      method: 'POST',
      url: '/contracts/:id/documents/:documentId/supersede',
      preHandler: [hooks.requireAuth, hooks.authorize(CONTRACT_PERMISSION.write)],
      schema: {
        params: documentParamSchema,
        body: supersedeDocumentBodySchema,
        response: { 200: documentSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        // Ownership: o documento do path deve pertencer ao contrato `:id` — diretamente
        // (parentType Contract) ou via aditivo daquele contrato (parentType Amendment).
        const doc = await deps.getDocument(req.params.documentId);
        if (!doc.ok) return sendDomainError(reply, doc.error);
        if (doc.value === null) return sendDomainError(reply, 'document-not-found');
        if (doc.value.parentType === 'Amendment') {
          const amendment = await deps.getAmendment(String(doc.value.parentId));
          if (!amendment.ok) return sendDomainError(reply, amendment.error);
          if (amendment.value === null) return sendDomainError(reply, 'amendment-not-found');
          if (String(amendment.value.contractId) !== req.params.id) {
            return sendDomainError(reply, 'document-contract-mismatch');
          }
        } else if (String(doc.value.parentId) !== req.params.id) {
          return sendDomainError(reply, 'document-contract-mismatch');
        }
        const result = await deps.supersedeDocument({
          documentId: req.params.documentId,
          supersededByDocumentId: req.body.supersededByDocumentId,
          supersededBy: req.userId,
        });
        if (!result.ok) return sendDomainError(reply, result.error);
        return sendResult(reply, ok(documentToDto(result.value.document)), { ok: 200 });
      },
    });
  };

export const contractsHttpPlugin =
  (deps: ContractsHttpDeps, hooks: ContractsHttpHooks): FastifyPluginAsync =>
  async (app) => {
    // Rotas com path completo `/contracts` (sem sub-prefixo): o root (`buildApp`) monta
    // sob `/api/v2` → `/api/v2/contracts*` (path REST canônico, que é o que o OpenAPI
    // documenta). `register` ainda encapsula o escopo.
    await app
      .withTypeProvider<FastifyZodOpenApiTypeProvider>()
      .register(contractsRoutes(deps, hooks));
  };
