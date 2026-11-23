import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { err } from '#src/shared/primitives/result.ts';
import { periodFromColumns } from '#src/modules/contracts/adapters/persistence/mappers/period.mapper.ts';

const VALID = new Date('2026-01-15T00:00:00.000Z');
const INVALID = new Date('invalid');

describe('periodFromColumns — Date inválido vindo do banco', () => {
  it('Fixed com fim inválido nomeia a coluna end e a causa plain-date-invalid-date', () => {
    assert.deepEqual(
      periodFromColumns({ kind: 'Fixed', start: VALID, end: INVALID }),
      err({ tag: 'PeriodMapperInvalidDate', column: 'end', reason: 'plain-date-invalid-date' }),
    );
  });

  it('Fixed com início inválido nomeia a coluna start', () => {
    assert.deepEqual(
      periodFromColumns({ kind: 'Fixed', start: INVALID, end: VALID }),
      err({ tag: 'PeriodMapperInvalidDate', column: 'start', reason: 'plain-date-invalid-date' }),
    );
  });

  it('Indefinite com início inválido nomeia a coluna start', () => {
    assert.deepEqual(
      periodFromColumns({ kind: 'Indefinite', start: INVALID, end: null }),
      err({ tag: 'PeriodMapperInvalidDate', column: 'start', reason: 'plain-date-invalid-date' }),
    );
  });

  it('Fixed com datas válidas segue ok', () => {
    const r = periodFromColumns({
      kind: 'Fixed',
      start: VALID,
      end: new Date('2026-12-31T00:00:00.000Z'),
    });
    assert.equal(r.ok, true);
  });
});
