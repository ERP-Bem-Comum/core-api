import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as z from 'zod/v4';

import { exhaustiveStringUnion } from '#src/shared/primitives/exhaustive.ts';

/** União de três literais usada como alvo de cobertura nos casos abaixo. */
type Color = 'red' | 'green' | 'blue';

/**
 * Resolve para `true` quando `X` e `Y` são o mesmo tipo, e para `false` caso contrário.
 *
 * @typeParam X - primeiro tipo comparado.
 * @typeParam Y - segundo tipo comparado.
 */
type Equals<X, Y> = [X] extends [Y] ? ([Y] extends [X] ? true : false) : false;

/**
 * Só aceita o literal `true`; usada para transformar `Equals` em erro de compilação.
 *
 * @typeParam T - resultado de uma comparação de tipos.
 */
type Expect<T extends true> = T;

describe('exhaustiveStringUnion', () => {
  it('devolve em runtime a mesma referência da tupla recebida', () => {
    const input = ['red', 'green', 'blue'] as const;
    const output = exhaustiveStringUnion<Color>()(input);
    assert.equal(output, input);
  });

  it('não altera o conteúdo nem a ordem da tupla em runtime', () => {
    const output = exhaustiveStringUnion<Color>()(['blue', 'red', 'green'] as const);
    assert.deepEqual(output, ['blue', 'red', 'green']);
  });

  it('aceita a tupla que cobre exatamente todos os membros da união', () => {
    const colors = exhaustiveStringUnion<Color>()(['red', 'green', 'blue'] as const);
    assert.equal(colors.length, 3);
  });

  it('aceita a cobertura completa em qualquer ordem', () => {
    const colors = exhaustiveStringUnion<Color>()(['green', 'blue', 'red'] as const);
    assert.equal(colors.length, 3);
  });

  it('recusa em compilação a tupla à qual falta um membro da união', () => {
    // @ts-expect-error
    const incomplete = exhaustiveStringUnion<Color>()(['red', 'green'] as const);
    assert.equal(incomplete.length, 2);
  });

  it('recusa em compilação a tupla com literal fora da união', () => {
    // @ts-expect-error
    const extra = exhaustiveStringUnion<Color>()(['red', 'green', 'blue', 'purple'] as const);
    assert.equal(extra.length, 4);
  });

  it('recusa em compilação a tupla vazia', () => {
    // @ts-expect-error
    const empty = exhaustiveStringUnion<Color>()([] as const);
    assert.equal(empty.length, 0);
  });

  it('aceita membro repetido desde que todos os membros estejam presentes', () => {
    const repeated = exhaustiveStringUnion<Color>()(['red', 'red', 'green', 'blue'] as const);
    assert.deepEqual(repeated, ['red', 'red', 'green', 'blue']);
  });

  it('aceita a união de um único membro com a tupla de um elemento', () => {
    const single = exhaustiveStringUnion<'only'>()(['only'] as const);
    assert.deepEqual(single, ['only']);
  });

  it('preserva no tipo de retorno os literais da tupla na ordem passada', () => {
    const colors = exhaustiveStringUnion<Color>()(['blue', 'red', 'green'] as const);
    const proof: Expect<Equals<typeof colors, readonly ['blue', 'red', 'green']>> = true;
    assert.equal(proof, true);
  });

  it('infere a tupla de literais mesmo sem as const no argumento', () => {
    const colors = exhaustiveStringUnion<Color>()(['red', 'green', 'blue']);
    const proof: Expect<Equals<typeof colors, ['red', 'green', 'blue']>> = true;
    assert.equal(proof, true);
  });

  it('recusa em compilação a tupla incompleta mesmo sem as const no argumento', () => {
    // @ts-expect-error
    const incomplete = exhaustiveStringUnion<Color>()(['red', 'green']);
    assert.equal(incomplete.length, 2);
  });

  it('recusa em compilação a tupla com literal fora da união mesmo sem as const no argumento', () => {
    // @ts-expect-error
    const extra = exhaustiveStringUnion<Color>()(['red', 'green', 'blue', 'purple']);
    assert.equal(extra.length, 4);
  });

  it('recusa em compilação a tupla vazia mesmo sem as const no argumento', () => {
    // @ts-expect-error
    const empty = exhaustiveStringUnion<Color>()([]);
    assert.equal(empty.length, 0);
  });

  it('aceita em compilação a tupla [U] anotada com a própria união mesmo com um só membro em runtime', () => {
    const typedByUnion: [Color] = ['red'];
    const output = exhaustiveStringUnion<Color>()(typedByUnion);
    assert.deepEqual(output, ['red']);
  });

  it('aceita em compilação a tupla readonly [U, ...U[]] anotada com a própria união mesmo incompleta em runtime', () => {
    const typedByUnion: readonly [Color, ...Color[]] = ['red', 'green'];
    const output = exhaustiveStringUnion<Color>()(typedByUnion);
    assert.deepEqual(output, ['red', 'green']);
  });

  it('entrega um retorno aceito diretamente por z.enum', () => {
    const colors = exhaustiveStringUnion<Color>()(['red', 'green', 'blue'] as const);
    const schema = z.enum(colors);
    assert.deepEqual(schema.options, ['red', 'green', 'blue']);
    assert.equal(schema.parse('green'), 'green');
    assert.equal(schema.safeParse('purple').success, false);
  });

  it('recusa em compilação qualquer tupla de literais quando a união é string', () => {
    // @ts-expect-error
    const wide = exhaustiveStringUnion<string>()(['a', 'b'] as const);
    assert.equal(wide.length, 2);
  });
});
