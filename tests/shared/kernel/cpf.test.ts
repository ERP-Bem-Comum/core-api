import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import type { Result } from '#src/shared/index.ts';
import type { BrandOf } from '#src/shared/primitives/brand.ts';
import * as Cpf from '#src/shared/kernel/cpf.ts';

/** CPF válido de referência, sem máscara. */
const VALID_BARE = '11144477735';

/** O mesmo CPF de referência com a máscara `000.000.000-00`. */
const VALID_MASKED = '111.444.777-35';

/** CPF válido cujo primeiro dígito verificador é 0 (resto da soma menor que 2). */
const VALID_DV1_ZERO = '10000000108';

/** CPF válido cujo segundo dígito verificador é 0 (resto da soma menor que 2). */
const VALID_DV2_ZERO = '10000000280';

/** Igualdade de tipos em tempo de compilação. */
type Equals<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

/** `true` quando `From` é atribuível a `To` em tempo de compilação; `false` quando é recusado. */
type IsAssignable<From, To> = [From] extends [To] ? true : false;

const parsedValue = (raw: string): string => {
  const r = Cpf.parse(raw);
  assert.equal(r.ok, true);
  return r.ok ? r.value : '';
};

describe('Cpf — módulo como namespace', () => {
  it('importado com `import * as Cpf`, o único valor exportado em runtime é `parse`', () => {
    assert.deepEqual(Object.keys(Cpf), ['parse']);
    assert.equal(typeof Cpf.parse, 'function');
  });

  it('não expõe `generate` nem um objeto-namespace `Cpf` aninhado', () => {
    const ns: Readonly<Record<string, unknown>> = Cpf;
    assert.equal(ns.generate, undefined);
    assert.equal(ns.Cpf, undefined);
  });
});

describe('Cpf — tipos', () => {
  it('`Cpf` é string brandada com a marca literal "Cpf"', () => {
    const brandIsCpf: Equals<BrandOf<Cpf.Cpf>, 'Cpf'> = true;
    assert.equal(brandIsCpf, true);
    const cpf = parsedValue(VALID_BARE);
    assert.equal(typeof cpf, 'string');
  });

  it('string crua não é atribuível a `Cpf`', () => {
    const rawStringIsCpf: IsAssignable<string, Cpf.Cpf> = false;
    assert.equal(rawStringIsCpf, false);
  });

  it('`CpfError` é exatamente o literal "invalid-cpf"', () => {
    const errorIsLiteral: Equals<Cpf.CpfError, 'invalid-cpf'> = true;
    assert.equal(errorIsLiteral, true);
    const otherLiteralIsCpfError: IsAssignable<'cpf-invalid', Cpf.CpfError> = false;
    assert.equal(otherLiteralIsCpfError, false);
  });

  it('`parse` recebe string e devolve `Result<Cpf, CpfError>`', () => {
    const returnsResult: Equals<ReturnType<typeof Cpf.parse>, Result<Cpf.Cpf, Cpf.CpfError>> = true;
    const takesString: Equals<Parameters<typeof Cpf.parse>, [raw: string]> = true;
    assert.equal(returnsResult && takesString, true);
    assert.equal(Cpf.parse.length, 1);
  });
});

describe('Cpf — parse aceita', () => {
  it('aceita CPF válido sem máscara e devolve os mesmos 11 dígitos', () => {
    const r = Cpf.parse(VALID_BARE);
    assert.equal(isOk(r), true);
    assert.equal(parsedValue(VALID_BARE), VALID_BARE);
  });

  it('aceita CPF válido mascarado `000.000.000-00` e devolve os 11 dígitos sem máscara', () => {
    assert.equal(parsedValue(VALID_MASKED), VALID_BARE);
  });

  it('aceita CPF cujo primeiro dígito verificador é 0 por resto menor que 2', () => {
    assert.equal(parsedValue(VALID_DV1_ZERO), VALID_DV1_ZERO);
  });

  it('aceita CPF cujo segundo dígito verificador é 0 por resto menor que 2', () => {
    assert.equal(parsedValue(VALID_DV2_ZERO), VALID_DV2_ZERO);
  });

  it('descarta todo caractere não-dígito ASCII, em qualquer posição, antes de validar', () => {
    assert.equal(parsedValue('CPF: 111a444b777c35 '), VALID_BARE);
    assert.equal(parsedValue(' 111 444 777 35\n'), VALID_BARE);
  });

  it('o exemplo do TSDoc de `parse` devolve exatamente os resultados anunciados', () => {
    assert.deepEqual(Cpf.parse('111.444.777-35'), { ok: true, value: '11144477735' });
    assert.deepEqual(Cpf.parse('11144477736'), { ok: false, error: 'invalid-cpf' });
  });

  it('descarta dígitos não-ASCII intercalados num CPF ASCII válido e devolve os 11 dígitos ASCII', () => {
    assert.deepEqual(Cpf.parse('111４444７77735'), { ok: true, value: VALID_BARE });
    assert.deepEqual(Cpf.parse('١11144477735'), { ok: true, value: VALID_BARE });
  });

  it('não confere a posição dos separadores da máscara', () => {
    assert.equal(parsedValue('1114.44777-3.5'), VALID_BARE);
    assert.equal(parsedValue('111/444/777/35'), VALID_BARE);
  });
});

describe('Cpf — parse rejeita com "invalid-cpf"', () => {
  it('rejeita quando sobram menos de 11 dígitos após remover os não-dígitos', () => {
    const r = Cpf.parse('123');
    assert.equal(isErr(r), true);
    assert.deepEqual(r, { ok: false, error: 'invalid-cpf' });
    assert.equal(isErr(Cpf.parse('111.444.777-3')), true);
  });

  it('rejeita quando sobram mais de 11 dígitos, mesmo que os 11 primeiros formem CPF válido', () => {
    assert.deepEqual(Cpf.parse('111444777350'), { ok: false, error: 'invalid-cpf' });
    assert.deepEqual(Cpf.parse('111.444.777-350'), { ok: false, error: 'invalid-cpf' });
  });

  it('rejeita as dez sequências de um único dígito repetido', () => {
    for (let d = 0; d <= 9; d++) {
      assert.deepEqual(Cpf.parse(String(d).repeat(11)), { ok: false, error: 'invalid-cpf' });
    }
  });

  it('rejeita quando só o primeiro dígito verificador está errado', () => {
    assert.deepEqual(Cpf.parse('11144477743'), { ok: false, error: 'invalid-cpf' });
  });

  it('rejeita quando só o segundo dígito verificador está errado', () => {
    assert.deepEqual(Cpf.parse('11144477736'), { ok: false, error: 'invalid-cpf' });
  });

  it('rejeita quando os dois dígitos verificadores estão errados', () => {
    assert.deepEqual(Cpf.parse('11144477746'), { ok: false, error: 'invalid-cpf' });
  });

  it('rejeita string vazia e string sem nenhum dígito', () => {
    assert.deepEqual(Cpf.parse(''), { ok: false, error: 'invalid-cpf' });
    assert.deepEqual(Cpf.parse('abc'), { ok: false, error: 'invalid-cpf' });
  });

  it('rejeita dígitos não-ASCII, que são descartados como não-dígitos', () => {
    const fullWidth = '１１１４４４７７７３５';
    const arabicIndic = '١١١٤٤٤٧٧٧٣٥';
    assert.deepEqual(Cpf.parse(fullWidth), { ok: false, error: 'invalid-cpf' });
    assert.deepEqual(Cpf.parse(arabicIndic), { ok: false, error: 'invalid-cpf' });
  });
});
