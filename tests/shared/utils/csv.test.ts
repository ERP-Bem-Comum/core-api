import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  escapeCsvCell,
  toCsvLine,
  toCsv,
  BOM,
  SEPARATOR,
  LINE_TERMINATOR,
} from '#src/shared/utils/csv.ts';

describe('csv util — constants', () => {
  it('BOM é o caractere UTF-8 BOM (U+FEFF)', () => {
    assert.equal(BOM, '﻿');
  });

  it('SEPARATOR é vírgula e LINE_TERMINATOR é CRLF (RFC 4180)', () => {
    assert.equal(SEPARATOR, ',');
    assert.equal(LINE_TERMINATOR, '\r\n');
  });
});

describe('escapeCsvCell — anti-fórmula (CSV injection)', () => {
  it('prefixa com aspa simples célula iniciando em = + - @', () => {
    assert.equal(escapeCsvCell('=1+1'), "'=1+1");
    assert.equal(escapeCsvCell('+SUM(A1)'), "'+SUM(A1)");
    assert.equal(escapeCsvCell('-2'), "'-2");
    assert.equal(escapeCsvCell('@cmd'), "'@cmd");
  });

  it('prefixa célula iniciando em TAB ou CR (gatilhos de fórmula)', () => {
    // \t não dispara RFC4180_SPECIAL → só o prefixo de fórmula.
    assert.equal(escapeCsvCell('\tfoo'), "'\tfoo");
    // \r dispara fórmula E RFC4180 → prefixo + quoting.
    assert.equal(escapeCsvCell('\rfoo'), '"\'\rfoo"');
  });

  it('não altera célula comum sem gatilho', () => {
    assert.equal(escapeCsvCell('Empresa LTDA'), 'Empresa LTDA');
    assert.equal(escapeCsvCell(''), '');
    assert.equal(escapeCsvCell('123'), '123');
  });
});

describe('escapeCsvCell — RFC 4180 quoting', () => {
  it('envolve em aspas célula com vírgula', () => {
    assert.equal(escapeCsvCell('a,b'), '"a,b"');
  });

  it('duplica aspas internas e envolve em aspas', () => {
    assert.equal(escapeCsvCell('diz "oi"'), '"diz ""oi"""');
  });

  it('envolve em aspas célula com quebra de linha (LF e CRLF)', () => {
    assert.equal(escapeCsvCell('linha1\nlinha2'), '"linha1\nlinha2"');
    assert.equal(escapeCsvCell('a\r\nb'), '"a\r\nb"');
  });
});

describe('toCsvLine', () => {
  it('junta células escapadas com SEPARATOR', () => {
    assert.equal(toCsvLine(['a', 'b', 'c']), 'a,b,c');
  });

  it('escapa cada célula individualmente', () => {
    assert.equal(toCsvLine(['ok', 'a,b', '=x']), 'ok,"a,b",\'=x');
  });

  it('linha vazia de uma célula vazia', () => {
    assert.equal(toCsvLine(['']), '');
  });
});

describe('toCsv', () => {
  const HEADER = ['id', 'name'] as const;

  it('header sem linhas → BOM + headerLine + CRLF', () => {
    assert.equal(toCsv(HEADER, []), `${BOM}id,name${LINE_TERMINATOR}`);
  });

  it('header + linhas → BOM + header CRLF linha CRLF (termina em CRLF)', () => {
    const out = toCsv(HEADER, [
      ['1', 'Alpha'],
      ['2', 'Beta'],
    ]);
    assert.equal(
      out,
      `${BOM}id,name${LINE_TERMINATOR}1,Alpha${LINE_TERMINATOR}2,Beta${LINE_TERMINATOR}`,
    );
  });

  it('aplica escaping nas linhas de dados', () => {
    const out = toCsv(HEADER, [['1', 'a,b']]);
    assert.equal(out, `${BOM}id,name${LINE_TERMINATOR}1,"a,b"${LINE_TERMINATOR}`);
  });

  it('output sempre inicia com BOM', () => {
    assert.equal(toCsv(HEADER, []).startsWith(BOM), true);
  });
});
