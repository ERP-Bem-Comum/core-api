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

// AUTH-FORGOT-RESET-RATELIMIT-TESTS — trava de regressao do rate-limit sensivel nas rotas de reset
// de senha (/forgot-password, /reset-password), que alimentam o envio de e-mail (flood #133 e contido
// hoje so por este limite por IP). Mesmo `sensitiveRateLimit` de /login e /refresh (plugin.ts:197,211).
// Ticket so-de-cobertura: nasce GREEN (comportamento ja existe); a prova de valor (mutacao no harness)
// vive no 002-tests/REPORT.md, nao em src/. ASCII puro.
describe('AUTH-FORGOT-RESET-RATELIMIT-TESTS (BE-REC-003 rate-limit)', () => {
  it('forgot-password excedendo o limite dedicado -> 429', async () => {
    const max = 3;
    const app = await makeApp(max);
    const payload = { email: EMAIL };

    // As `max` primeiras sao 202 (anti-enumeracao: sempre 202, exista o e-mail ou nao).
    for (let i = 0; i < max; i += 1) {
      const r = await app.inject({
        method: 'POST',
        url: '/api/v2/auth/forgot-password',
        payload,
      });
      assert.equal(r.statusCode, 202, `tentativa ${i + 1} deveria ser 202`);
    }
    // A (max+1)-esima estoura o limite dedicado.
    const blocked = await app.inject({
      method: 'POST',
      url: '/api/v2/auth/forgot-password',
      payload,
    });
    assert.equal(blocked.statusCode, 429);
    await app.close();
  });

  it('reset-password excedendo o limite dedicado -> 429', async () => {
    const max = 3;
    const app = await makeApp(max);
    // Token invalido: as `max` primeiras sao 400 (reset-token-invalid), nunca 429. O que importa
    // e a (max+1)-esima ser barrada pelo rate-limit ANTES do handler de negocio.
    const payload = { token: 'inexistente', newPassword: STRONG };

    for (let i = 0; i < max; i += 1) {
      const r = await app.inject({
        method: 'POST',
        url: '/api/v2/auth/reset-password',
        payload,
      });
      assert.notEqual(r.statusCode, 429, `tentativa ${i + 1} nao deveria ser 429`);
    }
    const blocked = await app.inject({
      method: 'POST',
      url: '/api/v2/auth/reset-password',
      payload,
    });
    assert.equal(blocked.statusCode, 429);
    await app.close();
  });

  it('esgotar /forgot-password NAO bloqueia /login nem /reset-password (baldes por rota)', async () => {
    const max = 3;
    const app = await makeApp(max);

    // Esgota o balde de /forgot-password (max+1 requisicoes -> a ultima ja e 429).
    for (let i = 0; i < max + 1; i += 1) {
      await app.inject({
        method: 'POST',
        url: '/api/v2/auth/forgot-password',
        payload: { email: EMAIL },
      });
    }

    // /login tem balde proprio (route-level config -> child store independente): nao esta bloqueado.
    const login = await app.inject({
      method: 'POST',
      url: '/api/v2/auth/login',
      payload: { email: EMAIL, password: 'Wr0ng-Passphrase-2026!' },
    });
    assert.notEqual(login.statusCode, 429, '/login nao deveria herdar o balde de /forgot-password');

    // /reset-password idem: balde proprio, independente de /forgot-password.
    const reset = await app.inject({
      method: 'POST',
      url: '/api/v2/auth/reset-password',
      payload: { token: 'inexistente', newPassword: STRONG },
    });
    assert.notEqual(
      reset.statusCode,
      429,
      '/reset-password nao deveria herdar o balde de /forgot-password',
    );
    await app.close();
  });
});
