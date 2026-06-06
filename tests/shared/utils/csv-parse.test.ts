import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

// W0/RED — `parseCsv`/`tokenizeCsv` ainda NÃO existem em #src/shared/utils/csv.ts
// (CORE-CSV-PARSE-UTIL — ADR-0002: promover o parser hoje privado em contracts/cli).
import { parseCsv, tokenizeCsv, type Table } from '#src/shared/utils/csv.ts';

describe('tokenizeCsv — RFC 4180', () => {
  it('tokeniza linhas e células simples', () => {
    assert.deepEqual(tokenizeCsv('a,b\n1,2'), [
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('respeita células entre aspas com vírgula interna', () => {
    assert.deepEqual(tokenizeCsv('a,b\n"x,y",2'), [
      ['a', 'b'],
      ['x,y', '2'],
    ]);
  });

  it('desescapa aspas duplas internas ("" → ")', () => {
    assert.deepEqual(tokenizeCsv('h\n"diz ""oi"""'), [['h'], ['diz "oi"']]);
  });

  it('trata CRLF e LF como o mesmo terminador de linha', () => {
    assert.deepEqual(tokenizeCsv('a,b\r\n1,2'), [
      ['a', 'b'],
      ['1', '2'],
    ]);
  });
});

describe('parseCsv — header + rows', () => {
  it('separa cabeçalho das linhas de dados', () => {
    const r = parseCsv('id,name\n1,Alpha\n2,Beta');
    assert.equal(r.ok, true);
    if (!r.ok) return;
    const table: Table = r.value;
    assert.deepEqual(table.headers, ['id', 'name']);
    assert.deepEqual(table.rows, [
      ['1', 'Alpha'],
      ['2', 'Beta'],
    ]);
  });

  it('ignora linhas de dados totalmente em branco', () => {
    const r = parseCsv('id,name\n1,Alpha\n\n2,Beta\n');
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.deepEqual(r.value.rows, [
      ['1', 'Alpha'],
      ['2', 'Beta'],
    ]);
  });

  it('conteúdo vazio ou só espaços → err(csv-empty)', () => {
    const r1 = parseCsv('');
    const r2 = parseCsv('   \n  ');
    assert.equal(r1.ok, false);
    if (!r1.ok) assert.equal(r1.error, 'csv-empty');
    assert.equal(r2.ok, false);
    if (!r2.ok) assert.equal(r2.error, 'csv-empty');
  });

  it('aspas não fechadas → err(csv-malformed)', () => {
    const r = parseCsv('id,name\n1,"sem fim');
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'csv-malformed');
  });
});
