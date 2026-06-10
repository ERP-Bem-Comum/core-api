/**
 * USR-PASSWORD-POLICY — W0 (RED) — GET /api/v2/auth/password-policy.
 *
 * DEVE FALHAR: a rota ainda não existe (404). GREEN quando o W1 expuser a política consumível para o
 * front. Expõe APENAS { minLength, maxLength } — sem autenticação, sem revelar a blocklist (revelar
 * permitiria contorná-la — decisão `001-security-decision.md`). ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { buildApp } from '#src/shared/http/app.ts';
import { authHttpPlugin, buildAuthHttpDeps } from '#src/modules/auth/public-api/http.ts';

const makeApp = async () => {
  const deps = await buildAuthHttpDeps({ driver: 'memory' });
  return buildApp({ routes: [authHttpPlugin(deps)] });
};

describe('USR-PASSWORD-POLICY — GET /api/v2/auth/password-policy', () => {
  it('CA4: sem token -> 200 com { minLength: 12, maxLength: 128 }', async () => {
    const app = await makeApp();
    const res = await app.inject({ method: 'GET', url: '/api/v2/auth/password-policy' });
    assert.equal(res.statusCode, 200);
    const body = res.json() as Record<string, unknown>;
    assert.equal(body['minLength'], 12);
    assert.equal(body['maxLength'], 128);
    await app.close();
  });

  it('CA4: a resposta NÃO expõe a blocklist nem contagem', async () => {
    const app = await makeApp();
    const res = await app.inject({ method: 'GET', url: '/api/v2/auth/password-policy' });
    const raw = res.body.toLowerCase();
    assert.ok(!raw.includes('blocklist'), 'resposta não deve citar blocklist');
    assert.ok(!raw.includes('common'), 'resposta não deve citar a lista de comuns');
    assert.ok(!raw.includes('administrator'), 'resposta não deve vazar entradas da blocklist');
    await app.close();
  });
});
