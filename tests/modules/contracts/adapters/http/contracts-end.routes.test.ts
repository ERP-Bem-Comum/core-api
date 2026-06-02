/**
 * CONTRACTS-HTTP-END (C2) — W0 (RED) — encerramento de contrato com RBAC.
 *
 * DEVE FALHAR: a rota `POST /contracts/:id/end` ainda não existe; `buildContractsHttpDeps`
 * ainda não wira o use case `endContract`. GREEN quando o W1 entregar `endContractBodySchema`,
 * o wiring no composition e a rota no plugin.
 *
 * Driver memory (sem Docker). Token COM `contract:write` vem do seed RBAC; token SEM permissão
 * vem do register normal (roles:[]). O clock da composição HTTP é `ClockReal` (hoje > 2026):
 *  - `Expire` feliz exige contrato Active com data fim no PASSADO (período 2020) → now > end.
 *  - `Expire` prematuro usa contrato Active com data fim no FUTURO (período 2030).
 *  - `Terminate` (distrato) não depende de data — qualquer Active serve.
 *
 * Mapeamento erro→HTTP (SPEC §3): 400 Zod · 404 not-found · 409 ContractNotActive ·
 * 422 ContractCannotExpireYet · 200 encerramento.
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
const WRITER_EMAIL = 'writer@example.com'; // seed RBAC: tem 'contract:write'
const PLAIN_EMAIL = 'plain@example.com'; // register normal: roles:[] (sem permissão)

// IDs do seed (UUIDs v4 válidos)
const ACTIVE_PAST_ID = '11111111-1111-4111-8111-111111111111'; // data fim no passado → Expire OK
const ACTIVE_FUTURE_ID = '12121212-1212-4121-8121-121212121212'; // data fim no futuro → Expire prematuro
const ACTIVE_TERMINATE_ID = '13131313-1313-4131-8131-131313131313'; // distrato
const PENDING_ID = '99999999-9999-4999-8999-999999999999'; // não-Active → 409
const MISSING_CONTRACT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const makeApp = async () => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: { users: [{ email: WRITER_EMAIL, password: STRONG, permissions: ['contract:write'] }] },
  });
  const contractsDeps = await buildContractsHttpDeps({
    driver: 'memory',
    seed: {
      contracts: [
        buildContract({
          id: ACTIVE_PAST_ID,
          sequentialNumber: '001/2026',
          periodStartISO: '2020-01-01',
          periodEndISO: '2020-12-31',
        }),
        buildContract({
          id: ACTIVE_FUTURE_ID,
          sequentialNumber: '002/2026',
          periodStartISO: '2030-01-01',
          periodEndISO: '2030-12-31',
        }),
        buildContract({ id: ACTIVE_TERMINATE_ID, sequentialNumber: '003/2026' }),
        buildPendingContract({ id: PENDING_ID, sequentialNumber: '900/2026' }),
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

const loginSeeded = async (app: App, email: string): Promise<string> => {
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
  return loginSeeded(app, email);
};

const bearer = (token: string): Record<string, string> => ({ authorization: `Bearer ${token}` });

const endUrl = (id: string): string => `/api/v2/contracts/${id}/end`;

describe('CONTRACTS-HTTP-END (C2) — POST /contracts/:id/end', () => {
  it('CA7: sem Authorization -> 401', async () => {
    const { app, teardown } = await makeApp();
    const res = await app.inject({
      method: 'POST',
      url: endUrl(ACTIVE_TERMINATE_ID),
      payload: { kind: 'Terminate' },
    });
    assert.equal(res.statusCode, 401);
    await teardown();
  });

  it('CA7: token sem contract:write -> 403', async () => {
    const { app, teardown } = await makeApp();
    const token = await registerAndLogin(app, PLAIN_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: endUrl(ACTIVE_TERMINATE_ID),
      headers: bearer(token),
      payload: { kind: 'Terminate' },
    });
    assert.equal(res.statusCode, 403);
    await teardown();
  });

  it('CA1: Terminate sobre Active -> 200 + status Terminated', async () => {
    const { app, teardown } = await makeApp();
    const token = await loginSeeded(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: endUrl(ACTIVE_TERMINATE_ID),
      headers: bearer(token),
      payload: { kind: 'Terminate' },
    });
    assert.equal(res.statusCode, 200);
    assert.equal((res.json() as { status: string }).status, 'Terminated');
    await teardown();
  });

  it('CA2: Expire sobre Active com data fim no passado -> 200 + status Expired', async () => {
    const { app, teardown } = await makeApp();
    const token = await loginSeeded(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: endUrl(ACTIVE_PAST_ID),
      headers: bearer(token),
      payload: { kind: 'Expire' },
    });
    assert.equal(res.statusCode, 200);
    assert.equal((res.json() as { status: string }).status, 'Expired');
    await teardown();
  });

  it('CA3: kind ausente -> 400 (Zod)', async () => {
    const { app, teardown } = await makeApp();
    const token = await loginSeeded(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: endUrl(ACTIVE_TERMINATE_ID),
      headers: bearer(token),
      payload: {},
    });
    assert.equal(res.statusCode, 400);
    await teardown();
  });

  it('CA3: kind fora do enum -> 400 (Zod)', async () => {
    const { app, teardown } = await makeApp();
    const token = await loginSeeded(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: endUrl(ACTIVE_TERMINATE_ID),
      headers: bearer(token),
      payload: { kind: 'Cancel' },
    });
    assert.equal(res.statusCode, 400);
    await teardown();
  });

  it('CA4: contrato inexistente -> 404', async () => {
    const { app, teardown } = await makeApp();
    const token = await loginSeeded(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: endUrl(MISSING_CONTRACT_ID),
      headers: bearer(token),
      payload: { kind: 'Terminate' },
    });
    assert.equal(res.statusCode, 404);
    await teardown();
  });

  it('CA5: contrato não-Active (Pending) -> 409', async () => {
    const { app, teardown } = await makeApp();
    const token = await loginSeeded(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: endUrl(PENDING_ID),
      headers: bearer(token),
      payload: { kind: 'Terminate' },
    });
    assert.equal(res.statusCode, 409);
    await teardown();
  });

  it('CA6: Expire antes da data fim -> 422 (ContractCannotExpireYet)', async () => {
    const { app, teardown } = await makeApp();
    const token = await loginSeeded(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: endUrl(ACTIVE_FUTURE_ID),
      headers: bearer(token),
      payload: { kind: 'Expire' },
    });
    assert.equal(res.statusCode, 422);
    await teardown();
  });
});

describe('CONTRACTS-HTTP-END (C2) — OpenAPI', () => {
  it('CA8: documento OpenAPI expõe POST /api/v2/contracts/{id}/end', async () => {
    const { app, teardown } = await makeApp();
    const res = await app.inject({ method: 'GET', url: '/docs/json' });
    const doc = res.json() as { paths: Record<string, { post?: unknown }> };
    const path = doc.paths['/api/v2/contracts/{id}/end'];
    assert.ok(path?.post !== undefined, 'POST /api/v2/contracts/{id}/end ausente no OpenAPI');
    await teardown();
  });
});
