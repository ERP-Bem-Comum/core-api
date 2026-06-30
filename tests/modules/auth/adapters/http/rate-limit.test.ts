/**
 * CTR-AUTH-RATELIMIT-LOGIN — W0 (RED) — BE-REC-001 (parte rate-limit).
 *
 * Rate-limit dedicado e mais restritivo em /login e /refresh, separado do teto global (200/min).
 * DEVE FALHAR ate o W1: hoje so existe o limite global, e `buildAuthHttpDeps` nao aceita
 * `sensitiveRateLimit`. ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { buildApp } from '#src/shared/http/app.ts';
import { authHttpPlugin, buildAuthHttpDeps } from '#src/modules/auth/public-api/http.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const EMAIL = 'user@example.com';

const makeApp = async (max: number) => {
  const deps = await buildAuthHttpDeps({
    driver: 'memory',
    sensitiveRateLimit: { max, timeWindow: '1 minute' },
  });
  return buildApp({ routes: [authHttpPlugin(deps)] });
};

describe('CTR-AUTH-RATELIMIT-LOGIN (BE-REC-001)', () => {
  it('login excedendo o limite dedicado -> 429', async () => {
    const max = 3;
    const app = await makeApp(max);
    const payload = { email: EMAIL, password: 'Wr0ng-Passphrase-2026!' };

    // As `max` primeiras tentativas nao sao 429 (sao 401 invalid-credentials).
    for (let i = 0; i < max; i += 1) {
      const r = await app.inject({ method: 'POST', url: '/api/v2/auth/login', payload });
      assert.notEqual(r.statusCode, 429, `tentativa ${i + 1} nao deveria ser 429`);
    }
    // A (max+1)-esima estoura o limite.
    const blocked = await app.inject({ method: 'POST', url: '/api/v2/auth/login', payload });
    assert.equal(blocked.statusCode, 429);
    await app.close();
  });

  it('refresh excedendo o limite dedicado -> 429', async () => {
    const max = 3;
    const app = await makeApp(max);
    const payload = { refreshToken: 'inexistente' };

    for (let i = 0; i < max; i += 1) {
      const r = await app.inject({ method: 'POST', url: '/api/v2/auth/refresh', payload });
      assert.notEqual(r.statusCode, 429);
    }
    const blocked = await app.inject({ method: 'POST', url: '/api/v2/auth/refresh', payload });
    assert.equal(blocked.statusCode, 429);
    await app.close();
  });

  it('register NAO usa o limite restrito (acima do teto sensivel ainda passa)', async () => {
    const max = 3;
    const app = await makeApp(max);
    // max+2 registros distintos: nenhum 429 (register herda o teto global, nao o sensivel).
    for (let i = 0; i < max + 2; i += 1) {
      const r = await app.inject({
        method: 'POST',
        url: '/api/v2/auth/register',
        payload: { email: `u${String(i)}@example.com`, password: STRONG },
      });
      assert.notEqual(r.statusCode, 429, `register ${i + 1} nao deveria ser 429`);
    }
    await app.close();
  });
});
