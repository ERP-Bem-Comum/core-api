/**
 * CONTRACTS-HTTP-E2E-SMOKE (C5) — smoke E2E produção-like da borda contracts.
 *
 * Cliente Node + `fetch` contra o SERVIDOR REAL (`src/server.ts`) sobre MySQL real (dual-pool: writer root
 * + reader `readonly_bi`) e MinIO (S3) — Docker. NÃO usa app.inject. Orquestrado por
 * `pnpm run test:e2e:contracts` (sobe compose+server, roda este smoke, teardown).
 *
 * Valida dual-pool (RW split, ADR-0026) + authz (RBAC) + persistência real. O operador com
 * `contract:read`+`write` vem do seed RBAC via env (D1: CORE_API_E2E + AUTH_SEED_JSON).
 *
 * Sufixo `.e2e.ts` (não `.test.ts`) → fora do glob de `pnpm test`. ASCII puro.
 */

import { describe, it, before } from 'node:test';
import { strict as assert } from 'node:assert';
import { setTimeout as delay } from 'node:timers/promises';

const BASE = process.env['E2E_BASE_URL'] ?? 'http://127.0.0.1:3100';
const READY_TIMEOUT_MS = Number.parseInt(process.env['E2E_READY_TIMEOUT_MS'] ?? '30000', 10);
// Operador seedado (mesmos valores que o e2e-contracts.sh injeta em AUTH_SEED_JSON).
const SEED_EMAIL = process.env['E2E_SEED_EMAIL'] ?? 'e2e-operator@example.com';
const SEED_PASSWORD = process.env['E2E_SEED_PASSWORD'] ?? 'Str0ng-Passphrase-2026!';

type Json = Record<string, unknown>;

const post = (path: string, body: Json, token?: string): Promise<Response> =>
  fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token === undefined ? {} : { authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(body),
  });

const get = (path: string, token?: string): Promise<Response> =>
  fetch(`${BASE}${path}`, {
    headers: token === undefined ? {} : { authorization: `Bearer ${token}` },
  });

const login = async (email: string, password: string): Promise<string> => {
  const res = await post('/api/v2/auth/login', { email, password });
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
  throw new Error(`server em ${BASE} não respondeu /health em ${READY_TIMEOUT_MS}ms (${lastErr})`);
};

describe('CONTRACTS-HTTP-E2E-SMOKE — borda contracts (server real + MySQL dual-pool + MinIO)', () => {
  before(waitReady);

  it('CA1: GET /health -> 200 (server sobe com auth+contracts mysql + storage)', async () => {
    const health = await get('/health');
    assert.equal(health.status, 200);
  });

  it('CA2: sem token -> 401; token sem contract:read em rota protegida por permissão -> 403', async () => {
    // `GET /contracts` (list, C0) exige só `requireAuth` → 401 sem token.
    const noAuth = await get('/api/v2/contracts');
    assert.equal(noAuth.status, 401);

    // `GET /contracts/:id` (C1) exige `authorize('contract:read')` → 403 para user sem a permissão.
    const email = `e2e-plain-${Date.now()}@example.com`;
    await post('/api/v2/auth/register', { email, password: SEED_PASSWORD });
    const token = await login(email, SEED_PASSWORD);
    const someId = '11111111-1111-4111-8111-111111111111';
    const forbidden = await get(`/api/v2/contracts/${someId}`, token);
    assert.equal(forbidden.status, 403, 'user sem contract:read deve receber 403 em GET /:id');
  });

  it('CA3: register -> login -> /me coexiste com os dois módulos montados', async () => {
    const email = `e2e-auth-${Date.now()}@example.com`;
    const reg = await post('/api/v2/auth/register', { email, password: SEED_PASSWORD });
    assert.equal(reg.status, 201);
    const token = await login(email, SEED_PASSWORD);
    const me = await get('/api/v2/auth/me', token);
    assert.equal(me.status, 200);
  });

  it('CA4: operador seedado -> POST /contracts 201 -> GET /:id 200 (reader) -> export.csv 200', async () => {
    const token = await login(SEED_EMAIL, SEED_PASSWORD);

    // CTR-CONTRACT-SEQUENTIAL-NUMBER: o body NÃO envia sequentialNumber — o backend gera
    // `NNNN/YYYY` por ano via `ctr_contract_seq` (FOR UPDATE). Este smoke exercita a geração
    // ponta-a-ponta contra o MySQL real. MySQL é limpo a cada run (down -v).
    const created = await post(
      '/api/v2/contracts',
      {
        mode: 'Active',
        title: 'Contrato E2E',
        objective: 'Smoke ponta-a-ponta',
        signedAt: '2026-01-15',
        originalValueCents: 10_000_000,
        periodStart: '2026-02-01',
        periodEnd: '2026-12-31',
      },
      token,
    );
    assert.equal(created.status, 201, 'POST /contracts (writer) deve retornar 201');
    const { id, status } = (await created.json()) as { id: string; status: string };
    assert.equal(status, 'Active');

    // GET /:id roteia ao reader (readonly_bi) — valida o RW split com creds distintas.
    const detail = await get(`/api/v2/contracts/${id}`, token);
    assert.equal(detail.status, 200, 'GET /:id (reader) deve retornar 200');
    assert.equal(((await detail.json()) as { id: string }).id, id);

    // export.csv (reader) — CSV real.
    const csv = await get('/api/v2/contracts/export.csv', token);
    assert.equal(csv.status, 200);
    assert.match(csv.headers.get('content-type') ?? '', /text\/csv/);
    const body = await csv.text();
    assert.ok(body.includes(id), 'o CSV exportado deve conter o contrato criado');

    // list (reader) contém o criado.
    const list = await get('/api/v2/contracts', token);
    assert.equal(list.status, 200);
  });
});
