/**
 * COLLABORATORS-HTTP-E2E-SMOKE (P4-SMOKE) — smoke E2E da borda /api/v1/collaborators.
 *
 * Cliente Node + `fetch` contra o SERVIDOR REAL (`src/server.ts`) com partners em MySQL
 * (writer=root, reader=readonly_bi, mesmo banco `core`). NÃO usa app.inject. Orquestrado por
 * `pnpm run test:e2e:collaborators` (sobe compose+server, roda este smoke, teardown).
 *
 * Valida read-after-write via reader pool (ADR-0026) — POST (writer) refletido em GET /:id
 * (reader), algo que o driver memory (stores distintos) não exercita. RBAC via seed
 * (CORE_API_E2E + AUTH_SEED_JSON com collaborator:read+write).
 *
 * Sufixo `.e2e.ts` (não `.test.ts`) -> fora do glob de `pnpm test`. ASCII puro.
 */

import { describe, it, before } from 'node:test';
import { strict as assert } from 'node:assert';
import { setTimeout as delay } from 'node:timers/promises';

const BASE = process.env['E2E_BASE_URL'] ?? 'http://127.0.0.1:3100';
const READY_TIMEOUT_MS = Number.parseInt(process.env['E2E_READY_TIMEOUT_MS'] ?? '30000', 10);
const SEED_EMAIL = process.env['E2E_SEED_EMAIL'] ?? 'e2e-rh@example.com';
const SEED_PASSWORD = process.env['E2E_SEED_PASSWORD'] ?? 'Str0ng-Passphrase-2026!';

type Json = Record<string, unknown>;

const req = (method: string, path: string, token?: string, body?: Json): Promise<Response> =>
  fetch(`${BASE}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token === undefined ? {} : { authorization: `Bearer ${token}` }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

const get = (path: string, token?: string): Promise<Response> =>
  fetch(`${BASE}${path}`, {
    headers: token === undefined ? {} : { authorization: `Bearer ${token}` },
  });

const login = async (email: string, password: string): Promise<string> => {
  const res = await req('POST', '/api/v2/auth/login', undefined, { email, password });
  assert.equal(res.status, 200, `login de ${email} deve retornar 200`);
  return ((await res.json()) as { accessToken: string }).accessToken;
};

const waitReady = async (): Promise<void> => {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  let lastErr = 'sem tentativa';
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/health`);
      if (res.ok) return;
      lastErr = `status ${res.status}`;
    } catch (e) {
      lastErr = String(e);
    }
    await delay(500);
  }
  throw new Error(`server em ${BASE} nao respondeu /health em ${READY_TIMEOUT_MS}ms (${lastErr})`);
};

// CPF valido derivado do tempo nao e trivial; o MySQL e limpo a cada run (down -v), entao um
// CPF valido fixo basta para unicidade dentro da execucao.
const VALID_CPF = '11144477735';

describe('COLLABORATORS-HTTP-E2E-SMOKE — borda /api/v1 (server real + partners MySQL RW split)', () => {
  before(waitReady);

  it('CA1: GET /health -> 200', async () => {
    assert.equal((await get('/health')).status, 200);
  });

  it('CA2: GET /api/v1/collaborators sem token -> 401; sem permissao -> 403', async () => {
    assert.equal((await get('/api/v1/collaborators')).status, 401);

    const email = `e2e-plain-${Date.now()}@example.com`;
    await req('POST', '/api/v2/auth/register', undefined, { email, password: SEED_PASSWORD });
    const token = await login(email, SEED_PASSWORD);
    assert.equal((await get('/api/v1/collaborators', token)).status, 403);
  });

  it('CA3: operador -> POST 201 + Location -> GET /:id 200 (reader reflete writer) -> lista contem', async () => {
    const token = await login(SEED_EMAIL, SEED_PASSWORD);

    const created = await req('POST', '/api/v1/collaborators', token, {
      name: 'Colaborador E2E',
      email: `colab-${Date.now()}@bemcomum.org`,
      cpf: VALID_CPF,
      occupationArea: 'PARC',
      role: 'Analista',
      startOfContract: '2026-01-10',
      employmentRelationship: 'CLT',
    });
    assert.equal(created.status, 201, 'POST /collaborators (writer) deve retornar 201');
    const location = created.headers.get('location') ?? '';
    assert.ok(location.startsWith('/api/v1/collaborators/'), 'deve ter Location');
    const id = location.slice('/api/v1/collaborators/'.length);

    // GET /:id roteia ao reader (readonly_bi) — valida read-after-write no MySQL real (RW split).
    const detail = await get(`/api/v1/collaborators/${id}`, token);
    assert.equal(detail.status, 200, 'GET /:id (reader) deve refletir o POST (writer)');
    const dto = (await detail.json()) as {
      id: string;
      cpf: string;
      status: string;
      active: boolean;
    };
    assert.equal(dto.id, id);
    assert.equal(dto.cpf, VALID_CPF);
    assert.equal(dto.status, 'PreRegistration');
    assert.equal(dto.active, true);

    // Lista (reader) contem o criado.
    const list = await get('/api/v1/collaborators', token);
    assert.equal(list.status, 200);
    const items = ((await list.json()) as { items: readonly { id: string }[] }).items;
    assert.ok(
      items.some((c) => c.id === id),
      'a lista deve conter o colaborador recem-criado',
    );
  });

  it('CA4: complete -> deactivate -> reactivate (transicoes no MySQL real)', async () => {
    const token = await login(SEED_EMAIL, SEED_PASSWORD);
    const created = await req('POST', '/api/v1/collaborators', token, {
      name: 'Ciclo E2E',
      email: `ciclo-${Date.now()}@bemcomum.org`,
      cpf: '52998224725',
      occupationArea: 'DDI',
      role: 'Gestor',
      startOfContract: '2026-03-01',
      employmentRelationship: 'PJ',
    });
    assert.equal(created.status, 201);
    const id = (created.headers.get('location') ?? '').slice('/api/v1/collaborators/'.length);

    const completed = await req(
      'PATCH',
      `/api/v1/collaborators/${id}/complete-registration`,
      token,
      {
        genderIdentity: 'MULHER_CIS',
      },
    );
    assert.equal(completed.status, 200, 'complete-registration deve retornar 200');

    const deactivated = await req('POST', `/api/v1/collaborators/${id}/deactivate`, token, {
      disableBy: 'SOLICITACAO_RESCISAO_CONTRATUAL',
    });
    assert.equal(deactivated.status, 200, 'deactivate deve retornar 200');

    const reactivated = await req('POST', `/api/v1/collaborators/${id}/reactivate`, token, {});
    assert.equal(reactivated.status, 200, 'reactivate deve retornar 200');
  });
});
