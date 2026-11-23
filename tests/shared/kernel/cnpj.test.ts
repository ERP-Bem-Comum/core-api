import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import { isValidCnpj } from '#src/shared/kernel/cnpj.ts';
import * as Cnpj from '#src/shared/kernel/cnpj.ts';

const VALID_BARE = '11222333000181';
const VALID_MASKED = '11.222.333/0001-81';
const VALID_ALPHANUMERIC = '12ABC34501DE35';

/**
 * `true` quando `From` é atribuível a `To`; `false` caso contrário.
 *
 * @typeParam From - O tipo de origem.
 * @typeParam To - O tipo de destino.
 */
type IsAssignable<From, To> = [From] extends [To] ? true : false;

const DV1_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] as const;
const DV2_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] as const;

/**
 * Calcula um DV de referência pelo módulo 11 sobre as primeiras posições de `chars`.
 *
 * @param chars - Os caracteres sobre os quais o DV é calculado.
 * @param weights - Os pesos, um por posição considerada.
 * @param valueOf - A conversão de cada caractere em número.
 * @returns O DV, de 0 a 9.
 */
const referenceDigit = (
  chars: string,
  weights: readonly number[],
  valueOf: (char: string) => number,
): number => {
  const sum = weights.reduce((acc, weight, i) => acc + valueOf(chars.charAt(i)) * weight, 0);
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
};

/**
 * Calcula os dois DVs de referência de uma base, com a conversão de caractere informada.
 *
 * @param base - Os caracteres sobre os quais os DVs são calculados.
 * @param valueOf - A conversão de cada caractere em número.
 * @returns Os dois DVs concatenados.
 */
const referenceCheckDigits = (base: string, valueOf: (char: string) => number): string => {
  const dv1 = referenceDigit(base, DV1_WEIGHTS, valueOf);
  const dv2 = referenceDigit(`${base}${String(dv1)}`, DV2_WEIGHTS, valueOf);
  return `${String(dv1)}${String(dv2)}`;
};

/**
 * Converte o caractere pela regra `ASCII(c) − 48`.
 *
 * @param char - O caractere a converter.
 * @returns O valor numérico do caractere.
 */
const asciiMinus48 = (char: string): number => char.charCodeAt(0) - 48;

/**
 * Converte o caractere pela base 36 (`'A'` vale 10), conversão que o algoritmo não usa.
 *
 * @param char - O caractere a converter.
 * @returns O valor numérico do caractere.
 */
const base36 = (char: string): number => Number.parseInt(char, 36);

/**
 * Gera uma base numérica de 12 dígitos determinística a partir de uma semente.
 *
 * @param seed - A semente.
 * @returns Doze dígitos.
 */
const numericBase = (seed: number): string =>
  String((seed * 7_919_993 + 104_729) % 1e12).padStart(12, '0');

describe('isValidCnpj', () => {
  it('aceita CNPJ válido bare', () => {
    assert.equal(isValidCnpj('11222333000181'), true);
  });

  it('aceita CNPJ válido mascarado', () => {
    assert.equal(isValidCnpj('11.222.333/0001-81'), true);
  });

  it('rejeita comprimento != 14', () => {
    assert.equal(isValidCnpj('123'), false);
    assert.equal(isValidCnpj('112223330001810'), false);
  });

  it('rejeita comprimento 13 e 15 mesmo quando o prefixo é um CNPJ válido', () => {
    assert.equal(isValidCnpj('1122233300018'), false);
    assert.equal(isValidCnpj('112223330001811'), false);
  });

  it('rejeita dígitos verificadores incorretos', () => {
    assert.equal(isValidCnpj('11222333000180'), false);
  });

  it('rejeita quando só o segundo DV está incorreto', () => {
    assert.equal(isValidCnpj('11222333000182'), false);
  });

  it('rejeita primeiro DV incorreto mesmo com o segundo DV coerente com ele', () => {
    assert.equal(isValidCnpj('11222333000190'), false);
    for (let seed = 1; seed <= 500; seed++) {
      const base = numericBase(seed);
      const legacyDigits = referenceCheckDigits(base, (char) => Number(char));
      const wrongDv1 = String((Number(legacyDigits.charAt(0)) + 1) % 10);
      const coherentDv2 = String(
        referenceDigit(`${base}${wrongDv1}`, DV2_WEIGHTS, (char) => Number(char)),
      );
      assert.equal(isValidCnpj(`${base}${wrongDv1}${coherentDv2}`), false, base);
    }
  });

  it('rejeita sequência de dígito repetido', () => {
    assert.equal(isValidCnpj('11111111111111'), false);
    assert.equal(isValidCnpj('00000000000000'), false);
  });

  it('rejeita os 14 caracteres idênticos para todos os dígitos de 0 a 9', () => {
    for (let digit = 0; digit <= 9; digit++) {
      assert.equal(isValidCnpj(String(digit).repeat(14)), false, String(digit));
    }
  });

  it('rejeita 00000000000000 mesmo com o módulo 11 fechando nos DVs 00', () => {
    assert.equal(referenceCheckDigits('000000000000', asciiMinus48), '00');
    assert.equal(isValidCnpj('00000000000000'), false);
  });

  it('rejeita não-dígitos que não formam 14 dígitos', () => {
    assert.equal(isValidCnpj('abc'), false);
    assert.equal(isValidCnpj(''), false);
  });

  it('rejeita string só de máscara', () => {
    assert.equal(isValidCnpj('../-'), false);
    assert.equal(isValidCnpj('              '), false);
  });

  it('aceita CNPJ alfanumérico válido bare', () => {
    assert.equal(isValidCnpj('12ABC34501DE35'), true);
    assert.equal(isValidCnpj('A1B2C3D4E5F668'), true);
  });

  it('aceita CNPJ alfanumérico válido mascarado', () => {
    assert.equal(isValidCnpj('12.ABC.345/01DE-35'), true);
  });

  it('aceita a base 100% alfabética com DVs numéricos corretos', () => {
    const base = 'ABCDEFGHIJKL';
    assert.equal(isValidCnpj(`${base}${referenceCheckDigits(base, asciiMinus48)}`), true);
  });

  it('normaliza minúsculas antes de validar (uppercase)', () => {
    assert.equal(isValidCnpj('12abc34501de35'), true);
  });

  it('aceita CNPJ alfanumérico mascarado em minúsculas', () => {
    assert.equal(isValidCnpj('12.abc.345/01de-35'), true);
  });

  it('rejeita DV alfanumérico incorreto', () => {
    assert.equal(isValidCnpj('12ABC34501DE34'), false);
  });

  it('rejeita DV não-numérico (DVs devem ser dígitos)', () => {
    assert.equal(isValidCnpj('12ABC34501DEAB'), false);
  });

  it('rejeita caractere fora de [0-9A-Z] nas 12 primeiras posições', () => {
    assert.equal(isValidCnpj('12ABC3450_DE35'), false);
    assert.equal(isValidCnpj('12ABÇ34501DE35'), false);
    assert.equal(isValidCnpj('12ABC34501DE,35'), false);
  });

  it('converte cada caractere por ASCII(c) − 48, com A valendo 17 e Z valendo 42', () => {
    assert.equal(isValidCnpj('12ABC34501DE35'), true);
    assert.equal(isValidCnpj('ZZ000000000159'), true);
    assert.equal(isValidCnpj('ZZ000000000124'), false);
  });

  it('aceita a faixa de letras de M a Z com DVs calculados por ASCII(c) − 48', () => {
    assert.equal(isValidCnpj('MNOPQRTUVWXY09'), true);
    const base = 'STUVWXYZMNOP';
    assert.equal(isValidCnpj(`${base}${referenceCheckDigits(base, asciiMinus48)}`), true);
  });

  it('rejeita os DVs calculados com A valendo 10 (base 36) quando diferem dos de ASCII − 48', () => {
    const base = '12ABC34501DE';
    const base36Digits = referenceCheckDigits(base, base36);
    assert.notEqual(base36Digits, referenceCheckDigits(base, asciiMinus48));
    assert.equal(isValidCnpj(`${base}${base36Digits}`), false);
  });

  it('valida CNPJ 100% numérico igual ao módulo 11 numérico legado', () => {
    for (let seed = 1; seed <= 500; seed++) {
      const base = numericBase(seed);
      const legacyDigits = referenceCheckDigits(base, (char) => Number(char));
      assert.equal(isValidCnpj(`${base}${legacyDigits}`), true, base);
      const wrongDv2 = String((Number(legacyDigits.charAt(1)) + 1) % 10);
      assert.equal(isValidCnpj(`${base}${legacyDigits.charAt(0)}${wrongDv2}`), false, base);
    }
  });

  it('remove todo caractere casado por \\s, inclusive U+00A0, U+2003 e U+FEFF', () => {
    for (let code = 0; code <= 0xffff; code++) {
      const char = String.fromCharCode(code);
      if (/\s/.test(char)) {
        assert.equal(isValidCnpj(`11222333${char}000181`), true, code.toString(16));
      }
    }
    assert.equal(isValidCnpj('11222333 000181'), true);
    assert.equal(isValidCnpj('11222333 000181'), true);
    assert.equal(isValidCnpj('11222333﻿000181'), true);
  });

  it('não remove caractere que \\s não casa, como U+0085, U+2010 e U+2013', () => {
    for (const char of ['\u0085', '‐', '–']) {
      assert.equal(isValidCnpj(`11222333${char}000181`), false, char);
    }
  });

  it('remove ponto, barra, hífen-menos, espaço, tab e quebra de linha em qualquer posição', () => {
    assert.equal(isValidCnpj(' 11 222 333\t0001-81\n'), true);
    assert.equal(isValidCnpj('112.223.330.001.81'), true);
    assert.equal(isValidCnpj('1-1/2.2 2-3/3.3-0/0.0-1/8.1'), true);
    assert.equal(isValidCnpj('11 222 333 0001 81'), true);
  });

  it('aplica uppercase antes de medir o comprimento, então ß de 13 caracteres vira SS de 14', () => {
    const base = 'SS0000000001';
    const digits = referenceCheckDigits(base, asciiMinus48);
    const input = `ß0000000001${digits}`;
    assert.equal(input.length, 13);
    assert.equal(isValidCnpj(input), true);
  });

  it('devolve o mesmo resultado para a mesma entrada em chamadas repetidas', () => {
    assert.equal(isValidCnpj(VALID_BARE), isValidCnpj(VALID_BARE));
    assert.equal(isValidCnpj('11222333000180'), isValidCnpj('11222333000180'));
  });
});

describe('Cnpj — VO (module-as-namespace, Padrão D)', () => {
  it('expõe `parse` e NÃO expõe `generate`', () => {
    const ns: Readonly<Record<string, unknown>> = Cnpj;
    assert.equal(typeof ns.parse, 'function');
    assert.equal(ns.generate, undefined);
  });

  it('expõe em runtime exatamente isValidCnpj e parse', () => {
    assert.deepEqual(Object.keys(Cnpj).sort(), ['isValidCnpj', 'parse']);
  });

  it('mantém `isValidCnpj` exportado (sem regressão no import de contratos)', () => {
    assert.equal(typeof Cnpj.isValidCnpj, 'function');
  });

  it('aceita CNPJ válido bare', () => {
    const r = Cnpj.parse(VALID_BARE);
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value, VALID_BARE);
  });

  it('aceita CNPJ válido mascarado e normaliza para 14 dígitos', () => {
    const r = Cnpj.parse(VALID_MASKED);
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value, VALID_BARE);
  });

  it('rejeita CNPJ inválido com erro kebab', () => {
    const r = Cnpj.parse('11222333000180');
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'invalid-cnpj');
  });

  it('aceita CNPJ alfanumérico mascarado/minúsculo e normaliza para uppercase bare', () => {
    const r = Cnpj.parse('12.abc.345/01de-35');
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value, VALID_ALPHANUMERIC);
  });

  it('devolve invalid-cnpj para vazio, comprimento errado, dígito repetido e DV não-numérico', () => {
    for (const raw of ['', '123', '00000000000000', '12ABC34501DEAB']) {
      const r = Cnpj.parse(raw);
      assert.deepEqual(r, { ok: false, error: 'invalid-cnpj' }, raw);
    }
  });

  it('remove espaços em branco das bordas e do meio no valor normalizado', () => {
    const r = Cnpj.parse('  11 222 333 0001 81\t');
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value, VALID_BARE);
  });

  it('concorda com isValidCnpj em toda entrada: ok se e somente se válido', () => {
    const inputs = [
      VALID_BARE,
      VALID_MASKED,
      VALID_ALPHANUMERIC,
      '11222333000180',
      '',
      'abc',
      '12abc34501de35',
    ];
    for (const raw of inputs) {
      assert.equal(Cnpj.parse(raw).ok, isValidCnpj(raw), raw);
    }
  });

  it('o valor brandado de parse é atribuível a string', () => {
    const r = Cnpj.parse(VALID_BARE);
    if (r.ok) {
      const plain: string = r.value;
      assert.equal(plain.length, 14);
    }
  });

  it('recusa em tipo uma string crua no lugar de Cnpj', () => {
    const rawAccepted: IsAssignable<string, Cnpj.Cnpj> = false;
    const brandedAccepted: IsAssignable<Cnpj.Cnpj, string> = true;
    assert.deepEqual([rawAccepted, brandedAccepted], [false, true]);
  });

  it('recusa em tipo um CnpjError diferente de invalid-cnpj', () => {
    const otherAccepted: IsAssignable<'cnpj-invalid', Cnpj.CnpjError> = false;
    const invalidCnpjAccepted: IsAssignable<'invalid-cnpj', Cnpj.CnpjError> = true;
    assert.deepEqual([otherAccepted, invalidCnpjAccepted], [false, true]);
  });
});
