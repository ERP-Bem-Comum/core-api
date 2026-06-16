/**
 * PARTNERS-EXPORT-PARITY-HTTP — W0 (RED) — GET /collaborators|financiers|acts/export.
 *
 * DEVE FALHAR: as 3 rotas de export ainda não existem (404). GREEN quando o W1 as adicionar
 * aos respectivos plugins, reusando os serializers CSV. Espelha `suppliers-reads.routes.test.ts`.
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
  financiersHttpPlugin,
  actHttpPlugin,
  buildPartnersHttpDeps,
} from '#src/modules/partners/public-api/http.ts';
import {
  COLLABORATOR_PERMISSION,
  FINANCIER_PERMISSION,
  ACT_PERMISSION,
} from '#src/modules/partners/public-api/permissions.ts';
import * as Financier from '#src/modules/partners/domain/financier/financier.ts';
import * as FinancierId from '#src/modules/partners/domain/financier/financier-id.ts';
import * as Collaborator from '#src/modules/partners/domain/collaborator/collaborator.ts';
import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import * as Act from '#src/modules/partners/domain/act/act.ts';
import * as ActId from '#src/modules/partners/domain/act/act-id.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const NOW = new Date('2026-01-10T08:00:00.000Z');
const READER_EMAIL = 'leitor@example.com';
const NOPERM_EMAIL = 'sem.permissao@example.com';

const u = <T>(r: { ok: true; value: T } | { ok: false; error: unknown }): T => {
  if (!r.ok) throw new Error(`fixture: ${JSON.stringify(r.error)}`);
  return r.value;
};

const seed = () => ({
  financiers: [
    {
      financier: u(
        Financier.register({
          id: FinancierId.generate(),
          name: 'Beta',
          corporateName: 'Beta LTDA',
          legalRepresentative: 'Rep',
          cnpj: '11.444.777/0001-61',
          telephone: '+5511999998888',
          address: 'Av. Teste, 1',
          bankAccount: null,
          pixKey: null,
          registeredAt: NOW,
        }),
      ).financier,
      legacyId: null,
      createdAt: NOW,
      updatedAt: NOW,
    },
  ],
  collaborators: [
    {
      collaborator: u(
        Collaborator.register({
          id: CollaboratorId.generate(),
          name: 'Gama',
          email: 'gama@c.org',
          cpf: '111.444.777-35',
          occupationArea: 'PARC',
          role: 'Educador',
          startOfContract: NOW,
          employmentRelationship: 'CLT',
          registeredAt: NOW,
        }),
      ).collaborator,
      legacyId: null,
      createdAt: NOW,
      updatedAt: NOW,
    },
  ],
  acts: [
    {
      act: u(
        Act.register({
          id: ActId.generate(),
          actNumber: 'ACT-2026-010',
          name: 'Delta',
          email: 'delta@a.org',
          cnpj: '11.222.333/0001-81',
          corporateName: 'Delta Instituição LTDA',
          fantasyName: 'Delta',
          occupationArea: 'PARC',
          legalRepresentative: 'Representante Legal',
          startDate: '2026-01-01',
          endDate: '2026-12-31',
          hasFinancialTransfer: false,
          bankAccount: null,
          pixKey: null,
          registeredAt: NOW,
        }),
      ).act,
      legacyId: null,
      createdAt: NOW,
      updatedAt: NOW,
    },
  ],
});

const makeApp = async () => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [
        {
          email: READER_EMAIL,
          password: STRONG,
          permissions: [
            COLLABORATOR_PERMISSION.read,
            FINANCIER_PERMISSION.read,
            ACT_PERMISSION.read,
          ],
        },
        { email: NOPERM_EMAIL, password: STRONG, permissions: [] },
      ],
    },
  });
  const partnersDeps = await buildPartnersHttpDeps({ driver: 'memory', seed: seed() });
  const requireAuth = makeRequireAuth(authDeps.verifyAccessToken);
  const hooks = {
    requireAuth,
    authorize: authDeps.authorize,
    hasPermission: authDeps.hasPermission,
  };
  const app = await buildApp({
    routes: [
      authHttpPlugin(authDeps),
      { plugin: collaboratorsHttpPlugin(partnersDeps, hooks), prefix: '/api/v1' },
      { plugin: financiersHttpPlugin(partnersDeps, hooks), prefix: '/api/v1' },
      {
        plugin: actHttpPlugin(partnersDeps, { requireAuth, authorize: authDeps.authorize }),
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

const EXPORTS = ['/collaborators/export', '/financiers/export', '/acts/export'] as const;

describe('PARTNERS-EXPORT-PARITY-HTTP — paridade de export CSV', () => {
  for (const url of EXPORTS) {
    it(`CA: ${url} 200 text/csv + headers de download`, async () => {
      const { app, teardown } = await makeApp();
      const token = await login(app, READER_EMAIL);
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1${url}`,
        headers: { authorization: `Bearer ${token}` },
      });
      assert.equal(res.statusCode, 200);
      assert.match(String(res.headers['content-type']), /text\/csv/);
      assert.match(String(res.headers['content-disposition']), /attachment/);
      assert.equal(res.headers['x-content-type-options'], 'nosniff');
      await teardown();
    });

    it(`CA: ${url} sem Authorization → 401`, async () => {
      const { app, teardown } = await makeApp();
      assert.equal((await app.inject({ method: 'GET', url: `/api/v1${url}` })).statusCode, 401);
      await teardown();
    });

    it(`CA: ${url} sem permissão → 403`, async () => {
      const { app, teardown } = await makeApp();
      const token = await login(app, NOPERM_EMAIL);
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1${url}`,
        headers: { authorization: `Bearer ${token}` },
      });
      assert.equal(res.statusCode, 403);
      await teardown();
    });
  }
});
