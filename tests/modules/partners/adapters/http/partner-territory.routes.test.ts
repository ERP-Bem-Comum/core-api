/**
 * GEOGRAPHY-HTTP-V1 — W0 (RED) — rotas de parceria territorial (US-002).
 *
 * CT-101: GET /partner-states sem auth → 401
 * CT-102: GET /partner-states sem geography:read → 403
 * CT-103: GET /partner-states → 200 com 27 UFs e isPartner: false (store vazio)
 * CT-104: POST /partner-states/:uf (activate) → 200; GET verifica isPartner: true
 * CT-105: DELETE /partner-states/:uf (deactivate) → 200; GET verifica isPartner: false
 * CT-106: POST /partner-states/ZZ (UF inválida) → 400
 * CT-107: GET /partner-municipalities?uf=SP → 200 (lista municípios SP)
 * CT-108: POST /partner-municipalities/:ibgeCode → 200; GET verifica isPartner: true
 * CT-109: DELETE /partner-municipalities/:ibgeCode → 200; GET verifica isPartner: false
 *
 * Driver memory. Espelha `suppliers-reads.routes.test.ts`.
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
const READER_EMAIL = 'geo.leitor@example.com';
const WRITER_EMAIL = 'geo.escritor@example.com';
const NOPERM_EMAIL = 'sem.permissao.geo@example.com';

// Código IBGE válido de São Paulo (SP) e Rio de Janeiro (RJ) — catálogo IBGE real
const SP_IBGE = '3550308'; // São Paulo/SP
const RJ_IBGE = '3304557'; // Rio de Janeiro/RJ
const IBGE_INVALIDO = '9999999'; // não existe no catálogo

const makeApp = async () => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [
        { email: READER_EMAIL, password: STRONG, permissions: [GEOGRAPHY_PERMISSION.read] },
        {
          email: WRITER_EMAIL,
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

// ── Partner States ────────────────────────────────────────────────────────────

describe('CT-101: GET /api/v1/partner-states sem auth → 401', () => {
  it('retorna 401 sem Authorization', async () => {
    const { app, teardown } = await makeApp();
    const res = await app.inject({ method: 'GET', url: '/api/v1/partner-states' });
    assert.equal(res.statusCode, 401);
    await teardown();
  });
});

describe('CT-102: GET /api/v1/partner-states sem geography:read → 403', () => {
  it('autenticado sem permissão retorna 403', async () => {
    const { app, teardown } = await makeApp();
    const token = await registerAndLogin(app, NOPERM_EMAIL);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/partner-states',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 403);
    await teardown();
  });
});

describe('CT-103: GET /api/v1/partner-states → 200 com 27 UFs', () => {
  it('retorna array com 27 UFs, todas isPartner: false no store vazio', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, READER_EMAIL);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/partner-states',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as { uf: string; isPartner: boolean }[];
    assert.equal(body.length, 27);
    assert.ok(body.every((s) => !s.isPartner));
    assert.ok(body.some((s) => s.uf === 'SP'));
    assert.ok(body.some((s) => s.uf === 'DF'));
    await teardown();
  });
});

describe('CT-104: POST /partner-states/:uf ativa parceria → 200; GET reflete isPartner: true', () => {
  it('POST SP → 200; GET lista SP com isPartner true', async () => {
    const { app, teardown } = await makeApp();
    const writerToken = await login(app, WRITER_EMAIL);
    const readerToken = await login(app, READER_EMAIL);

    const postRes = await app.inject({
      method: 'POST',
      url: '/api/v1/partner-states/SP',
      headers: { authorization: `Bearer ${writerToken}` },
    });
    assert.equal(postRes.statusCode, 200);
    // o toggle retorna o DTO confirmando o estado (contrato do BFF — SC-005)
    const toggleBody = postRes.json() as { uf: string; isPartner: boolean };
    assert.equal(toggleBody.uf, 'SP');
    assert.equal(toggleBody.isPartner, true);

    const getRes = await app.inject({
      method: 'GET',
      url: '/api/v1/partner-states',
      headers: { authorization: `Bearer ${readerToken}` },
    });
    assert.equal(getRes.statusCode, 200);
    const body = getRes.json() as { uf: string; isPartner: boolean }[];
    const sp = body.find((s) => s.uf === 'SP');
    assert.ok(sp !== undefined);
    assert.equal(sp.isPartner, true);
    // restante ainda false
    assert.equal(body.filter((s) => s.isPartner).length, 1);
    await teardown();
  });

  it('POST :uf sem geography:write → 403', async () => {
    const { app, teardown } = await makeApp();
    const readerToken = await login(app, READER_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/partner-states/SP',
      headers: { authorization: `Bearer ${readerToken}` },
    });
    assert.equal(res.statusCode, 403);
    await teardown();
  });
});

describe('CT-105: DELETE /partner-states/:uf desativa → 200; GET reflete isPartner: false', () => {
  it('ativa SP então desativa → GET isPartner: false', async () => {
    const { app, teardown } = await makeApp();
    const writerToken = await login(app, WRITER_EMAIL);
    const readerToken = await login(app, READER_EMAIL);
    const hdr = { authorization: `Bearer ${writerToken}` };

    await app.inject({ method: 'POST', url: '/api/v1/partner-states/SP', headers: hdr });

    const delRes = await app.inject({
      method: 'DELETE',
      url: '/api/v1/partner-states/SP',
      headers: hdr,
    });
    assert.equal(delRes.statusCode, 200);

    const getRes = await app.inject({
      method: 'GET',
      url: '/api/v1/partner-states',
      headers: { authorization: `Bearer ${readerToken}` },
    });
    const body = getRes.json() as { uf: string; isPartner: boolean }[];
    const sp = body.find((s) => s.uf === 'SP');
    assert.ok(sp !== undefined);
    assert.equal(sp.isPartner, false);
    await teardown();
  });
});

describe('CT-106: POST /partner-states/:uf com UF inválida → 400', () => {
  it('UF "ZZ" → 400', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/partner-states/ZZ',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 400);
    // erro de escrita no envelope canônico { error: { code, message, requestId } } (FR-007)
    const body = res.json() as { error?: { code?: string; requestId?: string } };
    assert.ok(body.error?.requestId, 'erro deve carregar requestId no envelope');
    assert.equal(body.error?.code, 'invalid-state');
    await teardown();
  });

  it('DELETE UF "XX" → 400', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/partner-states/XX',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 400);
    await teardown();
  });
});

// ── Partner Municipalities ────────────────────────────────────────────────────

describe('CT-107: GET /api/v1/partner-municipalities?uf=SP → 200 com lista de municípios', () => {
  it('retorna municípios de SP com isPartner: false no store vazio', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, READER_EMAIL);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/partner-municipalities?uf=SP',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as { ibgeCode: string; uf: string; name: string; isPartner: boolean }[];
    assert.ok(body.length > 0, 'SP deve ter municípios no catálogo');
    assert.ok(body.every((m) => m.uf === 'SP'));
    assert.ok(body.every((m) => !m.isPartner));
    assert.ok(body.some((m) => m.ibgeCode === SP_IBGE));
    await teardown();
  });

  it('GET sem uf → 400 (query obrigatória)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, READER_EMAIL);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/partner-municipalities',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 400);
    await teardown();
  });

  it('GET uf=ZZ (inválida) → 400', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, READER_EMAIL);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/partner-municipalities?uf=ZZ',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 400);
    await teardown();
  });
});

describe('CT-108: POST /partner-municipalities/:ibgeCode → 200; GET reflete isPartner: true', () => {
  it('ativa São Paulo → GET /partner-municipalities?uf=SP mostra isPartner: true', async () => {
    const { app, teardown } = await makeApp();
    const writerToken = await login(app, WRITER_EMAIL);
    const readerToken = await login(app, READER_EMAIL);

    const postRes = await app.inject({
      method: 'POST',
      url: `/api/v1/partner-municipalities/${SP_IBGE}`,
      headers: { authorization: `Bearer ${writerToken}` },
    });
    assert.equal(postRes.statusCode, 200);
    // toggle retorna o DTO completo (com name do catálogo) confirmando o estado
    const toggleBody = postRes.json() as {
      ibgeCode: string;
      uf: string;
      name: string;
      isPartner: boolean;
    };
    assert.equal(toggleBody.ibgeCode, SP_IBGE);
    assert.equal(toggleBody.isPartner, true);
    assert.ok(toggleBody.name.length > 0);

    const getRes = await app.inject({
      method: 'GET',
      url: '/api/v1/partner-municipalities?uf=SP',
      headers: { authorization: `Bearer ${readerToken}` },
    });
    assert.equal(getRes.statusCode, 200);
    const body = getRes.json() as { ibgeCode: string; isPartner: boolean }[];
    const sp = body.find((m) => m.ibgeCode === SP_IBGE);
    assert.ok(sp !== undefined);
    assert.equal(sp.isPartner, true);
    assert.equal(body.filter((m) => m.isPartner).length, 1);
    await teardown();
  });

  it('POST código inválido → 400', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/partner-municipalities/${IBGE_INVALIDO}`,
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 400);
    await teardown();
  });
});

describe('CT-109: DELETE /partner-municipalities/:ibgeCode → 200; GET reflete isPartner: false', () => {
  it('ativa RJ então desativa → GET isPartner: false', async () => {
    const { app, teardown } = await makeApp();
    const writerToken = await login(app, WRITER_EMAIL);
    const readerToken = await login(app, READER_EMAIL);
    const hdr = { authorization: `Bearer ${writerToken}` };

    await app.inject({
      method: 'POST',
      url: `/api/v1/partner-municipalities/${RJ_IBGE}`,
      headers: hdr,
    });

    const delRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/partner-municipalities/${RJ_IBGE}`,
      headers: hdr,
    });
    assert.equal(delRes.statusCode, 200);

    const getRes = await app.inject({
      method: 'GET',
      url: '/api/v1/partner-municipalities?uf=RJ',
      headers: { authorization: `Bearer ${readerToken}` },
    });
    assert.equal(getRes.statusCode, 200);
    const body = getRes.json() as { ibgeCode: string; isPartner: boolean }[];
    const rj = body.find((m) => m.ibgeCode === RJ_IBGE);
    assert.ok(rj !== undefined);
    assert.equal(rj.isPartner, false);
    await teardown();
  });

  it('DELETE sem geography:write → 403', async () => {
    const { app, teardown } = await makeApp();
    const readerToken = await login(app, READER_EMAIL);
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/partner-municipalities/${SP_IBGE}`,
      headers: { authorization: `Bearer ${readerToken}` },
    });
    assert.equal(res.statusCode, 403);
    await teardown();
  });
});
