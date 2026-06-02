import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { mapLegacyUserRow } from '#scripts/etl/mappers/user.mapper.ts';
import type { LegacyUserRow } from '#scripts/etl/legacy/rows.ts';

const VALID_CPF = '52998224725';
const NOW = new Date('2026-06-01T12:00:00.000Z');

const base = (over: Partial<LegacyUserRow> = {}): LegacyUserRow => ({
  id: 5,
  name: 'Usuário Teste',
  email: 'user@example.com',
  cpf: VALID_CPF,
  telephone: '11999998888',
  imageUrl: 'https://cdn.example.com/a.png',
  active: 1,
  massApprovalPermission: 0,
  collaboratorId: 42,
  createdAt: NOW,
  updatedAt: NOW,
  ...over,
});

describe('mapLegacyUserRow', () => {
  it('válido → DTO com campos do auth.User + UserProfile + refs legados', () => {
    const r = mapLegacyUserRow(base());
    assert.ok(r.ok);
    assert.equal(r.value.legacyId, 5);
    assert.equal(r.value.legacyCollaboratorId, 42);
    assert.equal(r.value.email, 'user@example.com');
    assert.equal(r.value.name, 'Usuário Teste');
    assert.equal(r.value.telephone, '11999998888');
    assert.equal(r.value.avatarUrl, 'https://cdn.example.com/a.png');
    assert.equal(r.value.massApprove, false);
  });

  it('massApprovalPermission=1 → massApprove true (vira grant contract:mass-approve no WRITER)', () => {
    const r = mapLegacyUserRow(base({ massApprovalPermission: 1 }));
    assert.ok(r.ok);
    assert.equal(r.value.massApprove, true);
  });

  it('collaboratorId NULL → legacyCollaboratorId null', () => {
    const r = mapLegacyUserRow(base({ collaboratorId: null }));
    assert.ok(r.ok);
    assert.equal(r.value.legacyCollaboratorId, null);
  });

  it('imageUrl NULL → avatarUrl null', () => {
    const r = mapLegacyUserRow(base({ imageUrl: null }));
    assert.ok(r.ok);
    assert.equal(r.value.avatarUrl, null);
  });

  it('cpf inválido → CpfInvalid', () => {
    const r = mapLegacyUserRow(base({ cpf: '1' }));
    assert.ok(!r.ok);
    assert.ok(r.error.some((e) => e.tag === 'CpfInvalid'));
  });

  it('email inválido + name vazio → acumula EmailInvalid + RequiredFieldMissing', () => {
    const r = mapLegacyUserRow(base({ email: 'x', name: '  ' }));
    assert.ok(!r.ok);
    assert.ok(r.error.some((e) => e.tag === 'EmailInvalid'));
    assert.ok(r.error.some((e) => e.tag === 'RequiredFieldMissing' && e.field === 'name'));
  });
});
