import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  formatSequentialNumber,
  parseSequentialNumber,
  deriveNumberYear,
  resolveSequentialNumber,
} from '#src/modules/contracts/domain/contract/sequential-number.ts';

// W0 (RED) — issue #425: numeração pelo ano de criação/vigência inicial.
// Funções PURAS (parse/derive/resolução) — sem I/O, testáveis com set fake.

describe('parseSequentialNumber — separa XXXX e YYYY (issue #425)', () => {
  it('parseia 4 dígitos + ano', () => {
    assert.deepEqual(parseSequentialNumber('0042/2024'), { seq: 42, year: 2024 });
  });

  it('parseia 3 dígitos legado + ano', () => {
    assert.deepEqual(parseSequentialNumber('007/2023'), { seq: 7, year: 2023 });
  });

  it('parseia sequência de 4 dígitos cheia', () => {
    assert.deepEqual(parseSequentialNumber('1234/2026'), { seq: 1234, year: 2026 });
  });

  for (const invalid of [
    '',
    '42/2024',
    '00042/2024',
    '0042-2024',
    'abcd/2024',
    '0042/24',
    '/2024',
  ]) {
    it(`retorna null para formato inesperado: ${JSON.stringify(invalid)}`, () => {
      assert.equal(parseSequentialNumber(invalid), null);
    });
  }

  it('é o inverso de formatSequentialNumber para números gerados', () => {
    const n = formatSequentialNumber(42, 2024);
    assert.equal(n, '0042/2024');
    assert.deepEqual(parseSequentialNumber(n), { seq: 42, year: 2024 });
  });
});

describe('deriveNumberYear — ano da vigência inicial (issue #425, decisão 1)', () => {
  it('extrai o ano UTC de original_period_start', () => {
    assert.equal(deriveNumberYear(new Date(Date.UTC(2024, 0, 1))), 2024);
  });

  it('não sofre drift de timezone na virada de ano (UTC meia-noite)', () => {
    // 2024-01-01T00:00:00Z — em fusos negativos seria 2023 se usasse getFullYear local.
    assert.equal(deriveNumberYear(new Date('2024-01-01T00:00:00Z')), 2024);
    assert.equal(deriveNumberYear(new Date('2023-12-31T00:00:00Z')), 2023);
  });
});

describe('resolveSequentialNumber — preserva-ou-reatribui (issue #425, decisão 2)', () => {
  it('preserva a sequência trocando só o ano quando o alvo está livre', () => {
    const taken = new Set<string>(['0005/2026']);
    const r = resolveSequentialNumber(5, 2024, (c) => taken.has(c));
    assert.deepEqual(r, { kind: 'preserve', sequentialNumber: '0005/2024' });
  });

  it('sinaliza reatribuição quando XXXX/anoAlvo já existe (nunca duplica)', () => {
    const taken = new Set<string>(['0005/2024']);
    const r = resolveSequentialNumber(5, 2024, (c) => taken.has(c));
    assert.deepEqual(r, { kind: 'reassign' });
  });

  it('normaliza sequência de 3 dígitos para 4 no número preservado', () => {
    const taken = new Set<string>();
    const r = resolveSequentialNumber(7, 2023, (c) => taken.has(c));
    assert.deepEqual(r, { kind: 'preserve', sequentialNumber: '0007/2023' });
  });
});
