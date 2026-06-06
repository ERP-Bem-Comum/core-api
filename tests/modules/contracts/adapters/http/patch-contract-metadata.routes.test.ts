/**
 * CONTRACTS-PATCH-METADATA-HTTP — W0 (RED) — PATCH metadados + DELETE recusado.
 *
 * PATCH /api/v2/contracts/:id: body `.strict()` só metadados (title/objective/observations/
 * email/telephone); campo imutável/chave extra → 400; corpo vazio → 400 (`.refine`);
 * title vazio → 400; inexistente → 404 (RBAC puro). DELETE /api/v2/contracts/:id → 405
 * (`contract-delete-forbidden`); sem sessão → 401 (não vaza rota).
 *
 * RED: rotas PATCH/DELETE de contrato não existem; `buildContractsHttpDeps` não expõe
 * `updateContractMetadata`.
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
import { buildContract } from '../persistence/fixtures.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const WRITER_EMAIL = 'writer@example.com';
const READER_EMAIL = 'reader@example.com';
const CONTRACT_ID = '11111111-1111-4111-8111-111111111111';
const MISSING_ID = '22222222-2222-4222-8222-222222222222';

const makeApp = async () => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [
        { email: WRITER_EMAIL, password: STRONG, permissions: ['contract:write'] },
        { email: READER_EMAIL, password: STRONG, permissions: ['contract:read'] },
      ],
    },
  });
  const contractsDeps = await buildContractsHttpDeps({
    driver: 'memory',
    seed: { contracts: [buildContract({ id: CONTRACT_ID })] },
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

const login = async (app: Awaited<ReturnType<typeof buildApp>>, email: string): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v2/auth/login',
    payload: { email, password: STRONG },
  });
  return (res.json() as { accessToken: string }).accessToken;
};

const bearer = (t: string): Record<string, string> => ({ authorization: `Bearer ${t}` });

const patch = async (
  app: Awaited<ReturnType<typeof buildApp>>,
  token: string,
  body: Record<string, unknown>,
  id = CONTRACT_ID,
) =>
  app.inject({
    method: 'PATCH',
    url: `/api/v2/contracts/${id}`,
    headers: bearer(token),
    payload: body,
  });

describe('CONTRACTS-PATCH-METADATA-HTTP — PATCH /contracts/:id', () => {
  it('CA1: metadados válidos -> 200 e reflete a mudança', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app, WRITER_EMAIL);
      const res = await patch(app, token, { title: 'Título novo', observations: 'obs' });
      assert.equal(res.statusCode, 200, res.body);
      const body = res.json() as { title: string; observations: string | null };
      assert.equal(body.title, 'Título novo');
      assert.equal(body.observations, 'obs');
    } finally {
      await teardown();
    }
  });

  it('CA2: campo imutável (originalValue) no body -> 400 (Zod .strict())', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app, WRITER_EMAIL);
      const res = await patch(app, token, { originalValue: { cents: 500000 } });
      assert.equal(res.statusCode, 400);
    } finally {
      await teardown();
    }
  });

  it('CA3: corpo vazio {} -> 400 (.refine ≥1 campo)', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app, WRITER_EMAIL);
      const res = await patch(app, token, {});
      assert.equal(res.statusCode, 400);
    } finally {
      await teardown();
    }
  });

  it('CA4: title vazio -> 400 (min(1))', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app, WRITER_EMAIL);
      const res = await patch(app, token, { title: '' });
      assert.equal(res.statusCode, 400);
    } finally {
      await teardown();
    }
  });

  it('CA5: contrato inexistente -> 404 (RBAC puro, sem tenant)', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app, WRITER_EMAIL);
      const res = await patch(app, token, { title: 'x' }, MISSING_ID);
      assert.equal(res.statusCode, 404);
    } finally {
      await teardown();
    }
  });

  it('CA6: sem Authorization -> 401', async () => {
    const { app, teardown } = await makeApp();
    try {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v2/contracts/${CONTRACT_ID}`,
        payload: { title: 'x' },
      });
      assert.equal(res.statusCode, 401);
    } finally {
      await teardown();
    }
  });

  it('CA7: token sem contract:write -> 403', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app, READER_EMAIL);
      const res = await patch(app, token, { title: 'x' });
      assert.equal(res.statusCode, 403);
    } finally {
      await teardown();
    }
  });
});

describe('CONTRACTS-PATCH-METADATA-HTTP — DELETE /contracts/:id recusado', () => {
  it('CA8: DELETE -> 405 contract-delete-forbidden (imutabilidade #14)', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app, WRITER_EMAIL);
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v2/contracts/${CONTRACT_ID}`,
        headers: bearer(token),
      });
      assert.equal(res.statusCode, 405);
      assert.equal(
        (res.json() as { error: { code: string } }).error.code,
        'contract-delete-forbidden',
      );
    } finally {
      await teardown();
    }
  });

  it('CA9: DELETE sem sessão -> 401 (não vaza existência da rota)', async () => {
    const { app, teardown } = await makeApp();
    try {
      const res = await app.inject({ method: 'DELETE', url: `/api/v2/contracts/${CONTRACT_ID}` });
      assert.equal(res.statusCode, 401);
    } finally {
      await teardown();
    }
  });
});
