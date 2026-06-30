/**
 * FIN-APPROVER-LIMIT-POLICY (#289) — CA6/CA9: borda HTTP do gate de alçada do aprovador no
 * lançamento de documento (`POST /api/v2/financial/documents`).
 *
 * Espelha `reference-read-rbac.real-authorize.http.test.ts`: auth REAL (memory) + login real
 * (`POST /api/v2/auth/login`) para o operador que cria o documento. O driver `auth` memory NÃO
 * implementa a projeção `ApproverAuthorityReadPort` (só o adapter Drizzle implementa — #207/#289),
 * então a alçada do aprovador é controlada injetando um `authUserReadPort` FAKE em
 * `buildFinancialHttpDeps` (`AuthUserReadPort & ApproverAuthorityReadPort`): `getApproverAuthority`
 * devolve a alçada configurada para o `APPROVER_ID` semeado e `ok(null)` para qualquer outro id.
 *
 * - CA6/CA9 (a): alçada (`approvalLimitCents`) MENOR que o líquido → 422, `message` PT, slug
 *   interno (`approver-limit-exceeded`) NUNCA aparece no body.
 * - CA6 (b): alçada MAIOR/IGUAL ao líquido → 201.
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
const WRITER_EMAIL = 'writer.approverlimit@example.com';

// Aprovador é referenciado por id (não precisa logar) — a autoridade dele é controlada pelo fake
// authUserReadPort abaixo, não pelo RBAC real do auth.
const APPROVER_ID = '33333333-3333-4333-8333-333333333333';

type AppHandle = Awaited<ReturnType<typeof buildApp>>;

// Fake: resolve alçada só do APPROVER_ID configurado; qualquer outro id → ok(null) (sem alçada).
const fakeApproverAuthorityPort = (
  limitCents: number,
): AuthUserReadPort & ApproverAuthorityReadPort => ({
  getUserName: () => Promise.resolve(ok(null)),
  getApproverAuthority: (userId: string) =>
    Promise.resolve(ok(userId === APPROVER_ID ? { userId, canApprove: true, limitCents } : null)),
  listApproversWithAuthority: () => Promise.resolve(ok([])),
});

const makeApp = async (
  limitCents: number,
): Promise<{ app: AppHandle; teardown: () => Promise<void> }> => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    sensitiveRateLimit: { max: 1000, timeWindow: '1 minute' },
    seed: {
      users: [{ email: WRITER_EMAIL, password: STRONG, permissions: [...adminDevPermissions] }],
    },
  });
  const finDeps = await buildFinancialHttpDeps({
    driver: 'memory',
    authUserReadPort: fakeApproverAuthorityPort(limitCents),
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
    payload: { email: WRITER_EMAIL, password: STRONG },
  });
  assert.equal(res.statusCode, 200, `login: ${res.statusCode} ${res.body}`);
  return (res.json() as { accessToken: string }).accessToken;
};

// Boleto sem retenções: líquido = bruto = 100000 centavos.
const documentBody = () => ({
  type: 'Boleto',
  documentNumber: 'BOL-APPROVER-LIMIT-1',
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
  approverRef: APPROVER_ID,
});

describe('#289 — alçada do aprovador no lançamento de documento (CA6/CA9)', () => {
  describe('CA6/CA9 (a) — alçada insuficiente', () => {
    let app: AppHandle;
    let teardown: () => Promise<void>;

    before(async () => {
      ({ app, teardown } = await makeApp(50_000)); // alçada 50000 < líquido 100000
    });

    after(async () => {
      await teardown();
    });

    it('422, message PT, sem o slug interno no body', async () => {
      const token = await login(app);
      const res = await app.inject({
        method: 'POST',
        url: '/api/v2/financial/documents',
        headers: { authorization: `Bearer ${token}` },
        payload: documentBody(),
      });

      assert.equal(res.statusCode, 422, res.body);
      const body = res.json() as { error: { code: string; message: string } };
      assert.match(body.error.message, /alçada/i);
      assert.equal(res.body.includes('approver-limit-exceeded'), false);
    });
  });

  describe('CA6 (b) — alçada suficiente', () => {
    let app: AppHandle;
    let teardown: () => Promise<void>;

    before(async () => {
      ({ app, teardown } = await makeApp(100_000)); // alçada 100000 >= líquido 100000
    });

    after(async () => {
      await teardown();
    });

    it('201 — documento criado', async () => {
      const token = await login(app);
      const res = await app.inject({
        method: 'POST',
        url: '/api/v2/financial/documents',
        headers: { authorization: `Bearer ${token}` },
        payload: documentBody(),
      });

      assert.equal(res.statusCode, 201, res.body);
    });
  });
});
