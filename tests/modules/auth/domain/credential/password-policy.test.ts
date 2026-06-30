/**
 * Tests para Password (politica de forca) do modulo auth.
 *
 * Ticket original: AUTH-VO-PASSWORD. Atualizado por USR-PASSWORD-POLICY (min 8 -> 12).
 *
 * Politica: comprimento em [12, 128] (OWASP Auth Cheat Sheet 2025: sem MFA, min >= 12; NIST 800-63B:
 * comprimento + blocklist > complexidade). NAO normaliza (preserva caixa + espacos). SEM composicao.
 *
 *   - CA1: senha valida [12,128] retorna ok, valor preservado
 *   - CA2: < 12 chars retorna err('password-too-short')  <-- mudou de 8 para 12 (USR-PASSWORD-POLICY)
 *   - CA3: > 128 chars retorna err('password-too-long')
 *   - CA3b: ordem comprimento>blocklist — comum com <12 chars cai em too-short antes de too-common
 *   - CA6: parse nunca lanca
 *
 * ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as Password from '#src/modules/auth/domain/credential/password-policy.ts';

describe('Password.parse', () => {
  it('CA1: senha valida retorna ok com valor preservado', () => {
    const r = Password.parse('super-secret-123');
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value, 'super-secret-123');
    }
  });

  it('CA1: NAO normaliza - preserva caixa e espacos', () => {
    const raw = '  AbCdEfghi  '; // 13 chars (>= 12)
    const r = Password.parse(raw);
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value, raw);
    }
  });

  it('CA1: boundary - exatamente 12 chars retorna ok', () => {
    const r = Password.parse('a'.repeat(12));
    assert.equal(r.ok, true);
  });

  it('CA1: boundary - exatamente 128 chars retorna ok', () => {
    const r = Password.parse('a'.repeat(128));
    assert.equal(r.ok, true);
  });

  it('CA2: string vazia retorna err password-too-short', () => {
    const r = Password.parse('');
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error, 'password-too-short');
    }
  });

  it('CA2: boundary - exatamente 11 chars retorna err password-too-short', () => {
    const r = Password.parse('a'.repeat(11));
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error, 'password-too-short');
    }
  });

  it('CA3: 129 chars retorna err password-too-long', () => {
    const r = Password.parse('a'.repeat(129));
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error, 'password-too-long');
    }
  });

  // BE-REC-005: blocklist de senhas vazadas/comuns (OWASP WSTG-ATHN-07, NIST 800-63B).
  it('BE-REC-005: senha comum (>= 12 chars) no comprimento valido retorna err password-too-common', () => {
    const r = Password.parse('administrator'); // 13 chars, na blocklist
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'password-too-common');
  });

  it('BE-REC-005: blocklist e case-insensitive', () => {
    const r = Password.parse('ADMINISTRATOR');
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'password-too-common');
  });

  it('CA3b: comum com < 12 chars cai em too-short (comprimento vence a blocklist)', () => {
    const r = Password.parse('senha123'); // 8 chars, na blocklist, mas < 12
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'password-too-short');
  });

  it('BE-REC-005: senha forte fora da blocklist passa', () => {
    const r = Password.parse('correct-horse-battery-staple-42');
    assert.equal(r.ok, true);
  });
});
