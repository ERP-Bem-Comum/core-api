// Rota de exercício da VAN — dispara a escrita de um `.REM` fictício em `sandbox/`.
//
// Plugin PRÓPRIO, e não mais uma rota no `plugin.ts` do módulo: ela é acessório de operação, não
// contrato de produto. Isolada, sai do repositório apagando um arquivo e três linhas de wiring —
// enquanto uma rota enfiada no meio das outras 40 sobreviveria por inércia, que é como rota
// temporária vira permanente.
//
// Registrada SOMENTE quando `VAN_SANDBOX_TOKEN` está presente e é forte o bastante
// (`van-sandbox-auth.ts`). Sem isso o `server.ts` não a monta, e não existe caminho em que ela suba
// sem credencial.
import type { FastifyPluginAsyncZodOpenApi, FastifyZodOpenApiSchema } from 'fastify-zod-openapi';
import * as z from 'zod/v4';

import { ok, type Result } from '#src/shared/primitives/result.ts';
import { sendResult } from '#src/shared/http/reply.ts';
import { toErrorEnvelope } from '#src/shared/http/errors.ts';
import { currentCorrelationId } from '#src/shared/observability/correlation.ts';
import type {
  UploadSandboxRemittanceError,
  UploadSandboxRemittanceOutput,
} from '../../application/use-cases/upload-sandbox-remittance.ts';
import { isAuthorized, type VanSandboxAuth } from './van-sandbox-auth.ts';

export type VanSandboxDeps = Readonly<{
  auth: VanSandboxAuth;
  uploadSandboxRemittance: () => Promise<
    Result<UploadSandboxRemittanceOutput, UploadSandboxRemittanceError>
  >;
}>;

// Aninhado sob `error` porque é essa a forma que `toErrorEnvelope` produz — o schema descreve o
// envelope do shell, não um formato próprio desta rota.
const errorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    requestId: z.string(),
  }),
});

const sandboxResponseSchema = z.object({
  objectKey: z.string(),
  fileName: z.string(),
  lineCount: z.number().int().positive(),
  batchCount: z.number().int().positive(),
  totalCents: z.number().int().nonnegative(),
});

export const vanSandboxPlugin =
  (deps: VanSandboxDeps): FastifyPluginAsyncZodOpenApi =>
  async (app) => {
    app.route({
      method: 'POST',
      url: '/financial/van/sandbox/remittance',
      schema: {
        // Sem `body`: a rota não recebe conteúdo do cliente. O arquivo é montado no servidor pelo
        // mesmo tradutor da remessa real — aceitar bytes de fora transformaria um exercício num
        // canal de upload arbitrário para o bucket do banco.
        response: {
          201: sandboxResponseSchema,
          401: errorEnvelopeSchema,
          502: errorEnvelopeSchema,
        },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const requestId = currentCorrelationId() ?? req.id;

        if (!isAuthorized(req.headers.authorization, deps.auth.token)) {
          // Sem distinguir "header ausente" de "token errado": a diferença só serviria a quem tenta.
          req.log.warn({ requestId }, 'van-sandbox-unauthorized');
          return reply
            .code(401)
            .send(toErrorEnvelope('unauthorized', 'Credencial ausente ou invalida', requestId));
        }

        const result = await deps.uploadSandboxRemittance();

        if (!result.ok) {
          // O slug interno (`cnab-malformed-file`, `van-storage-unavailable`) fica no log e não no
          // body — mesma regra do `sendDomainError` do módulo (OWASP API8).
          req.log.error({ requestId, errorCode: result.error }, 'van-sandbox-failed');
          return reply
            .code(502)
            .send(
              toErrorEnvelope(
                'van_sandbox_failed',
                'Nao foi possivel gravar o arquivo de exercicio',
                requestId,
              ),
            );
        }

        return sendResult(
          reply,
          ok({
            objectKey: result.value.key,
            fileName: result.value.fileName,
            lineCount: result.value.lineCount,
            batchCount: result.value.batchCount,
            totalCents: result.value.totalCents,
          }),
          { ok: 201 },
        );
      },
    });
  };
