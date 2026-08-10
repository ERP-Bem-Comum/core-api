import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
// W0 RED: as primitivas posicionais do CNAB ainda não existem.
import {
  alpha,
  num,
  cents,
  dateDDMMYYYY,
  timeHHMMSS,
} from '#src/modules/financial/adapters/cnab/positional.ts';

const unwrap = (r: ReturnType<typeof num>): string => {
  assert.ok(isOk(r), 'esperava ok');
  return r.value;
};

describe('CNAB positional — numérico alinha à direita com zeros', () => {
  it('preenche com zeros à esquerda até o tamanho', () => {
    assert.equal(unwrap(num(237, 3)), '237');
    assert.equal(unwrap(num(1, 4)), '0001');
    assert.equal(unwrap(num(0, 6)), '000000');
  });

  it('aceita string de dígitos e preserva zeros significativos', () => {
    assert.equal(unwrap(num('00123', 8)), '00000123');
  });

  // O campo numérico NUNCA trunca: cortar um valor ou um documento produz arquivo
  // sintaticamente válido e semanticamente errado — o pior defeito possível aqui.
  it('recusa valor que não cabe no campo, em vez de truncar', () => {
    const r = num(1234, 3);
    assert.ok(isErr(r));
    assert.equal(r.error, 'numeric-field-overflow');
  });

  it('recusa valor não inteiro ou não numérico', () => {
    assert.ok(isErr(num(12.5, 5)));
    assert.ok(isErr(num('12a', 5)));
    assert.ok(isErr(num(-1, 5)));
  });
});

describe('CNAB positional — alfanumérico alinha à esquerda com brancos', () => {
  it('preenche com brancos à direita até o tamanho', () => {
    assert.equal(alpha('BEM COMUM', 12), 'BEM COMUM   ');
    assert.equal(alpha('', 3), '   ');
  });

  it('trunca no tamanho do campo — o layout corta nome longo por desenho', () => {
    assert.equal(alpha('NOME MUITO LONGO', 4), 'NOME');
  });

  it('normaliza para maiúsculas sem acento, que é o que o banco aceita', () => {
    assert.equal(alpha('Associação', 10), 'ASSOCIACAO');
    assert.equal(alpha('José Ç', 8), 'JOSE C  ');
  });
});

describe('CNAB positional — conversores de domínio', () => {
  it('valor em centavos vira numérico sem separador', () => {
    assert.equal(unwrap(cents(123456, 18)), '000000000000123456');
    assert.equal(unwrap(cents(0, 8)), '00000000');
  });

  it('data vira DDMMAAAA', () => {
    assert.equal(unwrap(dateDDMMYYYY(new Date(Date.UTC(2026, 7, 10)))), '10082026');
  });

  it('hora vira HHMMSS', () => {
    assert.equal(unwrap(timeHHMMSS(new Date(Date.UTC(2026, 7, 10, 14, 5, 9)))), '140509');
  });
});
