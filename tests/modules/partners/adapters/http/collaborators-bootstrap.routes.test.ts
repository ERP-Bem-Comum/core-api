/**
 * PARTNERS-HTTP-V1-BOOTSTRAP (P0) — W0 (RED) — bootstrap /api/v1 + GET /collaborators.
 *
 * DEVE FALHAR: `collaboratorsHttpPlugin` / `buildPartnersHttpDeps` (em
 * `#src/modules/partners/public-api/http.ts`) e `COLLABORATOR_PERMISSION` (em
 * `#src/modules/partners/public-api/permissions.ts`) ainda nao existem; `buildApp` ainda
 * nao aceita o shape `{ plugin, prefix }`. GREEN quando o W1 entregar: a uniao
 * retrocompativel de `routes` (ADR-0033), o composition root de partners (RW split,
 * ADR-0026), o catalogo de permissions e a rota `GET /api/v1/collaborators` protegida por
 * `requireAuth` + `authorize('collaborator:read')`.
 *
 * Driver memory (sem Docker): store vazio -> lista vazia e valida. O token vem do fluxo real
 * auth (seed RBAC + login via app.inject), espelhando contracts-list / authz-hook.
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

const STRONG = 'Str0ng-Passphrase-2026!';
const READER_EMAIL = 'rh.leitor@example.com'; // semeado COM collaborator:read
const NOPERM_EMAIL = 'sem.permissao@example.com'; // registrado pelo fluxo, sem permissao

const makeApp = async () => {
  // Seed RBAC: usuario com collaborator:read. Quem nao tem a permissao e registrado no fluxo.
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [
        { email: READER_EMAIL, password: STRONG, permissions: [COLLABORATOR_PERMISSION.read] },
      ],
    },
  });
  const partnersDeps = await buildPartnersHttpDeps({ driver: 'memory' });
  const requireAuth = makeRequireAuth(authDeps.verifyAccessToken);
  const app = await buildApp({
    routes: [
      // Forma legada (plugin direto) -> default /api/v2 (retrocompat, ADR-0033).
      authHttpPlugin(authDeps),
      // Forma nova (com prefix) -> /api/v1 (espelho do legado).
      {
        plugin: collaboratorsHttpPlugin(partnersDeps, {
          requireAuth,
          authorize: authDeps.authorize,
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

const login = async (app: Awaited<ReturnType<typeof buildApp>>, email: string): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v2/auth/login',
    payload: { email, password: STRONG },
  });
  return (res.json() as { accessToken: string }).accessToken;
};

const registerAndLogin = async (
  app: Awaited<ReturnType<typeof buildApp>>,
  email: string,
): Promise<string> => {
  await app.inject({
    method: 'POST',
    url: '/api/v2/auth/register',
    payload: { email, password: STRONG },
  });
  return login(app, email);
};

describe('PARTNERS-HTTP-V1 (P0) — GET /api/v1/collaborators', () => {
  it('CA: sem Authorization -> 401', async () => {
    const { app, teardown } = await makeApp();
    const res = await app.inject({ method: 'GET', url: '/api/v1/collaborators' });
    assert.equal(res.statusCode, 401);
    await teardown();
  });

  it('CA: Bearer inválido -> 401', async () => {
    const { app, teardown } = await makeApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/collaborators',
      headers: { authorization: 'Bearer not-a-jwt' },
    });
    assert.equal(res.statusCode, 401);
    await teardown();
  });

  it('CA: autenticado sem collaborator:read -> 403', async () => {
    const { app, teardown } = await makeApp();
    const token = await registerAndLogin(app, NOPERM_EMAIL);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/collaborators',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 403);
    await teardown();
  });

  it('CA: com collaborator:read -> 200 e { items, meta } (vazio em memory é válido)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, READER_EMAIL);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/collaborators',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 200);
    // Shape legado paginado (alinhado na P1b): meta.totalItems em vez de meta.total.
    const body = res.json() as { items: unknown[]; meta: { totalItems: number } };
    assert.ok(Array.isArray(body.items));
    assert.equal(body.meta.totalItems, 0);
    await teardown();
  });

  it('CA: resposta de /api/v1 traz cache-control: no-store (hardening)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, READER_EMAIL);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/collaborators',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.headers['cache-control'], 'no-store');
    await teardown();
  });

  it('CA: /docs/json contém o path /api/v1/collaborators', async () => {
    const { app, teardown } = await makeApp();
    const res = await app.inject({ method: 'GET', url: '/docs/json' });
    const doc = res.json() as { paths: Record<string, unknown> };
    assert.ok(Object.prototype.hasOwnProperty.call(doc.paths, '/api/v1/collaborators'));
    await teardown();
  });
});

describe('PARTNERS-HTTP-V1 (P0) — retrocompat do buildApp (auth segue em /api/v2)', () => {
  it('CA: register + login em /api/v2/auth (plugin direto) seguem funcionando', async () => {
    const { app, teardown } = await makeApp();
    const token = await registerAndLogin(app, 'regressao@example.com');
    assert.ok(token.length > 0);
    await teardown();
  });
});

describe('PARTNERS-HTTP-V1 (P0) — composition root (ADR-0026)', () => {
  it('CA: driver memory resolve e expõe listCollaborators + shutdown', async () => {
    const deps = await buildPartnersHttpDeps({ driver: 'memory' });
    assert.equal(typeof deps.listCollaborators, 'function');
    assert.equal(typeof deps.shutdown, 'function');
    const r = await deps.listCollaborators({});
    assert.equal(r.ok, true);
    await deps.shutdown();
  });

  it('CA: driver mysql sem writerUrl -> rejeita (sem Docker)', async () => {
    await assert.rejects(() => buildPartnersHttpDeps({ driver: 'mysql' }));
  });

  it('CA: driver mysql com writerUrl inválido -> rejeita no openMysql (valida wiring, sem conectar)', async () => {
    await assert.rejects(() =>
      buildPartnersHttpDeps({ driver: 'mysql', writerUrl: 'not-a-mysql-url' }),
    );
  });
});

describe('PARTNERS-HTTP-V1 (P0) — catálogo de permissions', () => {
  it('CA: COLLABORATOR_PERMISSION expõe read/write', () => {
    assert.equal(COLLABORATOR_PERMISSION.read, 'collaborator:read');
    assert.equal(COLLABORATOR_PERMISSION.write, 'collaborator:write');
  });
});
