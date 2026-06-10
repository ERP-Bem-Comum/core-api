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
import { programBlockFromSnapshots } from './program-composition.ts';
import type { ContractMetadataPatch } from '../../application/use-cases/update-contract-metadata.ts';
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
  patchContractMetadataBodySchema,
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
  amendmentDocumentUploadQuerySchema,
  supersedeDocumentBodySchema,
  deleteDocumentBodySchema,
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
  // ADR-0039: cancelar contrato não-Pendente → 409 (tag do ContractError).
  'ContractNotPending',
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
  // Ownership: documento de outro contrato → 404 fail-closed (não vaza existência).
  'document-not-owned',
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

// Sanitiza o nome do arquivo para o header `Content-Disposition`: remove aspas e
// caracteres de controle (CR/LF) que permitiriam header injection / quebra do
// header. Mantém o restante do nome original (UX: download com nome reconhecível).
// eslint-disable-next-line no-control-regex
const FILENAME_UNSAFE = /["\\\r\n\x00-\x1F\x7F]/g;
const sanitizeFilename = (name: string): string => {
  const cleaned = name.replace(FILENAME_UNSAFE, '_').trim();
  return cleaned.length > 0 ? cleaned : 'document.pdf';
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

    // CTR-NUMBER-PROGRAM: list-item com o bloco `program` composto na borda (single). Usado
    // pelas respostas de escrita (POST/activate/end/homologate/cancel) — a listagem usa o batch.
    const listItemWithProgram = async (
      contract: Parameters<typeof contractToListItem>[0],
    ): Promise<ReturnType<typeof contractToListItem>> =>
      contractToListItem(contract, await deps.getProgramBlock(contract.programId));

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
        // CTR-NUMBER-PROGRAM: compõe o bloco `program` de cada item em BATCH (uma chamada ao
        // ProgramReadPort por página, sem N+1). `programId` null/programa indisponível → snapshot null.
        const { items } = result.value;
        const snapshots = await deps.getProgramSnapshots(items.map((c) => c.programId));
        return sendResult(
          reply,
          ok({
            items: items.map((c) =>
              contractToListItem(c, programBlockFromSnapshots(c.programId, snapshots)),
            ),
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
        // ADR-0032: rota gorda transitória — compõe o contratado na borda e declara
        // a transitoriedade via Deprecation/Sunset (RFC 8594). Sai quando o BFF v2 assumir.
        const contractor = await deps.getContractorBlock(result.value.contract.contractor);
        const program = await deps.getProgramBlock(result.value.contract.programId);
        reply.header('Deprecation', 'true');
        reply.header('Sunset', 'quando o BFF v2 assumir a composição do contratado');
        return sendResult(reply, ok(contractToDetailDto(result.value, contractor, program)), {
          ok: 200,
        });
      },
    });

    // US-002: PATCH de metadados de cadastro (title/objective/observations/email/telephone).
    // Valor/período/datas/sequentialNumber são imutáveis → barrados pelo body `.strict()` (400),
    // nunca chegam ao domínio. Modelo RBAC puro: inexistente → 404 (sem ownership por tenant).
    // Resposta = detalhe composto (mesma forma do GET), refletindo os metadados atualizados.
    scope.route({
      method: 'PATCH',
      url: '/contracts/:id',
      preHandler: [hooks.requireAuth, hooks.authorize(CONTRACT_PERMISSION.write)],
      schema: {
        params: contractIdParamSchema,
        body: patchContractMetadataBodySchema,
        response: { 200: contractFullDetailSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const updated = await deps.updateContractMetadata({
          contractId: req.params.id,
          // Zod `.optional()` infere `string | undefined`, mas chaves ausentes são OMITIDAS
          // no parse (JSON não carrega `undefined`); `exactOptionalPropertyTypes` exige a
          // ponte na borda. `null` em observations/email/telephone é intencional (limpa o campo).
          patch: req.body as ContractMetadataPatch,
        });
        if (!updated.ok) {
          return sendResult(reply, err(toErrorCode(updated.error)), {
            errors: {
              'contract-not-found': 404,
              'contract-repo-unavailable': 503,
            },
          });
        }
        // Recompõe o detalhe (children + contratado) para refletir o estado pós-patch.
        const detail = await deps.getContractDetail({ contractId: req.params.id });
        if (!detail.ok) {
          return sendResult(reply, err(toErrorCode(detail.error)), {
            errors: {
              'contract-not-found': 404,
              'contract-repo-unavailable': 503,
              'amendment-repo-unavailable': 503,
              'document-repository-unavailable': 503,
            },
          });
        }
        const contractor = await deps.getContractorBlock(detail.value.contract.contractor);
        const program = await deps.getProgramBlock(detail.value.contract.programId);
        reply.header('Deprecation', 'true');
        reply.header('Sunset', 'quando o BFF v2 assumir a composição do contratado');
        return sendResult(reply, ok(contractToDetailDto(detail.value, contractor, program)), {
          ok: 200,
        });
      },
    });

    // CTR-HTTP-CANCEL-PENDING (ADR-0039): DELETE cancela (soft-delete) um contrato `Pending`.
    // Pendente → 200 (contrato Cancelled); não-Pendente → 409 `ContractNotPending`; inexistente
    // → 404. Exclusão FÍSICA permanece proibida — a rota faz transição de estado, não apaga a row.
    scope.route({
      method: 'DELETE',
      url: '/contracts/:id',
      preHandler: [hooks.requireAuth, hooks.authorize(CONTRACT_PERMISSION.write)],
      schema: {
        params: contractIdParamSchema,
        response: { 200: contractDetailSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.cancelContract({ contractId: req.params.id });
        if (!result.ok) return sendDomainError(reply, result.error);
        return sendResult(reply, ok(await listItemWithProgram(result.value.contract)), { ok: 200 });
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
            title: body.title,
            objective: body.objective,
            originalValueCents: body.originalValueCents,
            periodStart: body.periodStart,
            periodEnd: body.periodEnd,
            contractorType: body.contractor.type,
            contractorId: body.contractor.id,
            // CTR-NUMBER-PROGRAM: classification omitida quando ausente (default CT no domínio,
            // `exactOptionalPropertyTypes`); metadados nuláveis repassados.
            ...(body.classification !== undefined ? { classification: body.classification } : {}),
            programId: body.programId ?? null,
            budgetPlanId: body.budgetPlanId ?? null,
            categorizacao: body.categorizacao ?? null,
            centroDeCusto: body.centroDeCusto ?? null,
          });
          if (!result.ok) return sendDomainError(reply, result.error);
          // Location no 201 (RFC 7231 §6.3.2): aponta para o recurso recém-criado. O body
          // `{id,...}` (list-item) é preservado para compat com o front atual.
          reply.header('location', `/api/v2/contracts/${String(result.value.contract.id)}`);
          return sendResult(reply, ok(await listItemWithProgram(result.value.contract)), {
            ok: 201,
          });
        }
        // O body usa `periodStart`/`periodEnd` (API uniforme entre Pending|Active); o
        // `CreateContractCommand` os nomeia `originalPeriodStart`/`originalPeriodEnd`.
        const result = await deps.createContract({
          title: body.title,
          objective: body.objective,
          signedAt: body.signedAt,
          originalValueCents: body.originalValueCents,
          originalPeriodStart: body.periodStart,
          originalPeriodEnd: body.periodEnd,
          contractorType: body.contractor.type,
          contractorId: body.contractor.id,
          // CTR-NUMBER-PROGRAM: classification omitida quando ausente (default CT no domínio,
          // `exactOptionalPropertyTypes`); metadados nuláveis repassados.
          ...(body.classification !== undefined ? { classification: body.classification } : {}),
          programId: body.programId ?? null,
          budgetPlanId: body.budgetPlanId ?? null,
          categorizacao: body.categorizacao ?? null,
          centroDeCusto: body.centroDeCusto ?? null,
        });
        if (!result.ok) return sendDomainError(reply, result.error);
        // Location no 201 (RFC 7231 §6.3.2): aponta para o recurso recém-criado. O body
        // `{id,...}` (list-item) é preservado para compat com o front atual.
        reply.header('location', `/api/v2/contracts/${String(result.value.contract.id)}`);
        return sendResult(reply, ok(await listItemWithProgram(result.value.contract)), { ok: 201 });
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
        return sendResult(reply, ok(await listItemWithProgram(result.value.contract)), { ok: 200 });
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
        // Body discriminado por `kind`: `Terminate` (distrato) carrega data efetiva + motivo.
        const body = req.body;
        const command =
          body.kind === 'Terminate'
            ? {
                contractId: req.params.id,
                kind: body.kind,
                terminatedAt: body.terminatedAt,
                reason: body.reason,
              }
            : { contractId: req.params.id, kind: body.kind };
        const result = await deps.endContract(command);
        if (!result.ok) return sendDomainError(reply, result.error);
        return sendResult(reply, ok(await listItemWithProgram(result.value.contract)), { ok: 200 });
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
        // G3: `amendmentNumber` não vem do body — gerado pelo backend por contrato.
        const base = {
          contractId: req.params.id,
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
        return sendResult(reply, ok(await listItemWithProgram(result.value.contract)), { ok: 200 });
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
        querystring: amendmentDocumentUploadQuerySchema,
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
          signedAt: q.signedAt,
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

    // E4: exclusão LÓGICA do documento (RN-11, princípio #14 — nunca apaga fisicamente).
    // O documento permanece na trilha com status `LogicallyDeleted`; `reason` é obrigatório
    // (auditoria, validado no body Zod). 204 sem corpo em sucesso. Diferente das demais
    // rotas de documento, "já-excluído"/"já-superseded" são tratados como 404 (recurso não
    // mais excluível — SPEC do ticket CTR-HTTP-DOCUMENT-DELETE), não 409.
    scope.route({
      method: 'DELETE',
      url: '/contracts/:id/documents/:documentId',
      preHandler: [hooks.requireAuth, hooks.authorize(CONTRACT_PERMISSION.write)],
      // Sucesso é 204 sem corpo → sem `response` schema (mesma convenção das rotas 204 de auth).
      schema: {
        params: documentParamSchema,
        body: deleteDocumentBodySchema,
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        // Ownership (IDOR/BOLA): o documento do path deve pertencer ao contrato `:id` —
        // diretamente (parentType Contract) ou via aditivo daquele contrato (Amendment).
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
        const result = await deps.deleteDocument({
          documentId: req.params.documentId,
          deletedReason: req.body.reason,
          deletedBy: req.userId,
        });
        // SPEC do ticket: já-excluído / já-superseded → 404 (recurso não mais excluível),
        // diferente do 409 padrão das demais rotas de documento.
        const mapped = result.ok ? ok(undefined) : err(toErrorCode(result.error));
        return sendResult(reply, mapped, {
          ok: 204,
          errors: {
            'document-not-found': 404,
            'document-already-deleted': 404,
            'document-already-superseded': 404,
            'document-repository-unavailable': 503,
          },
        });
      },
    });

    // E5: conteúdo (bytes) do documento — preview/download via BFF (CTR-HTTP-DOCUMENT-CONTENT).
    // Read (C1): `authorize('contract:read')`. Ownership (documento ↔ contrato, direto ou via
    // aditivo) é resolvido DENTRO do use case (validar → fetch → ownership → storage). Sucesso:
    // stream `application/pdf` + `Content-Disposition: attachment; filename="<original>"`.
    // Sem `response` schema (corpo binário, não-JSON — mesma convenção do CSV/204).
    scope.route({
      method: 'GET',
      url: '/contracts/:id/documents/:documentId/content',
      preHandler: [hooks.requireAuth, hooks.authorize(CONTRACT_PERMISSION.read)],
      schema: {
        params: documentParamSchema,
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.getDocumentContent({
          contractId: req.params.id,
          documentId: req.params.documentId,
        });
        if (!result.ok) return sendDomainError(reply, result.error);
        // `content-type` do documento (metadados); `attachment` permite download com o nome
        // original e, em PDFs, o browser ainda renderiza inline no modal de preview.
        const { bytes, fileName, contentType } = result.value;
        return reply
          .header('content-type', contentType)
          .header('content-disposition', `attachment; filename="${sanitizeFilename(fileName)}"`)
          .send(bytes);
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
