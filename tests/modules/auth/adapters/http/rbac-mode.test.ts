// AUTH-RBAC-BYPASS-FLAG (ADR-0052) — W0 RED — CA1/CA2/CA3.
//
// `resolveRbacMode(env)` — função pura que lê AUTH_RBAC_MODE. Fail-secure: só 'bypass' liga; ausente,
// 'enforced' ou QUALQUER outro valor → 'enforced'. Um typo na env NUNCA abre o sistema.
//
// RED esperado: `resolveRbacMode` ainda não existe.

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { resolveRbacMode, rbacBypassBanner } from '#src/modules/auth/adapters/http/rbac-mode.ts';

describe('resolveRbacMode — fail-secure (ADR-0052, CA1/CA2/CA3)', () => {
  it('CA1: env ausente → enforced (default seguro)', () => {
    assert.equal(resolveRbacMode({}), 'enforced');
  });

  it('CA2: AUTH_RBAC_MODE=bypass → bypass', () => {
    assert.equal(resolveRbacMode({ AUTH_RBAC_MODE: 'bypass' }), 'bypass');
  });

  it('CA1: AUTH_RBAC_MODE=enforced → enforced', () => {
    assert.equal(resolveRbacMode({ AUTH_RBAC_MODE: 'enforced' }), 'enforced');
  });

  // CA3 — o coração do fail-secure: nenhum valor "truthy" genérico liga o bypass. Só a palavra exata.
  for (const raw of ['1', 'true', 'on', 'off', 'BYPASS', ' bypass', 'disabled', 'yes', 'no']) {
    it(`CA3: AUTH_RBAC_MODE=${JSON.stringify(raw)} → enforced (typo não abre)`, () => {
      assert.equal(resolveRbacMode({ AUTH_RBAC_MODE: raw }), 'enforced');
    });
  }
});

// CA8 (W2/M2) — o banner extraído do server.ts para não ser apagado em silêncio por um refactor.
describe('rbacBypassBanner — o aviso não pode sumir (ADR-0052 §Guardas)', () => {
  it('grita que a autorização caiu e mostra o NODE_ENV', () => {
    const banner = rbacBypassBanner('production');
    assert.match(banner, /RBAC DESLIGADA/);
    assert.match(banner, /SUPER-USUÁRIO/);
    assert.match(banner, /NODE_ENV=production/);
    assert.match(banner, /AUTH_RBAC_MODE=enforced/); // aponta a reversão
  });
});
