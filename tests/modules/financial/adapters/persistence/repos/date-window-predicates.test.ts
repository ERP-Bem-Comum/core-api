import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import type { SQL } from 'drizzle-orm';
import { MySqlDialect } from 'drizzle-orm/mysql-core';

import { dateWindowPredicates } from '#src/modules/financial/adapters/persistence/repos/date-window-predicates.ts';
import {
  finDocuments,
  finPayables,
} from '#src/modules/financial/adapters/persistence/schemas/mysql.ts';

const dialect = new MySqlDialect();

const render = (predicates: readonly SQL[]): readonly { sql: string; params: unknown[] }[] =>
  predicates.map((p) => {
    const q = dialect.sqlToQuery(p);
    return { sql: q.sql, params: q.params };
  });

const FROM = new Date('2026-03-10');
const TO = new Date('2026-05-20');

describe('financial/adapters/persistence — dateWindowPredicates', () => {
  it('sem nenhum extremo não gera predicado', () => {
    assert.deepEqual(dateWindowPredicates(finDocuments.issueDate, undefined, undefined), []);
  });

  it('só o extremo inicial gera um único >= inclusivo', () => {
    assert.deepEqual(render(dateWindowPredicates(finDocuments.issueDate, FROM, undefined)), [
      { sql: '`fin_documents`.`issue_date` >= ?', params: [FROM] },
    ]);
  });

  it('só o extremo final gera um único <= inclusivo', () => {
    assert.deepEqual(render(dateWindowPredicates(finDocuments.issueDate, undefined, TO)), [
      { sql: '`fin_documents`.`issue_date` <= ?', params: [TO] },
    ]);
  });

  it('os dois extremos geram >= e <= na coluna recebida', () => {
    assert.deepEqual(render(dateWindowPredicates(finPayables.dueDate, FROM, TO)), [
      { sql: '`fin_payables`.`due_date` >= ?', params: [FROM] },
      { sql: '`fin_payables`.`due_date` <= ?', params: [TO] },
    ]);
  });

  it('extremos iguais geram >= e <= com a mesma data', () => {
    assert.deepEqual(render(dateWindowPredicates(finDocuments.dueDate, FROM, FROM)), [
      { sql: '`fin_documents`.`due_date` >= ?', params: [FROM] },
      { sql: '`fin_documents`.`due_date` <= ?', params: [FROM] },
    ]);
  });
});
