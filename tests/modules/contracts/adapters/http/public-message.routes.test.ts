/**
 * Mensagem pública nas respostas de erro do plugin de contracts (CAS-105): nenhum 4xx mostra o
 * código interno em `message`, e nenhum 5xx mostra frase específica.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { buildApp } from '#src/shared/http/app.ts';
import { err } from '#src/shared/primitives/result.ts';
import { GENERIC_PUBLIC_MESSAGES } from '#src/shared/http/public-message.ts';
import {
  authHttpPlugin,
  buildAuthHttpDeps,
  makeRequireAuth,
} from '#src/modules/auth/public-api/http.ts';
import {
  contractsHttpPlugin,
  buildContractsHttpDeps,
} from '#src/modules/contracts/public-api/http.ts';
import type { ContractsHttpDeps } from '#src/modules/contracts/adapters/http/composition.ts';
import { buildContract } from '../persistence/fixtures.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const USER_EMAIL = 'public.message@example.com';
const CONTRACT_ID = '11111111-1111-4111-8111-111111111111';
const DOCUMENT_ID = '33333333-3333-4333-8333-333333333333';

const makeApp = async (withDeps: (deps: ContractsHttpDeps) => ContractsHttpDeps) => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [
        { email: USER_EMAIL, password: STRONG, permissions: ['contract:read', 'contract:write'] },
      ],
    },
  });
  const contractsDeps = await buildContractsHttpDeps({
    driver: 'memory',
    seed: { contracts: [buildContract({ id: CONTRACT_ID, sequentialNumber: '001/2026' })] },
  });
  const app = await buildApp({
    routes: [
      authHttpPlugin(authDeps),
      contractsHttpPlugin(withDeps(contractsDeps), {
        requireAuth: makeRequireAuth(authDeps.verifyAccessToken),
        authorize: authDeps.authorize,
      }),
    ],
  });
  const login = await app.inject({
    method: 'POST',
    url: '/api/v2/auth/login',
    payload: { email: USER_EMAIL, password: STRONG },
  });
  const token = (login.json() as { accessToken: string }).accessToken;
  const teardown = async (): Promise<void> => {
    await app.close();
    await contractsDeps.shutdown();
    await authDeps.shutdown();
  };
  return { app, token, teardown };
};

interface ErrorBody {
  readonly error: Readonly<{ code: string; message: string }>;
}

describe('contracts — 5xx nunca mostra frase específica', () => {
  it('502 storage-permission-denied: frase genérica interna, code inalterado', async () => {
    const { app, token, teardown } = await makeApp((d) => ({
      ...d,
      getDocumentContent: () => Promise.resolve(err('storage-permission-denied')),
    }));
    const res = await app.inject({
      method: 'GET',
      url: `/api/v2/contracts/${CONTRACT_ID}/documents/${DOCUMENT_ID}/content`,
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 502, res.body);
    const body = res.json() as ErrorBody;
    assert.equal(body.error.code, 'storage-permission-denied');
    assert.equal(body.error.message, GENERIC_PUBLIC_MESSAGES.internal);
    await teardown();
  });

  it('503 contract-repo-unavailable por sendDomainError: frase genérica interna, code inalterado', async () => {
    const { app, token, teardown } = await makeApp((d) => ({
      ...d,
      cancelContract: () => Promise.resolve(err('contract-repo-unavailable')),
    }));
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v2/contracts/${CONTRACT_ID}`,
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 503, res.body);
    const body = res.json() as ErrorBody;
    assert.equal(body.error.code, 'contract-repo-unavailable');
    assert.equal(body.error.message, GENERIC_PUBLIC_MESSAGES.internal);
    await teardown();
  });
});
