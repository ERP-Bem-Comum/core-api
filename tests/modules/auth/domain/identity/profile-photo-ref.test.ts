/**
 * W0 (RED) - Tests para ProfilePhotoRef (branded type + smart constructor) do modulo auth.
 *
 * Ticket: AUTH-USER-VO-PROFILE-PHOTO-REF (spec 005-gestao-usuarios, Foundational).
 *
 * Cobre CA1..CA5 do 000-request:
 *   - CA1: chave valida retorna ok (com trim)
 *   - CA2: vazia / so espacos retorna err('photo-ref-empty')
 *   - CA3: comprimento > 1024 retorna err('photo-ref-too-long')
 *   - CA4: path traversal ('..') ou barra inicial retorna err('photo-ref-invalid')
 *   - CA5: parse nunca lanca, sempre retorna Result
 *
 * Estes tests DEVEM FALHAR em W0 - profile-photo-ref.ts ainda nao existe.
 * ASCII puro (precaucao Node 24 strip-types).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as ProfilePhotoRef from '#src/modules/auth/domain/identity/profile-photo-ref.ts';

describe('ProfilePhotoRef.parse', () => {
  it('CA1: chave valida retorna ok', () => {
    const r = ProfilePhotoRef.parse('users/abc123/photo.png');

    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value, 'users/abc123/photo.png');
    }
  });

  it('CA1: aplica trim na chave', () => {
    const r = ProfilePhotoRef.parse('  users/abc/photo.png  ');

    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value, 'users/abc/photo.png');
    }
  });

  it('CA2: string vazia retorna err photo-ref-empty', () => {
    const r = ProfilePhotoRef.parse('');

    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error, 'photo-ref-empty');
    }
  });

  it('CA2: so espacos retorna err photo-ref-empty', () => {
    const r = ProfilePhotoRef.parse('   ');

    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error, 'photo-ref-empty');
    }
  });

  it('CA3: comprimento acima de 1024 retorna err photo-ref-too-long', () => {
    const r = ProfilePhotoRef.parse('a'.repeat(1025));

    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error, 'photo-ref-too-long');
    }
  });

  it('CA4: path traversal retorna err photo-ref-invalid', () => {
    const r = ProfilePhotoRef.parse('users/../secret/photo.png');

    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error, 'photo-ref-invalid');
    }
  });

  it('CA4: barra inicial retorna err photo-ref-invalid', () => {
    const r = ProfilePhotoRef.parse('/users/abc/photo.png');

    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error, 'photo-ref-invalid');
    }
  });

  it('CA5: parse nunca lanca - sempre retorna Result', () => {
    assert.doesNotThrow(() => ProfilePhotoRef.parse(''));
    assert.doesNotThrow(() => ProfilePhotoRef.parse('../../etc'));

    const r = ProfilePhotoRef.parse('x');
    assert.equal(typeof r.ok, 'boolean');
  });
});
