/**
 * FIN-APPROVE-AUTHORITY-ENFORCE (#609) — borda HTTP do gate de alçada no ATO de aprovar
 * (`POST /api/v2/financial/documents/:id/approve`).
 *
 * Achado M1 do W2: as CAs da issue estão escritas em linguagem de borda ("quando ele chama
 * approve"), mas só haviam sido provadas no use case. Este arquivo fecha a lacuna.
 *
 * Molde: `document-approver-limit.http.test.ts` (#289), que cobre o mesmo gate no LANÇAMENTO.
 * A diferença que este teste existe para provar: ali a alçada checada é a do `approverRef`
 * INDICADO; aqui é a de QUEM CHAMA o endpoint.
 *
 * Por isso o documento é criado SEM `approverRef` — assim a criação não dispara a validação do
 * #289 e o único gate exercitado é o do approve.
 *
 * Driver memory, sem `MYSQL_INTEGRATION`.
 */

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';

import { ok } from '#src/shared/primitives/result.ts';
import { buildApp } from '#src/shared/http/app.ts';
import { readHttpConfig } from '#src/shared/http/config.ts';
import {
  authHttpPlugin,
  buildAuthHttpDeps,
  makeRequireAuth,
} from '#src/modules/auth/public-api/http.ts';
import {
  financialHttpPlugin,
  buildFinancialHttpDeps,
} from '#src/modules/financial/public-api/http.ts';
import type {
  AuthUserReadPort,
  ApproverAuthorityReadPort,
} from '#src/modules/auth/public-api/read.ts';
import { adminDevPermissions } from '#src/modules/auth/adapters/http/dev-seed.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const APPROVER_EMAIL = 'approver.authority@example.com';

type AppHandle = Awaited<ReturnType<typeof buildApp>>;

/**
 * Devolve a alçada para QUALQUER id — o teste não precisa conhecer o id do usuário logado, e no
 * approve o único id consultado é o do chamador.
 */
const fakeAuthorityPort = (
  limitCents: number | null,
): AuthUserReadPort & ApproverAuthorityReadPort => ({
  getUserName: () => Promise.resolve(ok(null)),
  getApproverAuthority: (userId: string) =>
    Promise.resolve(ok({ userId, canApprove: true, limitCents })),
  listApproversWithAuthority: () => Promise.resolve(ok([])),
});

const makeApp = async (
  limitCents: number | null,
): Promise<{ app: AppHandle; teardown: () => Promise<void> }> => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    sensitiveRateLimit: { max: 1000, timeWindow: '1 minute' },
    seed: {
      users: [{ email: APPROVER_EMAIL, password: STRONG, permissions: [...adminDevPermissions] }],
    },
  });
  const finDeps = await buildFinancialHttpDeps({
    driver: 'memory',
    authUserReadPort: fakeAuthorityPort(limitCents),
  });

  const requireAuth = makeRequireAuth(authDeps.verifyAccessToken);
  const config = readHttpConfig({ RATE_LIMIT_MAX: '10000' });
  const app = await buildApp({
    config,
    routes: [
      authHttpPlugin(authDeps),
      financialHttpPlugin(finDeps, { requireAuth, authorize: authDeps.authorize }),
    ],
  });

  const teardown = async (): Promise<void> => {
    await app.close();
    await finDeps.shutdown();
    await authDeps.shutdown();
  };
  return { app, teardown };
};

const login = async (app: AppHandle): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v2/auth/login',
    payload: { email: APPROVER_EMAIL, password: STRONG },
  });
  assert.equal(res.statusCode, 200, `login: ${res.statusCode} ${res.body}`);
  return (res.json() as { accessToken: string }).accessToken;
};

/** Boleto sem retenções e SEM approverRef: líquido = bruto = 100000. */
const createOpenDocument = async (
  app: AppHandle,
  token: string,
  numero: string,
): Promise<{ id: string; version: number }> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v2/financial/documents',
    headers: { authorization: `Bearer ${token}` },
    payload: {
      type: 'Boleto',
      documentNumber: numero,
      supplierRef: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      paymentMethod: 'PIX',
      grossValueCents: '100000',
      sourceDiscountsCents: '0',
      discountsCents: '0',
      penaltyCents: '0',
      interestCents: '0',
      retentions: [],
      registeredTaxes: [],
      dueDate: '2026-12-31',
      asDraft: false,
    },
  });
  assert.equal(res.statusCode, 201, `create: ${res.statusCode} ${res.body}`);
  const body = res.json() as { id: string; version: number };
  return { id: body.id, version: body.version };
};

const approve = (app: AppHandle, token: string, id: string, version: number) =>
  app.inject({
    method: 'POST',
    url: `/api/v2/financial/documents/${id}/approve`,
    headers: { authorization: `Bearer ${token}` },
    payload: { version },
  });

describe('#609 — alçada do CHAMADOR no ato de aprovar (borda HTTP)', () => {
  describe('alçada insuficiente do chamador', () => {
    let app: AppHandle;
    let teardown: () => Promise<void>;

    before(async () => {
      ({ app, teardown } = await makeApp(50_000)); // alçada 50000 < líquido 100000
    });
    after(async () => {
      await teardown();
    });

    it('422, mensagem PT, e o slug interno NUNCA aparece no body', async () => {
      const token = await login(app);
      const { id, version } = await createOpenDocument(app, token, 'BOL-APPROVE-AUTH-1');

      const res = await approve(app, token, id, version);

      assert.equal(res.statusCode, 422, `approve: ${res.statusCode} ${res.body}`);
      assert.equal(
        res.body.includes('approver-limit-exceeded'),
        false,
        'o slug interno vazou no body',
      );
      assert.match(res.body, /alçada/i);
    });

    it('o documento permanece Open apos a recusa', async () => {
      const token = await login(app);
      const { id, version } = await createOpenDocument(app, token, 'BOL-APPROVE-AUTH-2');

      await approve(app, token, id, version);

      const res = await app.inject({
        method: 'GET',
        url: `/api/v2/financial/documents/${id}`,
        headers: { authorization: `Bearer ${token}` },
      });
      assert.equal(res.statusCode, 200);
      assert.equal((res.json() as { status: string }).status, 'Open');
    });
  });

  describe('alçada suficiente do chamador', () => {
    let app: AppHandle;
    let teardown: () => Promise<void>;

    before(async () => {
      ({ app, teardown } = await makeApp(999_999_999));
    });
    after(async () => {
      await teardown();
    });

    it('200 e documento Approved (sem regressao)', async () => {
      const token = await login(app);
      const { id, version } = await createOpenDocument(app, token, 'BOL-APPROVE-AUTH-3');

      const res = await approve(app, token, id, version);

      assert.equal(res.statusCode, 200, `approve: ${res.statusCode} ${res.body}`);
      assert.equal((res.json() as { status: string }).status, 'Approved');
    });
  });

  describe('alçada OPT-IN nao configurada (limitCents null)', () => {
    let app: AppHandle;
    let teardown: () => Promise<void>;

    before(async () => {
      ({ app, teardown } = await makeApp(null));
    });
    after(async () => {
      await teardown();
    });

    it('200 — regra binaria da P.O. (#299) preservada na borda', async () => {
      const token = await login(app);
      const { id, version } = await createOpenDocument(app, token, 'BOL-APPROVE-AUTH-4');

      const res = await approve(app, token, id, version);

      assert.equal(res.statusCode, 200, `approve: ${res.statusCode} ${res.body}`);
      assert.equal((res.json() as { status: string }).status, 'Approved');
    });
  });
});
