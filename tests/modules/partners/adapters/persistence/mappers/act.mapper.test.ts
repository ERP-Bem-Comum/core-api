import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { err } from '#src/shared/primitives/result.ts';
import * as ActId from '#src/modules/partners/domain/act/act-id.ts';
import * as Act from '#src/modules/partners/domain/act/act.ts';
import type { ActRow } from '#src/modules/partners/adapters/persistence/schemas/mysql.ts';
import {
  actFromRow,
  actToInsert,
} from '#src/modules/partners/adapters/persistence/mappers/act.mapper.ts';

const NOW = new Date('2026-06-01T12:00:00.000Z');

/** Linha de um Act válido com vigência 2026-01-01..2026-12-31, como o banco a devolveria. */
const validRow = (): ActRow => {
  const r = Act.register({
    id: ActId.generate(),
    actNumber: 'ACT-2026-001',
    name: 'Acordo X',
    email: 'contato@org.org',
    cnpj: '11.222.333/0001-81',
    corporateName: 'Instituição Parceira LTDA',
    fantasyName: 'IP',
    occupationArea: 'PARC',
    legalRepresentative: 'João Diretor',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    hasFinancialTransfer: false,
    bankAccount: null,
    pixKey: null,
    registeredAt: NOW,
  });
  assert.ok(r.ok, 'fixture de Act inválido');
  return actToInsert(r.value.act, NOW) as ActRow;
};

describe('actFromRow — vigência', () => {
  it('linha válida reidrata o Act', () => {
    assert.equal(actFromRow(validRow()).ok, true);
  });

  it('fim de vigência com Date inválido nomeia a coluna validityEnd e a causa plain-date-invalid-date', () => {
    assert.deepEqual(
      actFromRow({ ...validRow(), validityEnd: new Date('invalid') }),
      err({
        tag: 'ActMapperInvalidDate',
        column: 'validityEnd',
        reason: 'plain-date-invalid-date',
      }),
    );
  });

  it('início de vigência com Date inválido nomeia a coluna validityStart', () => {
    assert.deepEqual(
      actFromRow({ ...validRow(), validityStart: new Date('invalid') }),
      err({
        tag: 'ActMapperInvalidDate',
        column: 'validityStart',
        reason: 'plain-date-invalid-date',
      }),
    );
  });

  it("vigência fora de ordem segue err('act-mapper-invalid-validity')", () => {
    const row = validRow();
    assert.deepEqual(
      actFromRow({ ...row, validityStart: row.validityEnd, validityEnd: row.validityStart }),
      err('act-mapper-invalid-validity'),
    );
  });
});
