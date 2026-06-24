// Regressão do incidente de produção: login 500 (`user-repo-unavailable`) causado por
// `UserMapperInvalidProfile` — um campo de perfil OPCIONAL (cpf/telephone/imageUrl) com valor
// inválido no banco derrubava o mapper inteiro, impedindo a autenticação. O mapper deve DEGRADAR
// o campo cosmético para null (+ log), mantendo rejeição estrita nos campos críticos.

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { userFromRows } from '#src/modules/auth/adapters/persistence/mappers/user.mapper.ts';
import type { UserRow } from '#src/modules/auth/adapters/persistence/schemas/mysql.ts';

const baseRow = (over: Partial<UserRow> = {}): UserRow =>
  ({
    id: '11111111-1111-4111-8111-111111111111',
    email: 'user@example.com',
    passwordHash: 'hash-nao-vazio',
    status: 'active',
    disabledAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    legacyId: null,
    name: 'Fulano',
    cpf: '52998224725', // CPF válido
    telephone: '11999998888', // válido
    imageUrl: 'fotos/a.png', // key válida (sem '/' inicial)
    collaboratorId: null,
    ...over,
  }) as unknown as UserRow;

describe('auth/userFromRows — resiliência do perfil (regressão login 500)', () => {
  it('perfil válido → ok com valores preservados', () => {
    const r = userFromRows(baseRow(), [], []);
    assert.ok(r.ok);
    assert.equal(r.value.cpf, '52998224725');
    assert.equal(r.value.telephone, '11999998888');
    assert.equal(r.value.photo, 'fotos/a.png');
  });

  it('campo de perfil opcional INVÁLIDO degrada para null — NÃO derruba o mapper', () => {
    // imageUrl com '/' inicial → photo-ref-invalid; cpf todos-iguais → checksum; telefone curto → invalid.
    const r = userFromRows(
      baseRow({ imageUrl: '/uploads/a.png', cpf: '00000000000', telephone: '123' }),
      [],
      [],
    );
    assert.ok(r.ok, 'mapper deve degradar campos cosméticos, não falhar');
    assert.equal(r.value.photo, null);
    assert.equal(r.value.cpf, null);
    assert.equal(r.value.telephone, null);
  });

  it('apenas um campo inválido degrada; os demais válidos são preservados', () => {
    const r = userFromRows(baseRow({ cpf: '12345678900' }), [], []); // CPF com checksum inválido
    assert.ok(r.ok);
    assert.equal(r.value.cpf, null); // degradado
    assert.equal(r.value.telephone, '11999998888'); // preservado
    assert.equal(r.value.photo, 'fotos/a.png'); // preservado
  });

  it('campo CRÍTICO inválido (email) CONTINUA rejeitando — rejeição estrita mantida', () => {
    const r = userFromRows(baseRow({ email: 'invalido-sem-arroba' }), [], []);
    assert.ok(!r.ok);
  });
});
