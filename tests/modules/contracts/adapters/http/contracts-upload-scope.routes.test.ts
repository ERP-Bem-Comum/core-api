/**
 * CTR-HTTP-UPLOAD-SCOPE — W0 (RED) — isolar o parser octet-stream (bodyLimit 20 MiB) das
 * rotas de upload (CWE-770, allocation of resources without limits, PRE-AUTH).
 *
 * Hoje `scope.addContentTypeParser('application/octet-stream', ...)` é registrado no
 * `contractsRoutes` COMPARTILHADO (plugin.ts:161) — vale para TODAS as rotas de `/contracts`,
 * não só as 3 de upload (E1/E2/E3). Como o Parsing (Fastify Lifecycle) ocorre ANTES da
 * Validation e do preHandler (auth), qualquer requisição a QUALQUER rota de `/contracts` com
 * `Content-Type: application/octet-stream` é bufferizada com o limite de 20 MiB — mesmo sem
 * token válido e mesmo em rotas que nada têm a ver com upload.
 *
 * CA1 (regressão — deve JÁ passar GREEN): upload octet-stream de um PDF válido pequeno (E1)
 * responde 201. Prova que a funcionalidade de upload continua íntegra.
 *
 * CA2 (o fix — DEVE FALHAR agora, RED): `DELETE /contracts/:id` é uma rota de escrita que NÃO
 * declara `schema.body` (logo, sem fase de Validation de corpo) e NÃO é uma das 3 rotas de
 * upload. Enviamos `Content-Type: application/octet-stream` com corpo de ~2 MiB (> bodyLimit
 * global de 1 MiB, < bodyLimit do parser de upload vazado de 20 MiB) SEM token de autenticação.
 * HOJE (defeito): o parser compartilhado aceita e buferiza o corpo inteiro (até 20 MiB) ANTES
 * de qualquer hook de auth — como a rota não tem `schema.body`, não há Validation a barrar o
 * Buffer, e a requisição chega ao `preHandler` (`requireAuth`) → 401 (sem token). Ou seja: os
 * ~2 MiB já foram integralmente lidos/alocados em memória ANTES da autenticação — exatamente o
 * CWE-770 do ticket. O DESEJADO (pós-fix W1: parser + as 3 rotas de upload isolados num
 * sub-scope) é a rota `DELETE /contracts/:id` não ter mais parser para este Content-Type e ser
 * rejeitada na fase de Parsing, ANTES do preHandler — 413 (corpo > bodyLimit global de 1 MiB)
 * ou 415 (media type sem parser fora do sub-scope de upload). Este teste assevera o
 * comportamento DESEJADO (413/415), então FALHA agora (recebe 401) = RED.
 * GREEN quando o W1 mover o parser + as 3 rotas de upload para
 * `scope.register(async (uploadScope: typeof scope) => {...})`.
 *
 * CA3 (limite — deve JÁ passar GREEN): corpo > 20 MiB (`MAX_UPLOAD_BYTES`) numa rota de upload
 * (E1) responde 413. Esse limite não muda com o fix (segue valendo dentro do sub-scope).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { buildApp } from '#src/shared/http/app.ts';
import {
  authHttpPlugin,
  buildAuthHttpDeps,
  makeRequireAuth,
} from '#src/modules/auth/public-api/http.ts';
import {
  contractsHttpPlugin,
  buildContractsHttpDeps,
} from '#src/modules/contracts/public-api/http.ts';

import { buildContract } from '../persistence/fixtures.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const WRITER_EMAIL = 'writer@example.com'; // seed RBAC: contract:write
const ACTIVE_ID = '11111111-1111-4111-8111-111111111111';

const PDF_BYTES = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n');

const makeApp = async () => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: { users: [{ email: WRITER_EMAIL, password: STRONG, permissions: ['contract:write'] }] },
  });
  const contractsDeps = await buildContractsHttpDeps({
    driver: 'memory',
    seed: { contracts: [buildContract({ id: ACTIVE_ID, sequentialNumber: '001/2026' })] },
  });
  const app = await buildApp({
    routes: [
      authHttpPlugin(authDeps),
      contractsHttpPlugin(contractsDeps, {
        requireAuth: makeRequireAuth(authDeps.verifyAccessToken),
        authorize: authDeps.authorize,
      }),
    ],
  });
  const teardown = async (): Promise<void> => {
    await app.close();
    await contractsDeps.shutdown();
    await authDeps.shutdown();
  };
  return { app, teardown };
};

type App = Awaited<ReturnType<typeof buildApp>>;

const login = async (app: App): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v2/auth/login',
    payload: { email: WRITER_EMAIL, password: STRONG },
  });
  return (res.json() as { accessToken: string }).accessToken;
};

// E1 — metadados do upload viajam na query string (D1 da SPEC C3).
const uploadUrl = (id: string): string =>
  `/api/v2/contracts/${id}/documents?categoria=signed_contract&fileName=contrato.pdf` +
  `&mimeType=application%2Fpdf&signedElectronically=true`;

describe('CTR-HTTP-UPLOAD-SCOPE — CA1 (regressão): upload octet-stream continua 201', () => {
  it('POST /contracts/:id/documents com PDF pequeno + auth -> 201', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app);
    const res = await app.inject({
      method: 'POST',
      url: uploadUrl(ACTIVE_ID),
      headers: {
        'content-type': 'application/octet-stream',
        authorization: `Bearer ${token}`,
      },
      payload: PDF_BYTES,
    });
    assert.equal(res.statusCode, 201);
    await teardown();
  });
});

describe('CTR-HTTP-UPLOAD-SCOPE — CA2 (o fix): parser octet-stream NÃO deve vazar p/ rota não-upload', () => {
  it('DELETE /contracts/:id (sem schema.body) + octet-stream ~2 MiB SEM token -> 413/415, NUNCA 401', async () => {
    const { app, teardown } = await makeApp();
    // ~2 MiB: > bodyLimit global (1 MiB), < bodyLimit do parser de upload vazado (20 MiB).
    const oversized = Buffer.alloc(2 * 1024 * 1024, 0x41);
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v2/contracts/${ACTIVE_ID}`,
      headers: { 'content-type': 'application/octet-stream' }, // SEM authorization, de propósito
      payload: oversized,
    });
    // DESEJADO (pós-fix): rejeitado na fase de Parsing, ANTES do preHandler (auth) — 413
    // (corpo > bodyLimit global de 1 MiB) ou 415 (media type sem parser fora do sub-scope de
    // upload). HOJE: 401, porque o corpo de 2 MiB foi bufferizado pelo parser vazado (20 MiB)
    // e a requisição alcançou o preHandler sem token — a alocação pré-auth já ocorreu (CWE-770).
    assert.ok(
      res.statusCode === 413 || res.statusCode === 415,
      `esperado 413 ou 415 (rejeitado ANTES do preHandler); recebido ${res.statusCode} — ` +
        'evidencia de que o parser de 20 MiB vazou p/ rota não-upload (alocação pré-auth, CWE-770)',
    );
    await teardown();
  });
});

describe('CTR-HTTP-UPLOAD-SCOPE — CA3 (limite, já GREEN): corpo > 20 MiB em rota de upload -> 413', () => {
  it('POST /contracts/:id/documents com corpo > 20 MiB (MAX_UPLOAD_BYTES) -> 413', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app);
    const oversized = Buffer.alloc(21 * 1024 * 1024, 0x42); // > 20 MiB
    const res = await app.inject({
      method: 'POST',
      url: uploadUrl(ACTIVE_ID),
      headers: {
        'content-type': 'application/octet-stream',
        authorization: `Bearer ${token}`,
      },
      payload: oversized,
    });
    assert.equal(res.statusCode, 413);
    await teardown();
  });
});
