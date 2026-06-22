/**
 * W0 RED (021-reference-read-permission · #200) — RBAC dos endpoints de referência da 020
 * exercitado contra o `authorize` REAL (não o fake de header dos demais *.http.test.ts).
 *
 * GET /api/v2/financial/{categories,cost-centers,programs} exigem `reference:read`. O bug #200:
 * `reference:read` falta no catálogo central (`auth/.../permission-catalog.ts#CATALOG_RAW`), então
 * nem o admin (que recebe `PermissionCatalog.all` via dev-seed) a tem → 403 para TODOS.
 *
 * Repro FIEL (e guard anti-regressão de SC-004): o ator privilegiado é semeado com
 * `adminDevPermissions` (= `PermissionCatalog.all`). Se `reference:read` NÃO está no catálogo,
 * `.all` não a contém → admin recebe 403 (RED). Quando a permissão entrar no catálogo (W1),
 * `.all` passa a contê-la → 200 (GREEN). NÃO semear `['reference:read']` cru: o seed usa
 * `Role.create` (sem validação ⊆ catálogo), o que mascararia o gap igual ao fake de header.
 *
 * Deve FALHAR em W0 (US1: admin recebe 403 onde se espera 200).
 * ASCII puro (precaução Node 24 strip-types). Driver memory.
 */

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';

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
import { adminDevPermissions } from '#src/modules/auth/adapters/http/dev-seed.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const ADMIN_EMAIL = 'admin.refread@example.com';
const PLAIN_EMAIL = 'sem.perm.refread@example.com';

const REFERENCE_ENDPOINTS = [
  '/api/v2/financial/categories',
  '/api/v2/financial/cost-centers',
  '/api/v2/financial/programs',
] as const;

type AppHandle = Awaited<ReturnType<typeof buildApp>>;

const makeApp = async (): Promise<{ app: AppHandle; teardown: () => Promise<void> }> => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    // Teto alto no rate-limit sensível (login) p/ não esbarrar nos múltiplos logins do teste.
    sensitiveRateLimit: { max: 1000, timeWindow: '1 minute' },
    seed: {
      users: [
        // Admin recebe o catálogo COMPLETO (adminDevPermissions = PermissionCatalog.all):
        // a presença de reference:read aqui é função do catálogo, não hardcoded.
        { email: ADMIN_EMAIL, password: STRONG, permissions: [...adminDevPermissions] },
        // Usuário sem nenhuma permissão (caso negativo US2).
        { email: PLAIN_EMAIL, password: STRONG, permissions: [] },
      ],
    },
  });
  const finDeps = await buildFinancialHttpDeps({ driver: 'memory' });

  const requireAuth = makeRequireAuth(authDeps.verifyAccessToken);
  const config = readHttpConfig({ RATE_LIMIT_MAX: '10000' });
  const app = await buildApp({
    config,
    routes: [
      authHttpPlugin(authDeps),
      // authorize REAL do auth (ligado ao catálogo + permissões reais da role).
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

const login = async (app: AppHandle, email: string): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v2/auth/login',
    payload: { email, password: STRONG },
  });
  assert.equal(res.statusCode, 200, `login ${email}: ${res.statusCode} ${res.body}`);
  return (res.json() as { accessToken: string }).accessToken;
};

describe('#200 — reference:read RBAC com authorize REAL', () => {
  let app: AppHandle;
  let teardown: () => Promise<void>;

  before(async () => {
    ({ app, teardown } = await makeApp());
  });

  after(async () => {
    await teardown();
  });

  describe('US1 — usuário com o catálogo completo (admin) lê dados de referência', () => {
    it('CA1: 401 em todos os endpoints sem Authorization', async () => {
      for (const url of REFERENCE_ENDPOINTS) {
        const res = await app.inject({ method: 'GET', url });
        assert.equal(res.statusCode, 401, `${url} sem token deveria 401, veio ${res.statusCode}`);
      }
    });

    it('CA2: 200 nos 3 endpoints para o admin (reference:read via PermissionCatalog.all)', async () => {
      const token = await login(app, ADMIN_EMAIL);
      for (const url of REFERENCE_ENDPOINTS) {
        const res = await app.inject({
          method: 'GET',
          url,
          headers: { authorization: `Bearer ${token}` },
        });
        assert.equal(
          res.statusCode,
          200,
          `${url} com admin deveria 200 (reference:read no catálogo), veio ${res.statusCode}: ${res.body}`,
        );
      }
    });
  });

  describe('US2 — usuário sem reference:read é barrado', () => {
    it('CA3: 403 nos 3 endpoints para usuário sem a permissão', async () => {
      const token = await login(app, PLAIN_EMAIL);
      for (const url of REFERENCE_ENDPOINTS) {
        const res = await app.inject({
          method: 'GET',
          url,
          headers: { authorization: `Bearer ${token}` },
        });
        assert.equal(
          res.statusCode,
          403,
          `${url} sem permissão deveria 403, veio ${res.statusCode}: ${res.body}`,
        );
      }
    });
  });
});
