/**
 * FINANCIERS-HTTP-V1 — W0 (RED) — CRUD de Financiadores em /api/v1 (fatia única).
 *
 * DEVE FALHAR: `financiersHttpPlugin`, `FINANCIER_PERMISSION`, o FinancierReader/writer no
 * composition (seed.financiers, getFinancierById/listFinancierRecords/registerFinancier/
 * deactivateFinancier/reactivateFinancier) e os schemas/DTO ainda não existem. GREEN no W1.
 *
 * Espelha o épico de Fornecedores (mais simples — sem payment target/categoria).
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
import type { FinancierReadRecord } from '#src/modules/partners/application/ports/financier-reader.ts';
import * as Financier from '#src/modules/partners/domain/financier/financier.ts';
import * as FinancierId from '#src/modules/partners/domain/financier/financier-id.ts';

const NOW = new Date('2026-01-10T08:00:00.000Z');

const seedRecord = (): { id: string; record: FinancierReadRecord } => {
  const id = FinancierId.generate();
  const r = Financier.register({
    id,
    name: 'Banco Apoio',
    corporateName: 'Banco Apoio S.A.',
    legalRepresentative: 'Maria Diretora',
    cnpj: '11222333000181',
    telephone: '+5511999998888',
    address: 'Av. Central, 1000',
    bankAccount: null,
    pixKey: null,
    registeredAt: NOW,
  });
  assert.ok(r.ok, `fixture register: ${r.ok ? '' : r.error}`);
  return {
    id: String(id),
    record: { financier: r.value.financier, legacyId: 7, createdAt: NOW, updatedAt: NOW },
  };
};

const STRONG = 'Str0ng-Passphrase-2026!';
const READER_EMAIL = 'fin.leitor@example.com';
const WRITER_EMAIL = 'fin.editor@example.com';
const NOPERM_EMAIL = 'sem.permissao@example.com';
const UUID_INEXISTENTE = '00000000-0000-4000-8000-000000000000';

const VALID_BODY = {
  name: 'Banco Apoio',
  corporateName: 'Banco Apoio S.A.',
  legalRepresentative: 'Maria Diretora',
  cnpj: '11222333000181',
  telephone: '+5511999998888',
  address: 'Av. Central, 1000',
};

const makeApp = async (financiers: readonly FinancierReadRecord[] = []) => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [
        { email: READER_EMAIL, password: STRONG, permissions: [FINANCIER_PERMISSION.read] },
        { email: WRITER_EMAIL, password: STRONG, permissions: [FINANCIER_PERMISSION.write] },
      ],
    },
  });
  const partnersDeps = await buildPartnersHttpDeps({ driver: 'memory', seed: { financiers } });
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

const post = (
  app: Awaited<ReturnType<typeof buildApp>>,
  token: string,
  body: Record<string, unknown>,
) =>
  app.inject({
    method: 'POST',
    url: '/api/v1/financiers',
    headers: { authorization: `Bearer ${token}` },
    payload: body,
  });

const createOne = async (
  app: Awaited<ReturnType<typeof buildApp>>,
  token: string,
): Promise<string> => {
  const res = await post(app, token, VALID_BODY);
  return (res.headers['location'] ?? '').slice('/api/v1/financiers/'.length);
};

const action = async (
  app: Awaited<ReturnType<typeof buildApp>>,
  token: string,
  id: string,
  verb: 'deactivate' | 'reactivate',
) => {
  const res = await app.inject({
    method: 'POST',
    url: `/api/v1/financiers/${id}/${verb}`,
    headers: { authorization: `Bearer ${token}` },
    payload: {},
  });
  return res;
};

describe('FINANCIERS-HTTP-V1 — reads', () => {
  it('CA: GET /financiers sem token -> 401; sem financier:read -> 403', async () => {
    const { app, teardown } = await makeApp();
    assert.equal((await app.inject({ method: 'GET', url: '/api/v1/financiers' })).statusCode, 401);
    const token = await registerAndLogin(app, NOPERM_EMAIL);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/financiers',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 403);
    await teardown();
  });

  it('CA: GET /financiers lista (meta legado, filtro search) e GET /:id retorna detalhe', async () => {
    // Seed no reader (read-after-write em memory é store distinto; reflexão real só no smoke MySQL).
    const { id, record } = seedRecord();
    const { app, teardown } = await makeApp([record]);
    const rToken = await login(app, READER_EMAIL);

    const list = await app.inject({
      method: 'GET',
      url: '/api/v1/financiers?search=Apoio',
      headers: { authorization: `Bearer ${rToken}` },
    });
    assert.equal(list.statusCode, 200);
    const body = list.json() as {
      items: readonly { id: string }[];
      meta: { totalItems: number };
    };
    assert.equal(body.meta.totalItems, 1);
    assert.ok(body.items.some((f) => f.id === id));

    const detail = await app.inject({
      method: 'GET',
      url: `/api/v1/financiers/${id}`,
      headers: { authorization: `Bearer ${rToken}` },
    });
    assert.equal(detail.statusCode, 200);
    const dto = detail.json() as {
      id: string;
      cnpj: string;
      legalRepresentative: string;
      active: boolean;
    };
    assert.equal(dto.id, id);
    assert.equal(dto.cnpj, '11222333000181');
    assert.equal(dto.legalRepresentative, 'Maria Diretora');
    assert.equal(dto.active, true);
    await teardown();
  });

  it('CA: GET /:id inexistente -> 404; não-UUID -> 400', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, READER_EMAIL);
    const hdr = { authorization: `Bearer ${token}` };
    assert.equal(
      (
        await app.inject({
          method: 'GET',
          url: `/api/v1/financiers/${UUID_INEXISTENTE}`,
          headers: hdr,
        })
      ).statusCode,
      404,
    );
    assert.equal(
      (await app.inject({ method: 'GET', url: '/api/v1/financiers/nao-uuid', headers: hdr }))
        .statusCode,
      400,
    );
    await teardown();
  });
});

describe('FINANCIERS-HTTP-V1 — cadastro', () => {
  it('CA: sem financier:write -> 403', async () => {
    const { app, teardown } = await makeApp();
    const token = await registerAndLogin(app, NOPERM_EMAIL);
    assert.equal((await post(app, token, VALID_BODY)).statusCode, 403);
    await teardown();
  });

  it('CA: body válido -> 201 + Location', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const res = await post(app, token, VALID_BODY);
    assert.equal(res.statusCode, 201);
    assert.ok((res.headers['location'] ?? '').startsWith('/api/v1/financiers/'));
    await teardown();
  });

  it('CA: cnpj duplicado -> 409; cnpj curto -> 400; cnpj DV inválido -> 422', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    await post(app, token, VALID_BODY);
    assert.equal((await post(app, token, VALID_BODY)).statusCode, 409);
    assert.equal((await post(app, token, { ...VALID_BODY, cnpj: '123' })).statusCode, 400);
    assert.equal(
      (await post(app, token, { ...VALID_BODY, cnpj: '11111111111111' })).statusCode,
      422,
    );
    await teardown();
  });
});

describe('FINANCIERS-HTTP-V1 — lifecycle', () => {
  it('CA: deactivate ativo -> 200; 2ª vez -> 409; reactivate -> 200; 2ª -> 409', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const id = await createOne(app, token);
    assert.equal((await action(app, token, id, 'deactivate')).statusCode, 200);
    assert.equal((await action(app, token, id, 'deactivate')).statusCode, 409);
    assert.equal((await action(app, token, id, 'reactivate')).statusCode, 200);
    assert.equal((await action(app, token, id, 'reactivate')).statusCode, 409);
    await teardown();
  });

  it('CA: deactivate id inexistente -> 404', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    assert.equal((await action(app, token, UUID_INEXISTENTE, 'deactivate')).statusCode, 404);
    await teardown();
  });
});
