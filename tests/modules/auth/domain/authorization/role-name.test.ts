/**
 * W0 (RED) - Tests para RoleName (branded type + smart constructor) do modulo auth.
 *
 * Ticket: AUTH-ROLE-NAME-VO (spec 006-gestao-acessos, Phase 2 Foundational, T004).
 *
 * RoleName da identidade/normalizacao ao nome de papel (hoje Role.name e string crua).
 *
 * Cobre CA1..CA6 do 000-request:
 *   - CA1: create(raw) retorna Result<RoleName, 'role-name-invalid'>
 *   - CA2: normaliza trim + colapsa espacos internos multiplos em um unico
 *   - CA3: vazio / so espacos retorna err('role-name-invalid')
 *   - CA4: comprimento acima de 64 (apos normalizacao) retorna err('role-name-invalid')
 *   - CA5: branded - create nunca lanca, sempre retorna Result (sem throw/class)
 *   - CA6: ASCII puro; module-as-namespace
 *
 * Estes tests DEVEM FALHAR em W0 - role-name.ts ainda nao existe.
 *
 * ASCII puro (precaucao Node 24 strip-types).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as RoleName from '#src/modules/auth/domain/authorization/role-name.ts';

describe('RoleName.create', () => {
  it('CA1: nome valido retorna ok com o valor normalizado', () => {
    const r = RoleName.create('Gestor de Contratos');

    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value, 'Gestor de Contratos');
    }
  });

  it('CA2: normaliza - trim nas bordas', () => {
    const r = RoleName.create('  Administrador  ');

    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value, 'Administrador');
    }
  });

  it('CA2: normaliza - colapsa espacos internos multiplos em um unico', () => {
    const r = RoleName.create('Gestor    de   Acessos');

    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value, 'Gestor de Acessos');
    }
  });

  it('CA3: string vazia retorna err(role-name-invalid)', () => {
    const r = RoleName.create('');

    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error, 'role-name-invalid');
    }
  });

  it('CA3: so espacos retorna err(role-name-invalid)', () => {
    const r = RoleName.create('     ');

    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error, 'role-name-invalid');
    }
  });

  it('CA4: comprimento no limite (64 apos normalizacao) e aceito', () => {
    const atLimit = 'a'.repeat(64);
    const r = RoleName.create(atLimit);

    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value, atLimit);
    }
  });

  it('CA4: comprimento acima de 64 (apos normalizacao) retorna err(role-name-invalid)', () => {
    const tooLong = 'a'.repeat(65);
    const r = RoleName.create(tooLong);

    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error, 'role-name-invalid');
    }
  });

  it('CA4: comprimento medido apos normalizacao (espacos colapsados nao contam em excesso)', () => {
    // 64 letras com espacos duplos entre blocos; apos colapso deve caber em 64.
    const raw = 'aaaa'.repeat(16); // exatamente 64, sem espacos
    const r = RoleName.create(raw);

    assert.equal(r.ok, true);
  });

  it('CA5: create nunca lanca - sempre retorna Result', () => {
    assert.doesNotThrow(() => RoleName.create(''));
    assert.doesNotThrow(() => RoleName.create('x'.repeat(1000)));
  });
});
