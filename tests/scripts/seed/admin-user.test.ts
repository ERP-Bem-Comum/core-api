// W0 — admin-user seed: validações de domínio do perfil (regressão do incidente login 500).
// O seed inseria email/cpf/telephone CRUS (só normalizava dígitos), permitindo persistir um
// perfil que o read-path (mapper) rejeita. Agora valida via os mesmos VOs do domínio.

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { validateAdminProfile } from '#scripts/seed/admin-user.ts';

const baseConfig = (over = {}) => ({
  databaseUrl: 'mysql://user:pass@localhost:3306/db',
  adminEmail: '  Admin@Example.COM ',
  adminPassword: 'irrelevante-para-perfil',
  adminName: 'Admin Sistema',
  adminCpf: '52998224725', // CPF válido
  adminPhone: '11999998888', // telefone válido
  ...over,
});

describe('admin-user seed — validateAdminProfile', () => {
  it('perfil válido → ok, com e-mail NORMALIZADO (trim + lowercase)', () => {
    const r = validateAdminProfile(baseConfig());
    assert.ok(r.ok);
    assert.equal(r.value.email, 'admin@example.com');
    assert.equal(r.value.cpf, '52998224725');
    assert.equal(r.value.telephone, '11999998888');
    assert.equal(r.value.name, 'Admin Sistema');
  });

  it('CPF inválido (todos dígitos iguais / checksum) → erro, não prossegue', () => {
    assert.ok(!validateAdminProfile(baseConfig({ adminCpf: '00000000000' })).ok);
  });

  it('CPF com comprimento errado → erro', () => {
    assert.ok(!validateAdminProfile(baseConfig({ adminCpf: '123' })).ok);
  });

  it('telefone inválido → erro', () => {
    assert.ok(!validateAdminProfile(baseConfig({ adminPhone: '123' })).ok);
  });

  it('e-mail inválido (sem @) → erro', () => {
    assert.ok(!validateAdminProfile(baseConfig({ adminEmail: 'sem-arroba' })).ok);
  });

  it('nome vazio/whitespace → erro', () => {
    assert.ok(!validateAdminProfile(baseConfig({ adminName: '   ' })).ok);
  });
});
