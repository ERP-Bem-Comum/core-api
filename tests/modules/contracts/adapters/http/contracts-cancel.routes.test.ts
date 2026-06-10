/**
 * CTR-HTTP-CANCEL-PENDING — W0 (RED) — DELETE /contracts/:id (ADR-0039).
 *
 * DEVE FALHAR: hoje o DELETE responde 405 `contract-delete-forbidden` incondicional. GREEN no W1,
 * quando: Pending → 200 (contrato Cancelled); não-Pending → 409 `contract-not-pending`; inexistente
 * → 404; sem permissão → 401/403.
 *
 * Driver memory (sem Docker). `contract:write` vem do seed RBAC.
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
  contractsHttpPlugin,
  buildContractsHttpDeps,
} from '#src/modules/contracts/public-api/http.ts';

import { buildContract, buildPendingContract } from '../persistence/fixtures.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const WRITER_EMAIL = 'writer@example.com';
const PLAIN_EMAIL = 'plain@example.com';

const PENDING_ID = '99999999-9999-4999-8999-999999999999';
const ACTIVE_ID = '11111111-1111-4111-8111-111111111111';
const MISSING_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const makeApp = async () => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: { users: [{ email: WRITER_EMAIL, password: STRONG, permissions: ['contract:write'] }] },
  });
  const contractsDeps = await buildContractsHttpDeps({
    driver: 'memory',
    seed: {
      contracts: [
        buildPendingContract({ id: PENDING_ID, sequentialNumber: '900/2026' }),
        buildContract({ id: ACTIVE_ID, sequentialNumber: '001/2026' }),
      ],
    },
  });
  const app = await buildApp({
    routes: [
      authHttpPlugin(authDeps),
      contractsHttpPlugin(contractsDeps, {
        requireAuth: makeRequireAuth(authDeps.verifyAccessToken),
        authorize: authDeps.authorize,
      }),
    ],
  });
  const teardown = async (): Promise<void> => {
    await app.close();
    await contractsDeps.shutdown();
    await authDeps.shutdown();
  };
  return { app, teardown };
};

type App = Awaited<ReturnType<typeof buildApp>>;

const bearer = (token: string): Record<string, string> => ({ authorization: `Bearer ${token}` });

const login = async (app: App, email: string): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v2/auth/login',
    payload: { email, password: STRONG },
  });
  return (res.json() as { accessToken: string }).accessToken;
};

const registerAndLogin = async (app: App, email: string): Promise<string> => {
  await app.inject({
    method: 'POST',
    url: '/api/v2/auth/register',
    payload: { email, password: STRONG },
  });
  return login(app, email);
};

describe('CTR-HTTP-CANCEL-PENDING — DELETE /contracts/:id', () => {
  it('sem Authorization → 401', async () => {
    const { app, teardown } = await makeApp();
    const res = await app.inject({ method: 'DELETE', url: `/api/v2/contracts/${PENDING_ID}` });
    assert.equal(res.statusCode, 401);
    await teardown();
  });

  it('token sem contract:write → 403', async () => {
    const { app, teardown } = await makeApp();
    const token = await registerAndLogin(app, PLAIN_EMAIL);
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v2/contracts/${PENDING_ID}`,
      headers: bearer(token),
    });
    assert.equal(res.statusCode, 403);
    await teardown();
  });

  it('contrato Pendente → 200 + status Cancelled', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v2/contracts/${PENDING_ID}`,
      headers: bearer(token),
    });
    assert.equal(res.statusCode, 200);
    assert.equal((res.json() as { status: string }).status, 'Cancelled');
    await teardown();
  });

  it('contrato Active (não-Pendente) → 409', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v2/contracts/${ACTIVE_ID}`,
      headers: bearer(token),
    });
    assert.equal(res.statusCode, 409);
    await teardown();
  });

  it('contrato inexistente → 404', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v2/contracts/${MISSING_ID}`,
      headers: bearer(token),
    });
    assert.equal(res.statusCode, 404);
    await teardown();
  });
});
