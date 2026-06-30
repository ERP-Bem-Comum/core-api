/**
 * AUTH-HTTP-E2E-SMOKE — smoke E2E produção-like da borda auth.
 *
 * Cliente Node + `fetch` (como o BFF/front) contra o SERVIDOR REAL (`src/server.ts`)
 * rodando sobre MySQL real (Docker). NÃO usa app.inject. Orquestrado por
 * `pnpm run test:e2e:auth` (sobe compose+server, roda este smoke, teardown).
 *
 * Sufixo `.e2e.ts` (não `.test.ts`) → fora do glob de `pnpm test`. ASCII puro.
 */

import { describe, it, before } from 'node:test';
import { strict as assert } from 'node:assert';
import { setTimeout as delay } from 'node:timers/promises';

const BASE = process.env['E2E_BASE_URL'] ?? 'http://127.0.0.1:3100';
const READY_TIMEOUT_MS = Number.parseInt(process.env['E2E_READY_TIMEOUT_MS'] ?? '30000', 10);

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

describe('AUTH-HTTP-E2E-SMOKE — borda auth (server real + MySQL via fetch)', () => {
  before(waitReady);

  it('CA1: GET /health -> 200 e GET /me sem token -> 401', async () => {
    const health = await get('/health');
    assert.equal(health.status, 200);

    const meNoAuth = await get('/api/v2/auth/me');
    assert.equal(meNoAuth.status, 401);
  });

  it('CA2-CA7: register -> login -> me -> refresh -> logout -> refresh revogado (MySQL real)', async () => {
    const email = `e2e-${Date.now()}@example.com`;
    const password = 'Str0ng-Passphrase-2026!';

    // CA2: register -> 201
    const reg = await post('/api/v2/auth/register', { email, password });
    assert.equal(reg.status, 201, 'register deve retornar 201');

    // CA3: login -> 200 + tokens (lê do MySQL — CA8 persistência real)
    const login = await post('/api/v2/auth/login', { email, password });
    assert.equal(login.status, 200, 'login deve retornar 200');
    const tokens = (await login.json()) as {
      accessToken: string;
      refreshToken: string;
      userId: string;
    };
    assert.ok(tokens.accessToken.length > 0);
    assert.ok(tokens.refreshToken.length > 0);
    assert.ok(tokens.userId.length > 0);

    // CA4: /me com Bearer -> 200 { userId } (= login)
    const me = await get('/api/v2/auth/me', tokens.accessToken);
    assert.equal(me.status, 200, '/me autenticado deve retornar 200');
    assert.equal(((await me.json()) as { userId: string }).userId, tokens.userId);

    // CA5: refresh -> 200, refresh rotacionado (!= anterior)
    const refreshed = await post('/api/v2/auth/refresh', { refreshToken: tokens.refreshToken });
    assert.equal(refreshed.status, 200, 'refresh deve retornar 200');
    const newTokens = (await refreshed.json()) as { accessToken: string; refreshToken: string };
    assert.notEqual(newTokens.refreshToken, tokens.refreshToken, 'refresh deve rotacionar');

    // CA6: logout (com o refresh rotacionado) -> 204
    const logout = await post('/api/v2/auth/logout', { refreshToken: newTokens.refreshToken });
    assert.equal(logout.status, 204, 'logout deve retornar 204');

    // CA7: refresh com token revogado -> 401
    const reuse = await post('/api/v2/auth/refresh', { refreshToken: newTokens.refreshToken });
    assert.equal(reuse.status, 401, 'refresh de token revogado deve retornar 401');
  });
});
