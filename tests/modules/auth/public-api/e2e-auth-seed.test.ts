/**
 * CONTRACTS-HTTP-E2E-SMOKE (C5) — W0 (RED) — `parseE2eAuthSeed` (seed RBAC via env, opção a).
 *
 * DEVE FALHAR: `parseE2eAuthSeed` ainda não é exportado de `auth/public-api/http.ts`. GREEN quando o W1
 * entregar a função pura com a guarda dupla (`CORE_API_E2E==='1'` E `AUTH_SEED_JSON` válido).
 *
 * Camada testável (entra no `pnpm test`) do C5 — o smoke E2E (`contracts-smoke.e2e.ts`) roda só com Docker.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { parseE2eAuthSeed } from '#src/modules/auth/public-api/http.ts';

const VALID_JSON = JSON.stringify({
  users: [
    {
      email: 'e2e-operator@example.com',
      password: 'Str0ng-Passphrase-2026!',
      permissions: ['contract:read', 'contract:write'],
    },
  ],
});

describe('parseE2eAuthSeed — guarda dupla CORE_API_E2E + AUTH_SEED_JSON', () => {
  it('sem CORE_API_E2E -> undefined (mesmo com AUTH_SEED_JSON presente)', () => {
    assert.equal(parseE2eAuthSeed({ AUTH_SEED_JSON: VALID_JSON }), undefined);
  });

  it('CORE_API_E2E != 1 -> undefined', () => {
    assert.equal(parseE2eAuthSeed({ CORE_API_E2E: 'true', AUTH_SEED_JSON: VALID_JSON }), undefined);
  });

  it('CORE_API_E2E=1 sem AUTH_SEED_JSON -> undefined', () => {
    assert.equal(parseE2eAuthSeed({ CORE_API_E2E: '1' }), undefined);
  });

  it('CORE_API_E2E=1 + JSON válido -> AuthSeed com o operador', () => {
    const seed = parseE2eAuthSeed({ CORE_API_E2E: '1', AUTH_SEED_JSON: VALID_JSON });
    assert.ok(seed !== undefined);
    assert.equal(seed.users.length, 1);
    assert.equal(seed.users[0]!.email, 'e2e-operator@example.com');
    assert.deepEqual([...seed.users[0]!.permissions], ['contract:read', 'contract:write']);
  });

  it('CORE_API_E2E=1 + JSON malformado -> lança (erro de config no boot dev/test)', () => {
    assert.throws(() => parseE2eAuthSeed({ CORE_API_E2E: '1', AUTH_SEED_JSON: '{not valid json' }));
  });

  it('CORE_API_E2E=1 + shape inválido (sem users) -> lança', () => {
    assert.throws(() => parseE2eAuthSeed({ CORE_API_E2E: '1', AUTH_SEED_JSON: '{"foo":1}' }));
  });
});
