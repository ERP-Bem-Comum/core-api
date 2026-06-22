/**
 * W0 RED (022-contracts-list-authorize · #202) — RBAC da listagem GET /api/v2/contracts
 * exercitado contra o `authorize` REAL (buildAuthHttpDeps + seed RBAC).
 *
 * Bug: a rota de listagem aplica só `requireAuth` (contracts/adapters/http/plugin.ts:178-180),
 * enquanto detalhe/histórico/exportação já exigem `contract:read`. Resultado: qualquer
 * autenticado lista contratos sem a permissão. (#202, achado de segurança.)
 *
 * Repro: `contract:read` JÁ está no catálogo (≠ #200) — o RED vem do caso NEGADO: usuário
 * autenticado SEM `contract:read` recebe 200 hoje, onde deveria receber 403.
 *
 * Deve FALHAR em W0 (US1/CA2: 403 esperado, mas a rota retorna 200).
 * Espelha o padrão de contracts-export-csv.routes.test.ts. Driver memory.
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
import type { Contract } from '#src/modules/contracts/domain/contract/types.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const READER_EMAIL = 'reader.list@example.com'; // seed RBAC: contract:read
const PLAIN_EMAIL = 'plain.list@example.com'; // register normal: roles:[]

const LIST_URL = '/api/v2/contracts';

const makeApp = async (seedContracts: readonly Contract[]) => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: { users: [{ email: READER_EMAIL, password: STRONG, permissions: ['contract:read'] }] },
  });
  const contractsDeps = await buildContractsHttpDeps({
    driver: 'memory',
    seed: { contracts: seedContracts },
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
  assert.equal(res.statusCode, 200, `login ${email}: ${res.statusCode} ${res.body}`);
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

const ONE_CONTRACT = [buildContract({ id: '11111111-1111-4111-8111-111111111111' })] as const;

describe('#202 — RBAC da listagem GET /contracts com authorize REAL', () => {
  describe('US1 — usuário sem contract:read é barrado', () => {
    it('CA1: sem Authorization -> 401', async () => {
      const { app, teardown } = await makeApp(ONE_CONTRACT);
      const res = await app.inject({ method: 'GET', url: LIST_URL });
      assert.equal(res.statusCode, 401, res.body);
      await teardown();
    });

    it('CA2: autenticado SEM contract:read -> 403 (hoje 200 = vazamento)', async () => {
      const { app, teardown } = await makeApp(ONE_CONTRACT);
      const token = await registerAndLogin(app, PLAIN_EMAIL);
      const res = await app.inject({ method: 'GET', url: LIST_URL, headers: bearer(token) });
      assert.equal(res.statusCode, 403, `esperado 403 sem contract:read, veio ${res.statusCode}`);
      await teardown();
    });
  });

  describe('US2 — usuário com contract:read continua listando', () => {
    it('CA3: com contract:read -> 200 (com e sem filtro)', async () => {
      const { app, teardown } = await makeApp(ONE_CONTRACT);
      const token = await loginSeeded(app, READER_EMAIL);
      const semFiltro = await app.inject({ method: 'GET', url: LIST_URL, headers: bearer(token) });
      assert.equal(semFiltro.statusCode, 200, semFiltro.body);
      const comFiltro = await app.inject({
        method: 'GET',
        url: `${LIST_URL}?status=Pending`,
        headers: bearer(token),
      });
      assert.equal(comFiltro.statusCode, 200, comFiltro.body);
      await teardown();
    });
  });
});
