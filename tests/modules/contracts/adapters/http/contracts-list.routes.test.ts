/**
 * CONTRACTS-HTTP-COMPOSITION-RW (C0) — W0 (RED) — composition dual-pool + plugin + GET list.
 *
 * DEVE FALHAR: `buildContractsHttpDeps` e `contractsHttpPlugin` ainda não existem em
 * `#src/modules/contracts/public-api/http.ts`. GREEN quando o W1 entregar o composition
 * root (dual-pool RW split, ADR-0026) + o plugin factory protegido por `requireAuth` (do
 * auth) + a rota `GET /api/v2/contracts` (list, reader).
 *
 * Driver memory (sem Docker): reader=writer=mesmo store; lista vazia é válida. O split
 * físico (reader real) é validado no C5 (E2E mysql). O token vem do fluxo real auth
 * (register+login via app.inject), espelhando o smoke E2E auth.
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

const STRONG = 'Str0ng-Passphrase-2026!';
const EMAIL = 'operador@example.com';

const makeApp = async () => {
  const authDeps = await buildAuthHttpDeps({ driver: 'memory' });
  const contractsDeps = await buildContractsHttpDeps({ driver: 'memory' });
  const requireAuth = makeRequireAuth(authDeps.verifyAccessToken);
  const app = await buildApp({
    routes: [
      authHttpPlugin(authDeps),
      contractsHttpPlugin(contractsDeps, { requireAuth, authorize: authDeps.authorize }),
    ],
  });
  const teardown = async (): Promise<void> => {
    await app.close();
    await contractsDeps.shutdown();
    await authDeps.shutdown();
  };
  return { app, teardown };
};

const login = async (app: Awaited<ReturnType<typeof buildApp>>): Promise<string> => {
  await app.inject({
    method: 'POST',
    url: '/api/v2/auth/register',
    payload: { email: EMAIL, password: STRONG },
  });
  const res = await app.inject({
    method: 'POST',
    url: '/api/v2/auth/login',
    payload: { email: EMAIL, password: STRONG },
  });
  return (res.json() as { accessToken: string }).accessToken;
};

describe('CONTRACTS-HTTP (C0) — GET /api/v2/contracts', () => {
  it('CA1: sem Authorization -> 401', async () => {
    const { app, teardown } = await makeApp();
    const res = await app.inject({ method: 'GET', url: '/api/v2/contracts' });
    assert.equal(res.statusCode, 401);
    await teardown();
  });

  it('CA1: Bearer inválido -> 401', async () => {
    const { app, teardown } = await makeApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v2/contracts',
      headers: { authorization: 'Bearer not-a-jwt' },
    });
    assert.equal(res.statusCode, 401);
    await teardown();
  });

  it('CA2: com Bearer <accessToken válido> -> 200 e array (vazio em memory é válido)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v2/contracts',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 200);
    assert.ok(Array.isArray(res.json()));
    await teardown();
  });

  it('CA3: /docs/json contém o path /api/v2/contracts', async () => {
    const { app, teardown } = await makeApp();
    const res = await app.inject({ method: 'GET', url: '/docs/json' });
    const doc = res.json() as { paths: Record<string, unknown> };
    assert.ok(Object.prototype.hasOwnProperty.call(doc.paths, '/api/v2/contracts'));
    await teardown();
  });
});

describe('CONTRACTS-HTTP (C0) — composition dual-pool (ADR-0026)', () => {
  it('CA4: driver memory resolve (reader=writer) e expõe listContracts + shutdown', async () => {
    const deps = await buildContractsHttpDeps({ driver: 'memory' });
    assert.equal(typeof deps.listContracts, 'function');
    assert.equal(typeof deps.shutdown, 'function');
    const r = await deps.listContracts();
    assert.equal(r.ok, true);
    await deps.shutdown();
  });

  it('CA4: driver mysql exige writerUrl — ausente -> rejeita (sem Docker)', async () => {
    await assert.rejects(() => buildContractsHttpDeps({ driver: 'mysql' }));
  });

  it('CA4: driver mysql com writerUrl inválido -> rejeita no openMysql (valida wiring do branch, sem conectar)', async () => {
    await assert.rejects(() =>
      buildContractsHttpDeps({ driver: 'mysql', writerUrl: 'not-a-mysql-url' }),
    );
  });
});
