/**
 * PAR-GEO-ADDED-MUNICIPALITIES — W0 (RED) — GET /partner-municipalities/added.
 *
 * DEVE FALHAR: a rota cross-state ainda não existe. GREEN no W1.
 *
 * Lista paginada/buscável dos municípios parceiros de TODAS as UFs (painel "Adicionados").
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
  partnerGeographyHttpPlugin,
  buildPartnersHttpDeps,
} from '#src/modules/partners/public-api/http.ts';
import { GEOGRAPHY_PERMISSION } from '#src/modules/partners/public-api/permissions.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const READER = 'geo.reader@example.com';
const WRITER = 'geo.writer@example.com';
const NOPERM = 'geo.noperm@example.com';
const SP = '3550308'; // São Paulo/SP
const RJ = '3304557'; // Rio de Janeiro/RJ

const makeApp = async () => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [
        { email: READER, password: STRONG, permissions: [GEOGRAPHY_PERMISSION.read] },
        {
          email: WRITER,
          password: STRONG,
          permissions: [GEOGRAPHY_PERMISSION.read, GEOGRAPHY_PERMISSION.write],
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
        plugin: partnerGeographyHttpPlugin(partnersDeps, {
          requireAuth,
          authorize: authDeps.authorize,
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

const addPartner = (app: Awaited<ReturnType<typeof buildApp>>, token: string, code: string) =>
  app.inject({
    method: 'POST',
    url: `/api/v1/partner-municipalities/${code}`,
    headers: { authorization: `Bearer ${token}` },
    payload: {},
  });

describe('PAR-GEO-ADDED — GET /partner-municipalities/added', () => {
  it('sem Authorization → 401', async () => {
    const { app, teardown } = await makeApp();
    const res = await app.inject({ method: 'GET', url: '/api/v1/partner-municipalities/added' });
    assert.equal(res.statusCode, 401);
    await teardown();
  });

  it('sem geography:read → 403', async () => {
    const { app, teardown } = await makeApp();
    const token = await registerAndLogin(app, NOPERM);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/partner-municipalities/added',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 403);
    await teardown();
  });

  it('lista os parceiros de todas as UFs (paginado)', async () => {
    const { app, teardown } = await makeApp();
    const writer = await login(app, WRITER);
    await addPartner(app, writer, SP);
    await addPartner(app, writer, RJ);

    const reader = await login(app, READER);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/partner-municipalities/added',
      headers: { authorization: `Bearer ${reader}` },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as {
      items: { ibgeCode: string; uf: string; name: string }[];
      meta: Record<string, number>;
    };
    const codes = body.items.map((m) => m.ibgeCode);
    assert.equal(codes.includes(SP), true);
    assert.equal(codes.includes(RJ), true);
    assert.equal(body.meta['totalItems'], 2);
    await teardown();
  });

  it('busca por nome filtra (case-insensitive)', async () => {
    const { app, teardown } = await makeApp();
    const writer = await login(app, WRITER);
    await addPartner(app, writer, SP);
    await addPartner(app, writer, RJ);

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/partner-municipalities/added?search=paulo',
      headers: { authorization: `Bearer ${writer}` },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as { items: { ibgeCode: string; name: string }[] };
    assert.equal(body.items.length, 1);
    assert.equal(body.items[0]?.ibgeCode, SP);
    await teardown();
  });

  it('lista vazia → items [] e meta coerente', async () => {
    const { app, teardown } = await makeApp();
    const reader = await login(app, READER);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/partner-municipalities/added',
      headers: { authorization: `Bearer ${reader}` },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as { items: unknown[]; meta: Record<string, number> };
    assert.deepEqual(body.items, []);
    assert.equal(body.meta['totalItems'], 0);
    await teardown();
  });
});
