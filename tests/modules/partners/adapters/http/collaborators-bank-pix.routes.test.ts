/**
 * PAR-PARTNER-BANK-PIX (US1). Banco/PIX (opcionais) no Colaborador.
 *
 * Em driver memory o reader e o writer são stores distintos; o POST testa a escrita (201/422)
 * e o detalhe é verificado por um seed no reader.
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
import type { CollaboratorReadRecord } from '#src/modules/partners/application/ports/collaborator-reader.ts';
import * as Collaborator from '#src/modules/partners/domain/collaborator/collaborator.ts';
import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const WRITER_EMAIL = 'rh.bank@example.com';
const NOW = new Date('2026-01-10T08:00:00.000Z');

const BANK = { bank: 'Banco X', agency: '0001', accountNumber: '12345', checkDigit: '6' };
const PIX = { keyType: 'email', key: 'colab@bemcomum.org' } as const;

const BODY = {
  name: 'Maria Silva',
  email: 'maria@bemcomum.org',
  cpf: '11144477735',
  occupationArea: 'PARC',
  role: 'Analista',
  startOfContract: '2026-01-10',
  employmentRelationship: 'CLT',
  bankAccount: BANK,
  pixKey: PIX,
};

const seedWithBankPix = (): { id: string; record: CollaboratorReadRecord } => {
  const id = CollaboratorId.generate();
  const r = Collaborator.register({
    id,
    name: 'Maria Silva',
    email: 'maria@bemcomum.org',
    cpf: '11144477735',
    occupationArea: 'PARC',
    role: 'Analista',
    startOfContract: NOW,
    employmentRelationship: 'CLT',
    bankAccount: BANK,
    pixKey: PIX,
    registeredAt: NOW,
  });
  assert.ok(r.ok, `fixture register: ${r.ok ? '' : r.error}`);
  return {
    id: String(id),
    record: { collaborator: r.value.collaborator, legacyId: 11, createdAt: NOW, updatedAt: NOW },
  };
};

const makeApp = async (collaborators: readonly CollaboratorReadRecord[] = []) => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [
        {
          email: WRITER_EMAIL,
          password: STRONG,
          permissions: [COLLABORATOR_PERMISSION.write, COLLABORATOR_PERMISSION.read],
        },
      ],
    },
  });
  const partnersDeps = await buildPartnersHttpDeps({ driver: 'memory', seed: { collaborators } });
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

const login = async (app: Awaited<ReturnType<typeof buildApp>>): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v2/auth/login',
    payload: { email: WRITER_EMAIL, password: STRONG },
  });
  return (res.json() as { accessToken: string }).accessToken;
};

describe('COLLABORATORS — banco/PIX (US1)', () => {
  it('CA2: POST /collaborators com bankAccount+pixKey válidos → 201', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app);
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/collaborators',
      headers: { authorization: `Bearer ${token}` },
      payload: BODY,
    });
    assert.equal(created.statusCode, 201);
    await teardown();
  });

  it('CA2: GET /collaborators/:id retorna bankAccount e pixKey persistidos (via seed)', async () => {
    const { id, record } = seedWithBankPix();
    const { app, teardown } = await makeApp([record]);
    const token = await login(app);
    const detail = await app.inject({
      method: 'GET',
      url: `/api/v1/collaborators/${id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(detail.statusCode, 200);
    const body = detail.json() as { bankAccount: unknown; pixKey: unknown };
    assert.deepEqual(body.bankAccount, BANK);
    assert.deepEqual(body.pixKey, PIX);
    await teardown();
  });

  it('CA3: agency fora do formato (4 díg + DV) → 422', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app);
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/collaborators',
      headers: { authorization: `Bearer ${token}` },
      payload: { ...BODY, bankAccount: { ...BANK, agency: '12' } },
    });
    assert.equal(res.statusCode, 422);
    await teardown();
  });

  it('CA6: banco/PIX são opcionais — POST sem eles → 201', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app);
    const { bankAccount: _b, pixKey: _p, ...noBank } = BODY;
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/collaborators',
      headers: { authorization: `Bearer ${token}` },
      payload: noBank,
    });
    assert.equal(res.statusCode, 201);
    await teardown();
  });
});
