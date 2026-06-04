/**
 * FINANCIERS-HTTP-EDIT — W0 (RED) — PUT /api/v1/financiers/:id com RBAC elevado p/ campo vital.
 *
 * DEVE FALHAR: a rota PUT, o use case `editFinancier` no composition, o hook `hasPermission`
 * (auth) e `updateFinancierBodySchema` ainda não existem. GREEN no W1.
 *
 * Regra (decisão do dono): quem tem `financier:write` edita campos não-vitais; mudar o CNPJ
 * (vital) exige `financier:edit-sensitive` (síncrono) → 403 sem ela. PUT total. POST→PUT no
 * mesmo writer repo (memory) — sem depender do reader.
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
  financiersHttpPlugin,
  buildPartnersHttpDeps,
} from '#src/modules/partners/public-api/http.ts';
import { FINANCIER_PERMISSION } from '#src/modules/partners/public-api/permissions.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const WRITER_EMAIL = 'fin.editor@example.com'; // só financier:write
const DIRECTOR_EMAIL = 'fin.diretor@example.com'; // write + edit-sensitive
const NOPERM_EMAIL = 'sem.permissao@example.com';
const UUID_INEXISTENTE = '00000000-0000-4000-8000-000000000000';
const CNPJ_A = '11222333000181';
const CNPJ_B = '11444777000161';

const body = (over: Record<string, unknown> = {}) => ({
  name: 'Banco Apoio',
  corporateName: 'Banco Apoio S.A.',
  legalRepresentative: 'Maria Diretora',
  cnpj: CNPJ_A,
  telephone: '+5511999998888',
  address: 'Av. Central, 1000',
  ...over,
});

const makeApp = async () => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [
        { email: WRITER_EMAIL, password: STRONG, permissions: [FINANCIER_PERMISSION.write] },
        {
          email: DIRECTOR_EMAIL,
          password: STRONG,
          permissions: [FINANCIER_PERMISSION.write, 'financier:edit-sensitive'],
        },
      ],
    },
  });
  const partnersDeps = await buildPartnersHttpDeps({ driver: 'memory' });
  const requireAuth = makeRequireAuth(authDeps.verifyAccessToken);
  const app = await buildApp({
    routes: [
      authHttpPlugin(authDeps),
      {
        plugin: financiersHttpPlugin(partnersDeps, {
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

const create = async (
  app: Awaited<ReturnType<typeof buildApp>>,
  token: string,
  cnpj: string,
): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/financiers',
    headers: { authorization: `Bearer ${token}` },
    payload: body({ cnpj }),
  });
  return (res.headers['location'] ?? '').slice('/api/v1/financiers/'.length);
};

const put = (
  app: Awaited<ReturnType<typeof buildApp>>,
  token: string,
  id: string,
  payload: Record<string, unknown>,
) =>
  app.inject({
    method: 'PUT',
    url: `/api/v1/financiers/${id}`,
    headers: { authorization: `Bearer ${token}` },
    payload,
  });

describe('FINANCIERS-HTTP-EDIT — PUT /api/v1/financiers/:id', () => {
  it('CA: sem Authorization -> 401', async () => {
    const { app, teardown } = await makeApp();
    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/financiers/${UUID_INEXISTENTE}`,
      payload: body(),
    });
    assert.equal(res.statusCode, 401);
    await teardown();
  });

  it('CA: sem financier:write -> 403', async () => {
    const { app, teardown } = await makeApp();
    const token = await registerAndLogin(app, NOPERM_EMAIL);
    assert.equal((await put(app, token, UUID_INEXISTENTE, body())).statusCode, 403);
    await teardown();
  });

  it('CA: :id não-UUID -> 400', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    assert.equal((await put(app, token, 'nao-uuid', body())).statusCode, 400);
    await teardown();
  });

  it('CA: inexistente -> 404', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    assert.equal((await put(app, token, UUID_INEXISTENTE, body())).statusCode, 404);
    await teardown();
  });

  it('CA: write, sem mudar cnpj (muda name) -> 200', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const id = await create(app, token, CNPJ_A);
    const res = await put(app, token, id, body({ name: 'Banco Apoio Renomeado' }));
    assert.equal(res.statusCode, 200);
    await teardown();
  });

  it('CA: write, mudando cnpj -> 403 (sensitive-forbidden)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const id = await create(app, token, CNPJ_A);
    assert.equal(await put(app, token, id, body({ cnpj: CNPJ_B })).then((r) => r.statusCode), 403);
    await teardown();
  });

  it('CA: director (write+edit-sensitive), mudando cnpj -> 200', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, DIRECTOR_EMAIL);
    const id = await create(app, token, CNPJ_A);
    const res = await put(app, token, id, body({ cnpj: CNPJ_B }));
    assert.equal(res.statusCode, 200);
    await teardown();
  });

  it('CA: director, cnpj novo já usado por outro -> 409', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, DIRECTOR_EMAIL);
    const id1 = await create(app, token, CNPJ_A);
    await create(app, token, CNPJ_B);
    assert.equal(await put(app, token, id1, body({ cnpj: CNPJ_B })).then((r) => r.statusCode), 409);
    await teardown();
  });

  it('CA: body inválido (name vazio) -> 422; cnpj curto -> 400', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const id = await create(app, token, CNPJ_A);
    assert.equal(await put(app, token, id, body({ name: '   ' })).then((r) => r.statusCode), 422);
    assert.equal(await put(app, token, id, body({ cnpj: '123' })).then((r) => r.statusCode), 400);
    await teardown();
  });
});
