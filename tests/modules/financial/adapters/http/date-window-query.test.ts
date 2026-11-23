import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  DATE_WINDOW_QUERY_FIELDS,
  dateWindowFromQuery,
} from '#src/modules/financial/adapters/http/date-window-query.ts';

describe('financial/adapters/http — dateWindowFromQuery', () => {
  it('sem nenhum extremo na query devolve objeto vazio, sem chave undefined', () => {
    const window = dateWindowFromQuery({}, DATE_WINDOW_QUERY_FIELDS);
    assert.deepEqual(window, {});
    assert.deepEqual(Object.keys(window), []);
  });

  it('só o extremo inicial vira só a chave inicial', () => {
    assert.deepEqual(dateWindowFromQuery({ dueFrom: '2026-03-10' }, DATE_WINDOW_QUERY_FIELDS), {
      dueFrom: new Date('2026-03-10'),
    });
  });

  it('só o extremo final vira só a chave final', () => {
    assert.deepEqual(dateWindowFromQuery({ issuedTo: '2026-05-20' }, DATE_WINDOW_QUERY_FIELDS), {
      issuedTo: new Date('2026-05-20'),
    });
  });

  it('os quatro extremos viram quatro datas à meia-noite UTC', () => {
    const window = dateWindowFromQuery(
      {
        dueFrom: '2026-01-01',
        dueTo: '2026-01-31',
        issuedFrom: '2025-12-01',
        issuedTo: '2025-12-31',
      },
      DATE_WINDOW_QUERY_FIELDS,
    );
    assert.deepEqual(window, {
      dueFrom: new Date('2026-01-01T00:00:00.000Z'),
      dueTo: new Date('2026-01-31T00:00:00.000Z'),
      issuedFrom: new Date('2025-12-01T00:00:00.000Z'),
      issuedTo: new Date('2025-12-31T00:00:00.000Z'),
    });
  });

  it('extremos iguais viram a mesma data nas duas chaves', () => {
    const window = dateWindowFromQuery(
      { dueFrom: '2026-03-10', dueTo: '2026-03-10' },
      DATE_WINDOW_QUERY_FIELDS,
    );
    assert.equal(window.dueFrom?.getTime(), window.dueTo?.getTime());
  });

  it('campo presente na query com valor undefined não gera chave', () => {
    assert.deepEqual(
      dateWindowFromQuery({ dueFrom: undefined, dueTo: '2026-03-10' }, DATE_WINDOW_QUERY_FIELDS),
      { dueTo: new Date('2026-03-10') },
    );
  });

  it('só lê os campos pedidos e ignora o resto da query', () => {
    const query = { dueFrom: '2026-03-10', issuedFrom: '2026-01-01', status: 'Open' };
    assert.deepEqual(dateWindowFromQuery(query, ['dueFrom']), { dueFrom: new Date('2026-03-10') });
  });
});
