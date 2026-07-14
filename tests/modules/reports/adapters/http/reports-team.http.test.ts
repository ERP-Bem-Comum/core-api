/**
 * W0 RED — REPORTS-TEAM-ABC (REP-1 · #238). Borda GET /api/v2/reports/team — projeção Equipe ABC
 * (9 colunas LGPD-safe). RED por inexistência do módulo `reports`.
 *
 * CA1: 200 com as 9 colunas por collaborator (program: null — sem fonte no core-api).
 * CA2: RBAC — sem `collaborator:read` → 403; com → 200.
 * CA3: dado sensível (CPF/salário/etc.) NÃO aparece no payload.
 */

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import type { preHandlerAsyncHookHandler, LightMyRequestResponse } from 'fastify';

import { ok } from '#src/shared/primitives/result.ts';
import { buildApp } from '#src/shared/http/app.ts';
import { readHttpConfig } from '#src/shared/http/config.ts';
import { buildReportsHttpDeps, reportsHttpPlugin } from '#src/modules/reports/public-api/http.ts';
import type { TeamMember } from '#src/modules/reports/application/ports/team-report-read.ts';

const READER = 'collaborator:read';
const NO_PERM = 'reconciliation:read';
const TEST_USER_ID = '99999999-9999-4999-8999-999999999999';

const requireAuth: preHandlerAsyncHookHandler = async (req, reply) => {
  const auth = req.headers.authorization;
  if (typeof auth !== 'string' || !auth.startsWith('Bearer ')) {
    return reply.code(401).send({ error: { code: 'unauthorized', message: 'sem token' } });
  }
  (req as unknown as { userId: string }).userId = TEST_USER_ID;
  return undefined;
};
const authorize =
  (permission: string): preHandlerAsyncHookHandler =>
  async (req, reply) => {
    const perms = (req.headers.authorization ?? '').replace('Bearer ', '').split(',');
    if (!perms.includes(permission)) {
      return reply.code(403).send({ error: { code: 'forbidden', message: 'sem permissão' } });
    }
    return undefined;
  };

const member = (over: Partial<TeamMember> = {}): TeamMember => ({
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Maria Silva',
  program: null,
  role: 'Coordenadora',
  employmentRelationship: 'CLT',
  startOfContract: '2025-01-15',
  registrationStatus: 'Complete',
  active: true,
  education: 'Superior completo',
  experienceInPublicSector: true,
  ...over,
});

interface AppHandle {
  app: Awaited<ReturnType<typeof buildApp>>;
  teardown: () => Promise<void>;
}
let handle: AppHandle;

before(async () => {
  const base = await buildReportsHttpDeps({ driver: 'memory' });
  const deps = {
    ...base,
    listTeam: () =>
      Promise.resolve(
        ok([member(), member({ id: '22222222-2222-4222-8222-222222222222', name: 'João Souza' })]),
      ),
  };
  const config = readHttpConfig({ RATE_LIMIT_MAX: '10000' });
  const app = await buildApp({
    config,
    routes: [reportsHttpPlugin(deps, { requireAuth, authorize })],
  });
  handle = { app, teardown: () => app.close() };
});

after(async () => {
  await handle.teardown();
});

const get = (perm: string): Promise<LightMyRequestResponse> =>
  handle.app.inject({
    method: 'GET',
    url: '/api/v2/reports/team',
    headers: { authorization: `Bearer ${perm}` },
  });

describe('reports/http — GET /reports/team (REP-1 · #238)', () => {
  it('CA1: 200 com as 9 colunas LGPD-safe (program: null)', async () => {
    const res = await get(READER);
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as { team: TeamMember[] };
    assert.equal(body.team.length, 2);
    const m = body.team[0]!;
    assert.equal(m.name, 'Maria Silva');
    assert.equal(m.program, null, 'programa não existe no core-api → null');
    assert.equal(m.role, 'Coordenadora');
    assert.equal(m.registrationStatus, 'Complete');
    assert.equal(m.active, true);
    assert.equal(m.experienceInPublicSector, true);
  });

  it('CA2: RBAC — sem collaborator:read → 403', async () => {
    const res = await get(NO_PERM);
    assert.equal(res.statusCode, 403, res.body);
  });

  it('CA3: payload não vaza dado sensível (só as 9 colunas)', async () => {
    const res = await get(READER);
    const raw = res.body;
    for (const leak of ['cpf', 'rg', 'salary', 'salario', 'address', 'endereco', 'saude']) {
      assert.equal(raw.toLowerCase().includes(leak), false, `vazou campo sensível: ${leak}`);
    }
  });
});
