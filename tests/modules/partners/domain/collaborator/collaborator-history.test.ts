/**
 * PAR-COLLABORATOR-HISTORY-EXPORT (US4). diffCollaborator — log de atualizações por campo.
 * DEVE FALHAR no W0: `collaborator-history.ts` (diffCollaborator) ainda não existe. GREEN no W1.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as Collaborator from '#src/modules/partners/domain/collaborator/collaborator.ts';
import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import { diffCollaborator } from '#src/modules/partners/domain/collaborator/collaborator-history.ts';
import type { Collaborator as CollaboratorEntity } from '#src/modules/partners/domain/collaborator/types.ts';

const NOW = new Date('2026-01-10T08:00:00.000Z');

const make = (role: string): CollaboratorEntity => {
  const r = Collaborator.register({
    id: CollaboratorId.generate(),
    name: 'Maria Silva',
    email: 'maria@bemcomum.org',
    cpf: '11144477735',
    occupationArea: 'PARC',
    role,
    startOfContract: NOW,
    employmentRelationship: 'CLT',
    registeredAt: NOW,
  });
  assert.ok(r.ok, `register: ${r.ok ? '' : r.error}`);
  return r.value.collaborator;
};

describe('diffCollaborator (US4)', () => {
  it('CA1: mudança de cargo gera 1 change (role: Diretor → Diretor Adjunto)', () => {
    const before = make('Diretor');
    const after = { ...before, role: 'Diretor Adjunto' };
    const changes = diffCollaborator(before, after);
    const role = changes.find((c) => c.fieldName === 'role');
    assert.ok(role, 'esperava change de role');
    assert.equal(role.valueBefore, 'Diretor');
    assert.equal(role.valueAfter, 'Diretor Adjunto');
  });

  it('sem alteração → nenhuma change', () => {
    const before = make('Analista');
    assert.equal(diffCollaborator(before, before).length, 0);
  });

  it('múltiplos campos alterados → uma change por campo', () => {
    const before = make('Analista');
    const after = { ...before, role: 'Coordenador', name: 'Maria S. Andrade' };
    const changes = diffCollaborator(before, after);
    const fields = changes.map((c) => c.fieldName).sort();
    assert.deepEqual(fields, ['name', 'role']);
  });

  // #126 (CA4): histórico passa a rastrear território e banco/PIX (linhas adicionais).
  it('#126: mudança de território → change "territory" serializado UF/Município', () => {
    const before = make('Analista');
    const after = { ...before, territory: { uf: 'CE', municipality: 'Fortaleza' } };
    const t = diffCollaborator(before, after).find((c) => c.fieldName === 'territory');
    assert.ok(t, 'esperava change de territory');
    assert.equal(t.valueBefore, null);
    assert.equal(t.valueAfter, 'CE/Fortaleza');
  });

  it('#126: mudança de banco e PIX → changes "bankAccount" e "pixKey"', () => {
    const before = make('Analista');
    const after: CollaboratorEntity = {
      ...before,
      bankAccount: { bank: '237', agency: '1234', accountNumber: '56789', checkDigit: '0' },
      pixKey: { keyType: 'email', key: 'maria@bemcomum.org' },
    };
    const changes = diffCollaborator(before, after);
    assert.equal(
      changes.find((c) => c.fieldName === 'bankAccount')?.valueAfter,
      '237/1234/56789-0',
    );
    assert.equal(
      changes.find((c) => c.fieldName === 'pixKey')?.valueAfter,
      'email:maria@bemcomum.org',
    );
  });

  it('#1029: troca SÓ do tipo da chave PIX → change "pixKey"', () => {
    const base = make('Analista');
    const before: CollaboratorEntity = {
      ...base,
      pixKey: { keyType: 'phone', key: '11144477735' },
    };
    const after: CollaboratorEntity = { ...base, pixKey: { keyType: 'cpf', key: '11144477735' } };
    const pix = diffCollaborator(before, after).find((c) => c.fieldName === 'pixKey');
    assert.ok(pix, 'esperava change de pixKey');
    assert.equal(pix.valueBefore, 'phone:11144477735');
    assert.equal(pix.valueAfter, 'cpf:11144477735');
  });

  // #1029: sem o DV no texto, trocar só o dígito verificador não deixava rastro no histórico.
  it('#1029: troca SÓ do DV → change "bankAccount" com antes/depois distintos', () => {
    const base = make('Analista');
    const before: CollaboratorEntity = {
      ...base,
      bankAccount: { bank: '237', agency: '1234', accountNumber: '56789', checkDigit: '0' },
    };
    const after: CollaboratorEntity = {
      ...base,
      bankAccount: { bank: '237', agency: '1234', accountNumber: '56789', checkDigit: '1' },
    };
    const bank = diffCollaborator(before, after).find((c) => c.fieldName === 'bankAccount');
    assert.ok(bank, 'esperava change de bankAccount');
    assert.equal(bank.valueBefore, '237/1234/56789-0');
    assert.equal(bank.valueAfter, '237/1234/56789-1');
  });
});
