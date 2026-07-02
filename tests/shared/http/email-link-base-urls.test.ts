/**
 * AUTH-EMAIL-LINK-BASE-URLS — W0 (RED)
 *
 * Cobre CA1/CA3/CA4/CA5 das issues #331/#332. DEVE FALHAR em W0:
 *   - `readEmailLinkBaseUrls` ainda nao existe em `#src/shared/http/email-link-base-urls.ts`.
 * GREEN quando o W1 entregar o helper de validacao das base URLs de link de e-mail.
 * Bug de prod que motivou: convite saiu `http://localhost:3000/activate?...` e reset saiu
 * `erp.abemcomum.org?token=...` (sem protocolo). ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { readEmailLinkBaseUrls } from '#src/shared/http/email-link-base-urls.ts';

const VALID = {
  AUTH_RESET_BASE_URL: 'https://erp.abemcomum.org/reset-password',
  AUTH_ACTIVATION_BASE_URL: 'https://erp.abemcomum.org/activate',
  PARTNERS_SELF_REGISTRATION_BASE_URL: 'https://erp.abemcomum.org/autocadastro',
} as const;

describe('AUTH-EMAIL-LINK-BASE-URLS — leitura e validacao das base URLs', () => {
  it('CA4: as 3 envs validas fluem para os campos correspondentes', () => {
    const r = readEmailLinkBaseUrls(VALID);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.resetBaseUrl, VALID.AUTH_RESET_BASE_URL);
    assert.equal(r.value.activationBaseUrl, VALID.AUTH_ACTIVATION_BASE_URL);
    assert.equal(r.value.selfRegistrationBaseUrl, VALID.PARTNERS_SELF_REGISTRATION_BASE_URL);
  });

  it('CA1: valor sem protocolo (o bug real de prod) e rejeitado com o nome da env', () => {
    const r = readEmailLinkBaseUrls({ AUTH_RESET_BASE_URL: 'erp.abemcomum.org' });
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.error.length, 1);
    assert.match(r.error[0] ?? '', /AUTH_RESET_BASE_URL/);
    assert.match(r.error[0] ?? '', /URL absoluta http/);
  });

  it('CA3: ftp://, javascript: e whitespace sao rejeitados; http/https passam', () => {
    assert.equal(readEmailLinkBaseUrls({ AUTH_ACTIVATION_BASE_URL: 'ftp://x' }).ok, false);
    assert.equal(
      readEmailLinkBaseUrls({ AUTH_ACTIVATION_BASE_URL: 'javascript:alert(1)' }).ok,
      false,
    );
    assert.equal(readEmailLinkBaseUrls({ PARTNERS_SELF_REGISTRATION_BASE_URL: '   ' }).ok, false);
    assert.equal(
      readEmailLinkBaseUrls({ AUTH_RESET_BASE_URL: 'http://localhost:3000/reset-password' }).ok,
      true,
    );
  });

  it('CA5 (dev): sem envs e fora de producao, retorna objeto vazio (defaults de dev valem)', () => {
    const r = readEmailLinkBaseUrls({});
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.deepEqual(r.value, {});
    assert.equal(Object.hasOwn(r.value, 'resetBaseUrl'), false);
  });

  it('CA5 (prod): NODE_ENV=production sem as envs falha com um erro POR env ausente', () => {
    const r = readEmailLinkBaseUrls({ NODE_ENV: 'production' });
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.error.length, 3);
    assert.match(r.error.join('\n'), /AUTH_RESET_BASE_URL/);
    assert.match(r.error.join('\n'), /AUTH_ACTIVATION_BASE_URL/);
    assert.match(r.error.join('\n'), /PARTNERS_SELF_REGISTRATION_BASE_URL/);
  });

  it('CA5 (prod): env vazia conta como ausente em producao', () => {
    const r = readEmailLinkBaseUrls({
      NODE_ENV: 'production',
      ...VALID,
      AUTH_ACTIVATION_BASE_URL: '',
    });
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.error.length, 1);
    assert.match(r.error[0] ?? '', /AUTH_ACTIVATION_BASE_URL/);
  });

  it('acumula erros: invalida + ausente em producao aparecem juntos', () => {
    const r = readEmailLinkBaseUrls({
      NODE_ENV: 'production',
      AUTH_RESET_BASE_URL: 'erp.abemcomum.org',
      AUTH_ACTIVATION_BASE_URL: VALID.AUTH_ACTIVATION_BASE_URL,
    });
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.error.length, 2);
    assert.match(r.error.join('\n'), /AUTH_RESET_BASE_URL/);
    assert.match(r.error.join('\n'), /PARTNERS_SELF_REGISTRATION_BASE_URL/);
  });

  it('base com path e porta e aceita como esta (o use case so concatena ?token=)', () => {
    const r = readEmailLinkBaseUrls({
      AUTH_RESET_BASE_URL: 'http://localhost:5173/auth/reset-password',
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.resetBaseUrl, 'http://localhost:5173/auth/reset-password');
  });
});
