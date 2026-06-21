/**
 * FIN-APPROVER-LISTING (#148) — GET /api/v1/approvers: usuários com `payable:approve`.
 *
 * Completa o lado pendente de #148 (o approverRef no create já existe). Lista os aprovadores
 * para o front popular o dropdown. RBAC: gate `user:list` (é listagem de usuários). Driver memory.
 *
 * DEVE FALHAR em W0 — approversHttpPlugin / a rota /approvers ainda não existem.
 * ASCII puro (espelha users-list.route.test.ts).
 */

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';

import { buildApp } from '#src/shared/http/app.ts';
import {
  authHttpPlugin,
  buildAuthHttpDeps,
  makeRequireAuth,
  approversHttpPlugin,
} from '#src/modules/auth/public-api/http.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const ADMIN_EMAIL = 'admin.appr@example.com';
const APPROVER1_EMAIL = 'aprovador1@example.com';
const APPROVER2_EMAIL = 'aprovador2@example.com';
const PLAIN_EMAIL = 'sem.perm.appr@example.com';

type AppHandle = Awaited<ReturnType<typeof buildApp>>;

const makeApp = async (): Promise<{ app: AppHandle; teardown: () => Promise<void> }> => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [
        { email: ADMIN_EMAIL, password: STRONG, permissions: ['user:list'] },
        { email: APPROVER1_EMAIL, password: STRONG, permissions: ['payable:approve'] },
        { email: APPROVER2_EMAIL, password: STRONG, permissions: ['payable:approve', 'user:list'] },
        { email: PLAIN_EMAIL, password: STRONG, permissions: [] },
      ],
    },
  });

  const requireAuth = makeRequireAuth(authDeps.verifyAccessToken);
  const app = await buildApp({
    routes: [
      authHttpPlugin(authDeps),
      {
        plugin: approversHttpPlugin(
          { listUsersByPermission: authDeps.listUsersByPermission },
          { requireAuth, authorize: authDeps.authorize },
        ),
        prefix: '/api/v1',
      },
    ],
  });

  const teardown = async (): Promise<void> => {
    await app.close();
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
  assert.equal(res.statusCode, 200, `login ${email}: ${res.statusCode}`);
  return (res.json() as { accessToken: string }).accessToken;
};

interface ApproversBody {
  items: readonly { id: string; name: string | null; email: string }[];
}

describe('FIN-APPROVER-LISTING — GET /api/v1/approvers (#148)', () => {
  let app: AppHandle;
  let teardown: () => Promise<void>;
  let adminToken: string;

  before(async () => {
    ({ app, teardown } = await makeApp());
    adminToken = await login(app, ADMIN_EMAIL);
  });

  after(async () => {
    await teardown();
  });

  it('CA1: 401 sem Authorization', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/approvers' });
    assert.equal(res.statusCode, 401);
  });

  it('CA2: 403 com token sem user:list', async () => {
    const token = await login(app, PLAIN_EMAIL);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/approvers',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 403);
  });

  it('CA3: 200 → só usuários com payable:approve (exclui quem não tem)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/approvers',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as ApproversBody;
    const emails = body.items.map((u) => u.email).sort();
    assert.deepEqual(emails, [APPROVER1_EMAIL, APPROVER2_EMAIL].sort());
    // admin (user:list, sem payable:approve) e plain não aparecem.
    assert.ok(!emails.includes(ADMIN_EMAIL));
    assert.ok(!emails.includes(PLAIN_EMAIL));
  });
});
