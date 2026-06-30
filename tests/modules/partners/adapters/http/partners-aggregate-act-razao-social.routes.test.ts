/**
 * CON-ACT-CONTRACTOR-RAZAO-SOCIAL — W0 (RED) — GET /api/v1/partners identifica ACT pela razão social.
 *
 * O agregador de seleção (`GET /api/v1/partners`) deve projetar o item de **act** com
 * `name = corporateName` (razão social) — para a inclusão de contrato selecionar o ACT pela
 * razão social. RED até o W1: `actItem` em `partner-aggregate-query.ts` ainda usa `act.name`
 * (objeto do acordo).
 *
 * Driver memory; o seed cria um ACT com `name` (objeto) ≠ `corporateName` (razão social).
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
  partnersHttpPlugin,
  buildPartnersHttpDeps,
} from '#src/modules/partners/public-api/http.ts';
import {
  SUPPLIER_PERMISSION,
  FINANCIER_PERMISSION,
  COLLABORATOR_PERMISSION,
  ACT_PERMISSION,
} from '#src/modules/partners/public-api/permissions.ts';
import * as Act from '#src/modules/partners/domain/act/act.ts';
import * as ActId from '#src/modules/partners/domain/act/act-id.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const NOW = new Date('2026-01-10T08:00:00.000Z');
const FULL_EMAIL = 'leitor.total@example.com';
const ALL_READS = [
  SUPPLIER_PERMISSION.read,
  FINANCIER_PERMISSION.read,
  COLLABORATOR_PERMISSION.read,
  ACT_PERMISSION.read,
];

// Identificação do ACT: razão social (corporateName) ≠ objeto do acordo (name).
const ACT_CORPORATE_NAME = 'Instituição Parceira LTDA';
const ACT_OBJECT_NAME = 'Acordo de Cooperação Técnica 2026';

const u = <T>(r: { ok: true; value: T } | { ok: false; error: unknown }): T => {
  if (!r.ok) throw new Error(`fixture: ${JSON.stringify(r.error)}`);
  return r.value;
};

const seed = () => {
  const act = u(
    Act.register({
      id: ActId.generate(),
      actNumber: 'ACT-2026-010',
      name: ACT_OBJECT_NAME,
      email: 'parceira@a.org',
      cnpj: '11.222.333/0001-81',
      corporateName: ACT_CORPORATE_NAME,
      fantasyName: 'Parceira',
      occupationArea: 'PARC',
      legalRepresentative: 'Representante Legal',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      hasFinancialTransfer: false,
      bankAccount: null,
      pixKey: null,
      registeredAt: NOW,
    }),
  ).act;
  return {
    suppliers: [],
    financiers: [],
    collaborators: [],
    acts: [{ act, legacyId: null, createdAt: NOW, updatedAt: NOW }],
  };
};

const makeApp = async () => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: { users: [{ email: FULL_EMAIL, password: STRONG, permissions: ALL_READS }] },
  });
  const partnersDeps = await buildPartnersHttpDeps({ driver: 'memory', seed: seed() });
  const requireAuth = makeRequireAuth(authDeps.verifyAccessToken);
  const app = await buildApp({
    routes: [
      authHttpPlugin(authDeps),
      {
        plugin: partnersHttpPlugin(partnersDeps, {
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

type App = Awaited<ReturnType<typeof buildApp>>;

const login = async (app: App, email: string): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v2/auth/login',
    payload: { email, password: STRONG },
  });
  return (res.json() as { accessToken: string }).accessToken;
};

describe('CON-ACT-CONTRACTOR-RAZAO-SOCIAL — GET /api/v1/partners (item act)', () => {
  it('item de act tem name = razão social (corporateName), não o objeto do acordo', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app, FULL_EMAIL);
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/partners?type=act',
        headers: { authorization: `Bearer ${token}` },
      });
      assert.equal(res.statusCode, 200, res.body);
      const body = res.json() as { items: readonly { type: string; name: string }[] };
      assert.equal(body.items.length, 1);
      const act = body.items[0];
      assert.equal(act?.type, 'act');
      assert.equal(act?.name, ACT_CORPORATE_NAME);
      assert.notEqual(act?.name, ACT_OBJECT_NAME);
    } finally {
      await teardown();
    }
  });
});
