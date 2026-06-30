/**
 * PARTNERS-COLLAB-IMPORT-HTTP — W0 (RED) — POST /api/v1/collaborators/import (text/csv).
 *
 * DEVE FALHAR: a rota não existe e o composition não expõe `importCollaborators`.
 * GREEN quando o W1 entregar: content-type parser text/csv + rota + wiring, relatório
 * `{ created, failed: [{ line, error }] }`. Decisão de design: corpo `text/csv` cru (sem
 * @fastify/multipart) — o BFF traduz multipart→raw (ADR-0002 / Princ. dependências mínimas).
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
  collaboratorsHttpPlugin,
  buildPartnersHttpDeps,
} from '#src/modules/partners/public-api/http.ts';
import { COLLABORATOR_PERMISSION } from '#src/modules/partners/public-api/permissions.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const WRITER_EMAIL = 'rh.import@example.com';
const NOPERM_EMAIL = 'sem.permissao.import@example.com';

const HEADER = 'name,email,cpf,occupationArea,role,startOfContract,employmentRelationship';
// CPFs com DV válido. CPF com DV inválido (11111111111) provoca falha de domínio.
const ROW_OK1 = 'Maria Silva,maria@bemcomum.org,11144477735,PARC,Analista,2026-01-10,CLT';
const ROW_OK2 = 'Joao Souza,joao@bemcomum.org,52998224725,DCE,Coordenador,2026-02-01,PJ';
const ROW_BAD_CPF = 'Cpf Ruim,ruim@bemcomum.org,11111111111,PARC,Analista,2026-01-10,CLT';

const csv = (...rows: string[]): string => [HEADER, ...rows].join('\n');

const makeApp = async () => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [
        { email: WRITER_EMAIL, password: STRONG, permissions: [COLLABORATOR_PERMISSION.write] },
      ],
    },
  });
  const partnersDeps = await buildPartnersHttpDeps({ driver: 'memory' });
  const requireAuth = makeRequireAuth(authDeps.verifyAccessToken);
  const app = await buildApp({
    routes: [
      authHttpPlugin(authDeps),
      {
        plugin: collaboratorsHttpPlugin(partnersDeps, {
          requireAuth,
          authorize: authDeps.authorize,
          hasPermission: authDeps.hasPermission,
        }),
        prefix: '/api/v1',
      },
    ],
  });
  const teardown = async (): Promise<void> => {
    await app.close();
    await partnersDeps.shutdown();
    await authDeps.shutdown();
  };
  return { app, teardown };
};

const login = async (app: Awaited<ReturnType<typeof buildApp>>, email: string): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v2/auth/login',
    payload: { email, password: STRONG },
  });
  return (res.json() as { accessToken: string }).accessToken;
};

const registerAndLogin = async (
  app: Awaited<ReturnType<typeof buildApp>>,
  email: string,
): Promise<string> => {
  await app.inject({
    method: 'POST',
    url: '/api/v2/auth/register',
    payload: { email, password: STRONG },
  });
  return login(app, email);
};

const importCsv = (app: Awaited<ReturnType<typeof buildApp>>, token: string | null, body: string) =>
  app.inject({
    method: 'POST',
    url: '/api/v1/collaborators/import',
    headers: {
      'content-type': 'text/csv',
      ...(token === null ? {} : { authorization: `Bearer ${token}` }),
    },
    payload: body,
  });

describe('PARTNERS-COLLAB-IMPORT-HTTP — POST /api/v1/collaborators/import', () => {
  it('CA: sem Authorization → 401', async () => {
    const { app, teardown } = await makeApp();
    const res = await importCsv(app, null, csv(ROW_OK1));
    assert.equal(res.statusCode, 401);
    await teardown();
  });

  it('CA: autenticado sem collaborator:write → 403', async () => {
    const { app, teardown } = await makeApp();
    const token = await registerAndLogin(app, NOPERM_EMAIL);
    const res = await importCsv(app, token, csv(ROW_OK1));
    assert.equal(res.statusCode, 403);
    await teardown();
  });

  it('CA: CSV totalmente válido → 200 { created: 2, failed: [] }', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const res = await importCsv(app, token, csv(ROW_OK1, ROW_OK2));
    assert.equal(res.statusCode, 200);
    const body = res.json() as { created: number; failed: unknown[] };
    assert.equal(body.created, 2);
    assert.equal(body.failed.length, 0);
    await teardown();
  });

  it('CA: import parcial (1 válida + 1 CPF inválido na linha 3) → created 1, failed[0].line = 3', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const res = await importCsv(app, token, csv(ROW_OK1, ROW_BAD_CPF));
    assert.equal(res.statusCode, 200);
    const body = res.json() as { created: number; failed: { line: number; error: string }[] };
    assert.equal(body.created, 1);
    assert.equal(body.failed.length, 1);
    assert.equal(body.failed[0]!.line, 3);
    await teardown();
  });

  it('CA: CSV malformado (aspas não fechadas) → 400 com requestId', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const res = await importCsv(app, token, `${HEADER}\n"sem fim`);
    assert.equal(res.statusCode, 400);
    const body = res.json() as { error?: { requestId?: string } };
    assert.ok(body.error?.requestId);
    await teardown();
  });

  it('CA: corpo vazio → 200 { created: 0, failed: [] }', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const res = await importCsv(app, token, '');
    assert.equal(res.statusCode, 200);
    const body = res.json() as { created: number; failed: unknown[] };
    assert.equal(body.created, 0);
    assert.equal(body.failed.length, 0);
    await teardown();
  });
});
