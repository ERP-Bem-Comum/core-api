import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  type Result,
  ok,
  err,
  isOk,
  isErr,
  mapErr,
  combine,
} from '#src/shared/primitives/result.ts';

type Equals<A, B> =
  (<G>(probe: G) => G extends A ? 1 : 2) extends <G>(probe: G) => G extends B ? 1 : 2
    ? true
    : false;

describe('Equals — asserção de tipo usada nesta suíte', () => {
  it('distingue unknown de any', () => {
    const unknownDiffersFromAny: Equals<
      readonly unknown[],
      readonly ReturnType<typeof JSON.parse>[]
    > = false;

    assert.equal(unknownDiffersFromAny, false);
  });

  it('distingue never de any', () => {
    const neverDiffersFromAny: Equals<never, ReturnType<typeof JSON.parse>> = false;

    assert.equal(neverDiffersFromAny, false);
  });
});

describe('ok — construtor de sucesso', () => {
  it('produz objeto { ok: true, value }', () => {
    const r = ok(42);

    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value, 42);
  });

  it('produz objeto com exatamente as chaves ok e value', () => {
    const r = ok('hello');

    assert.deepEqual(Object.keys(r), ['ok', 'value']);
    assert.deepEqual(r, { ok: true, value: 'hello' });
  });

  it('guarda o valor recebido por referência, sem copiá-lo', () => {
    const value = { id: 1, name: 'x' };

    const r = ok(value);

    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value, value);
  });

  it('aceita undefined como valor e continua sendo sucesso', () => {
    const r = ok(undefined);

    assert.equal(r.ok, true);
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value, undefined);
  });

  it('tipa o resultado como Result<T, never>', () => {
    const r = ok(7);

    const typedAsNeverError: Equals<typeof r, Result<number, never>> = true;
    assert.equal(typedAsNeverError, true);
  });

  it('é atribuível a qualquer Result<T, E> com o mesmo T', () => {
    const r: Result<number, 'any-error'> = ok(7);

    assert.equal(r.ok, true);
  });

  it('não congela o objeto, que aceita mutação em runtime', () => {
    const r = ok(1);

    assert.equal(Object.isFrozen(r), false);
    assert.equal(Reflect.set(r, 'value', 2), true);
    if (r.ok) assert.equal(r.value, 2);
  });
});

describe('err — construtor de erro', () => {
  it('produz objeto { ok: false, error }', () => {
    const r = err('not-found' as const);

    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'not-found');
  });

  it('produz objeto com exatamente as chaves ok e error', () => {
    const r = err('not-found');

    assert.deepEqual(Object.keys(r), ['ok', 'error']);
    assert.deepEqual(r, { ok: false, error: 'not-found' });
  });

  it('mantém a união quando o erro já é um valor tipado como string literal union', () => {
    type DomainError = 'a-error' | 'b-error';
    const pick = (): DomainError => 'b-error';

    const r = err(pick());

    const keepsUnion: Equals<typeof r, Result<never, DomainError>> = true;
    assert.equal(keepsUnion, true);
    if (!r.ok) assert.equal(r.error, 'b-error');
    else assert.fail('esperado o ramo de erro');
  });

  it('mantém o literal escrito direto quando o destino anota o tipo do Result', () => {
    const r: Result<number, 'not-found'> = err('not-found');

    const keepsLiteral: Equals<typeof r, Result<number, 'not-found'>> = true;
    assert.equal(keepsLiteral, true);
    assert.deepEqual(r, { ok: false, error: 'not-found' });
  });

  it('alarga para string o literal escrito direto sem anotação no destino', () => {
    const r = err('not-found');

    const widened: Equals<typeof r, Result<never, string>> = true;
    const notLiteral: Equals<typeof r, Result<never, 'not-found'>> = false;
    assert.equal(widened, true);
    assert.equal(notLiteral, false);
  });

  it('tipa o resultado como Result<never, E>', () => {
    const error = { tag: 'invalid-input' as const };

    const r = err(error);

    const typedAsNeverValue: Equals<typeof r, Result<never, { tag: 'invalid-input' }>> = true;
    assert.equal(typedAsNeverValue, true);
  });

  it('guarda o erro recebido por referência, sem copiá-lo', () => {
    const error = { tag: 'invalid-input' };

    const r = err(error);

    if (!r.ok) assert.equal(r.error, error);
    else assert.fail('esperado o ramo de erro');
  });

  it('é atribuível a qualquer Result<T, E> com o mesmo E', () => {
    const r: Result<{ readonly id: number }, string> = err('boom');

    assert.equal(r.ok, false);
  });

  it('não congela o objeto, que aceita mutação em runtime', () => {
    const r = err('a');

    assert.equal(Object.isFrozen(r), false);
    assert.equal(Reflect.set(r, 'error', 'b'), true);
    if (!r.ok) assert.equal(r.error, 'b');
  });
});

describe('isOk — type predicate de sucesso', () => {
  it('retorna true para ok(x)', () => {
    const r: Result<number, string> = ok(7);

    assert.equal(isOk(r), true);
  });

  it('retorna false para err(e)', () => {
    const r: Result<number, string> = err('boom');

    assert.equal(isOk(r), false);
  });

  it('estreita o tipo para o ramo de sucesso, liberando .value', () => {
    const r: Result<number, string> = ok(99);

    if (isOk(r)) {
      const value: number = r.value;
      assert.equal(value, 99);
    } else {
      assert.fail('esperado o ramo de sucesso');
    }
  });

  it('estreita o ramo else para o erro, liberando .error', () => {
    const r: Result<number, string> = err('boom');

    if (isOk(r)) {
      assert.fail('esperado o ramo de erro');
    } else {
      const error: string = r.error;
      assert.equal(error, 'boom');
    }
  });
});

describe('isErr — type predicate de erro', () => {
  it('retorna true para err(e)', () => {
    const r: Result<number, string> = err('nope');

    assert.equal(isErr(r), true);
  });

  it('retorna false para ok(x)', () => {
    const r: Result<number, string> = ok(1);

    assert.equal(isErr(r), false);
  });

  it('estreita o tipo para o ramo de erro, liberando .error', () => {
    const r: Result<number, string> = err('domain-violation');

    if (isErr(r)) {
      const error: string = r.error;
      assert.equal(error, 'domain-violation');
    } else {
      assert.fail('esperado o ramo de erro');
    }
  });

  it('é sempre o oposto de isOk para o mesmo Result', () => {
    const samples: readonly Result<number, string>[] = [ok(0), err(''), ok(-1), err('x')];

    for (const r of samples) assert.equal(isErr(r), !isOk(r));
  });
});

describe('mapErr — transformação de erro', () => {
  it('preserva ok(x) sem invocar o mapper', () => {
    let called = false;
    const r: Result<number, 'raw-e'> = ok(10);

    const mapped = mapErr(r, (e) => {
      called = true;
      return `wrapped:${e}` as const;
    });

    assert.equal(called, false);
    assert.equal(isOk(mapped), true);
    if (mapped.ok) assert.equal(mapped.value, 10);
  });

  it('em ok devolve o mesmo objeto recebido, por referência', () => {
    const r: Result<number, 'raw-e'> = ok(10);

    const mapped = mapErr(r, (e) => `wrapped:${e}`);

    assert.equal(mapped, r);
  });

  it('em err devolve err com o retorno do mapper', () => {
    const r: Result<number, 'raw-e'> = err('raw-e');

    const mapped = mapErr(r, (e) => `wrapped:${e}` as const);

    assert.equal(isErr(mapped), true);
    if (!mapped.ok) assert.equal(mapped.error, 'wrapped:raw-e');
  });

  it('em err chama o mapper uma única vez, com o erro original', () => {
    const received: string[] = [];
    const r: Result<number, string> = err('raw-e');

    mapErr(r, (e) => {
      received.push(e);
      return e.length;
    });

    assert.deepEqual(received, ['raw-e']);
  });

  it('em err entrega ao mapper o próprio objeto de erro de r, sem cópia', () => {
    const error = { code: 'raw-e' };
    const r: Result<number, { code: string }> = err(error);
    let received: { code: string } | undefined;

    mapErr(r, (e) => {
      received = e;
      return e.code;
    });

    assert.equal(received, error);
  });

  it('uma mutação feita pelo mapper no erro recebido aparece no Result original', () => {
    const r: Result<number, { n: number }> = err({ n: 1 });

    mapErr(r, (e) => {
      e.n = 99;
      return 'mutated';
    });

    assert.deepEqual(r, { ok: false, error: { n: 99 } });
  });

  it('em err devolve objeto novo e deixa o Result original intacto', () => {
    const r: Result<number, string> = err('raw-e');

    const mapped = mapErr(r, (e) => e.toUpperCase());

    assert.notEqual(mapped, r);
    assert.deepEqual(r, { ok: false, error: 'raw-e' });
    assert.deepEqual(mapped, { ok: false, error: 'RAW-E' });
  });

  it('traduz uma união de erros de domínio para um objeto de erro de borda', () => {
    type Domain = 'money-negative' | 'period-invalid';
    interface Boundary {
      readonly tag: 'invalid-input';
      readonly cause: Domain;
    }
    const r: Result<number, Domain> = err('money-negative');

    const translated: Result<number, Boundary> = mapErr(r, (e) => ({
      tag: 'invalid-input',
      cause: e,
    }));

    assert.equal(isErr(translated), true);
    if (!translated.ok) {
      assert.equal(translated.error.tag, 'invalid-input');
      assert.equal(translated.error.cause, 'money-negative');
    }
  });

  it('propaga a exceção lançada pelo mapper', () => {
    const r: Result<number, string> = err('raw-e');

    assert.throws(
      () =>
        mapErr(r, () => {
          throw new Error('mapper-failed');
        }),
      { message: 'mapper-failed' },
    );
  });
});

describe('combine — todos ok', () => {
  it('com tupla mista de tipos retorna ok(tupla preservada)', () => {
    const inputs = [ok(1), ok('two'), ok(true)] as const;

    const r = combine(inputs);

    assert.equal(isOk(r), true);
    if (r.ok) assert.deepEqual([...r.value], [1, 'two', true]);
  });

  it('com array vazio retorna ok([])', () => {
    const inputs: readonly Result<number, string>[] = [];

    const r = combine(inputs);

    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(Array.isArray(r.value), true);
      assert.equal(r.value.length, 0);
    }
  });

  it('com um único ok retorna ok([value])', () => {
    const r = combine([ok(42)] as const);

    assert.equal(isOk(r), true);
    if (r.ok) assert.deepEqual([...r.value], [42]);
  });

  it('aceita array homogêneo de tamanho variável, não só tupla', () => {
    const inputs: readonly Result<number, string>[] = [1, 2, 3, 4].map((n) => ok(n));

    const r = combine(inputs);

    if (r.ok) {
      const values: readonly number[] = r.value;
      assert.deepEqual([...values], [1, 2, 3, 4]);
    } else {
      assert.fail('esperado o ramo de sucesso');
    }
  });

  it('tipa o valor como a tupla de valores, posição a posição', () => {
    const a: Result<number, string> = ok(1);
    const b: Result<string, string> = ok('s');
    const c: Result<boolean, string> = ok(false);

    const r = combine([a, b, c] as const);

    if (r.ok) {
      const [n, s, bo]: readonly [number, string, boolean] = r.value;
      assert.equal(n, 1);
      assert.equal(s, 's');
      assert.equal(bo, false);
    } else {
      assert.fail('esperado o ramo de sucesso');
    }
  });

  it('devolve um array de valores novo, distinto do array de entrada', () => {
    const inputs = [ok(1), ok(2)] as const;

    const r = combine(inputs);

    if (r.ok) assert.notEqual(r.value as unknown, inputs as unknown);
    else assert.fail('esperado o ramo de sucesso');
  });

  it('não congela o array de valores', () => {
    const r = combine([ok(1)] as const);

    if (r.ok) assert.equal(Object.isFrozen(r.value), false);
    else assert.fail('esperado o ramo de sucesso');
  });
});

describe('combine — ao menos um erro (coleta todos)', () => {
  it('um único erro: retorna err([erro])', () => {
    const r = combine([err('a-err' as const)] as const);

    assert.equal(isErr(r), true);
    if (!r.ok) assert.deepEqual([...r.error], ['a-err']);
  });

  it('múltiplos erros: coleta todos na ordem original, sem parar no primeiro', () => {
    const inputs = [ok(1), err('a' as const), ok(2), err('b' as const), err('c' as const)] as const;

    const r = combine(inputs);

    assert.equal(isErr(r), true);
    if (!r.ok) {
      assert.equal(Array.isArray(r.error), true);
      assert.deepEqual([...r.error], ['a', 'b', 'c']);
    }
  });

  it('erros intercalados com sucessos: [ok(1), err("a"), ok(2), err("b")] vira err(["a", "b"])', () => {
    const r = combine([ok(1), err('a' as const), ok(2), err('b' as const)] as const);

    if (!r.ok) assert.deepEqual([...r.error], ['a', 'b']);
    else assert.fail('esperado o ramo de erro');
  });

  it('todos os inputs erro: coleta todos', () => {
    const r = combine([err('x' as const), err('y' as const), err('z' as const)] as const);

    if (!r.ok) assert.deepEqual([...r.error], ['x', 'y', 'z']);
    else assert.fail('esperado o ramo de erro');
  });

  it('descarta os valores ok quando há ao menos um erro', () => {
    const r = combine([ok(1), err('e' as const), ok(2)] as const);

    assert.deepEqual(r, { ok: false, error: ['e'] });
  });

  it('tipa o erro como array readonly, mas não congela o array em runtime', () => {
    const input: Result<number, string> = err('a');
    const r = combine<readonly [number], string>([input]);

    if (!r.ok) {
      const errorsAreReadonly: Equals<typeof r.error, readonly string[]> = true;
      const mutableArrayDiffers: Equals<string[], readonly string[]> = false;
      assert.equal(errorsAreReadonly, true);
      assert.equal(mutableArrayDiffers, false);
      assert.equal(Object.isFrozen(r.error), false);
      assert.equal(Reflect.set(r.error, 1, 'b'), true);
      assert.deepEqual([...r.error], ['a', 'b']);
    } else {
      assert.fail('esperado o ramo de erro');
    }
  });

  it('sem argumentos de tipo explícitos, tipa o erro como readonly unknown[]', () => {
    const input: Result<number, 'a-err'> = err('a-err');

    const r = combine([input] as const);

    if (!r.ok) {
      const inferredAsUnknown: Equals<typeof r.error, readonly unknown[]> = true;
      assert.equal(inferredAsUnknown, true);
      assert.deepEqual([...r.error], ['a-err']);
    } else {
      assert.fail('esperado o ramo de erro');
    }
  });

  it('com argumentos de tipo explícitos, tipa o erro como readonly E[]', () => {
    const input: Result<number, 'a-err'> = err('a-err');

    const r = combine<readonly [number], 'a-err'>([input]);

    if (!r.ok) {
      const typedAsE: Equals<typeof r.error, readonly 'a-err'[]> = true;
      assert.equal(typedAsE, true);
    } else {
      assert.fail('esperado o ramo de erro');
    }
  });

  it('não altera os Results de entrada', () => {
    const first: Result<number, string> = err('a');
    const second: Result<number, string> = ok(2);

    combine([first, second] as const);

    assert.deepEqual(first, { ok: false, error: 'a' });
    assert.deepEqual(second, { ok: true, value: 2 });
  });
});
