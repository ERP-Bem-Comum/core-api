import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { immutable, deepImmutable } from '#src/shared/primitives/immutable.ts';

type TypeEquals<A, B> =
  (<G>(probe: G) => G extends A ? 1 : 2) extends <G>(probe: G) => G extends B ? 1 : 2
    ? true
    : false;

describe('immutable — congelamento raso', () => {
  it('congela o objeto raiz (Object.isFrozen retorna true)', () => {
    const frozen = immutable({ a: 1, b: 2 });

    assert.equal(Object.isFrozen(frozen), true);
  });

  it('devolve a mesma referência recebida, congelada in-place, sem copiar', () => {
    const raw = { x: 'foo' };

    const frozen = immutable(raw);

    assert.equal(frozen, raw);
    assert.equal(Object.isFrozen(raw), true);
  });

  it('é raso — sub-objetos continuam mutáveis', () => {
    const frozen = immutable({ outer: 1, nested: { inner: 'still-mutable' } });

    frozen.nested.inner = 'mutated';

    assert.equal(Object.isFrozen(frozen), true);
    assert.equal(Object.isFrozen(frozen.nested), false);
    assert.equal(frozen.nested.inner, 'mutated');
  });

  it('lança TypeError ao atribuir propriedade existente em módulo ESM', () => {
    const frozen = immutable({ readonly: 'value' });

    assert.throws(() => {
      (frozen as { readonly: string }).readonly = 'mutated';
    }, TypeError);
    assert.equal(frozen.readonly, 'value');
  });

  it('lança TypeError ao adicionar propriedade nova em módulo ESM', () => {
    const frozen = immutable<{ a: number; b?: number }>({ a: 1 });

    assert.throws(() => {
      (frozen as { b?: number }).b = 2;
    }, TypeError);
    assert.equal('b' in frozen, false);
  });

  it('lança TypeError ao remover propriedade em módulo ESM', () => {
    const frozen = immutable<{ a?: number }>({ a: 1 });

    assert.throws(() => {
      delete (frozen as { a?: number }).a;
    }, TypeError);
    assert.equal(frozen.a, 1);
  });

  it('o tipo de retorno é Readonly<T> — o compilador recusa atribuição a propriedade', () => {
    const frozen = immutable({ id: 1 });

    const returnTypeIsReadonly: TypeEquals<typeof frozen, Readonly<{ id: number }>> = true;
    const returnTypeIsNotMutable: TypeEquals<typeof frozen, { id: number }> = false;

    assert.equal(returnTypeIsReadonly, true);
    assert.equal(returnTypeIsNotMutable, false);
    assert.throws(() => {
      // @ts-expect-error
      frozen.id = 2;
    }, TypeError);
  });

  it('o compilador aceita qualquer object, inclusive função, e a congela', () => {
    const fn = (): number => 1;

    assert.equal(Object.isFrozen(immutable(fn)), true);
  });

  it('lança TypeError com TypedArray não vazio', () => {
    assert.throws(() => immutable(new Uint8Array(1)), TypeError);
  });

  it('lança TypeError com Buffer não vazio', () => {
    assert.throws(() => immutable(Buffer.from('a')), TypeError);
  });

  it('congela TypedArray vazio', () => {
    assert.equal(Object.isFrozen(immutable(new Uint8Array(0))), true);
  });

  it('preserva os valores originais após o congelamento', () => {
    const frozen = immutable({ id: 42, name: 'contract', active: true });

    assert.equal(frozen.id, 42);
    assert.equal(frozen.name, 'contract');
    assert.equal(frozen.active, true);
  });

  it('aceita objeto vazio', () => {
    assert.equal(Object.isFrozen(immutable({})), true);
  });

  it('congela array — push lança TypeError', () => {
    const frozen = immutable([1, 2, 3]);

    assert.equal(Object.isFrozen(frozen), true);
    assert.throws(() => {
      (frozen as number[]).push(4);
    }, TypeError);
  });

  it('aceita objeto já congelado e devolve a mesma referência', () => {
    const raw = Object.freeze({ a: 1 });

    assert.equal(immutable(raw), raw);
  });

  it('não impede mutação interna de Map — congela só as propriedades do objeto', () => {
    const frozen = immutable(new Map<string, number>());

    frozen.set('k', 1);

    assert.equal(Object.isFrozen(frozen), true);
    assert.equal(frozen.get('k'), 1);
  });
});

describe('deepImmutable — congelamento recursivo', () => {
  it('congela o objeto raiz', () => {
    assert.equal(Object.isFrozen(deepImmutable({ a: { b: { c: 1 } } })), true);
  });

  it('congela o nível intermediário', () => {
    assert.equal(Object.isFrozen(deepImmutable({ a: { b: { c: 1 } } }).a), true);
  });

  it('congela o nível mais profundo', () => {
    assert.equal(Object.isFrozen(deepImmutable({ a: { b: { c: 1 } } }).a.b), true);
  });

  it('devolve a mesma referência recebida, congelada in-place, sem copiar', () => {
    const raw = { outer: 1, nested: { inner: 2 } };

    const frozen = deepImmutable(raw);

    assert.equal(frozen, raw);
    assert.equal(frozen.nested, raw.nested);
  });

  it('congela array aninhado em objeto', () => {
    const frozen = deepImmutable({ items: [1, 2, 3] });

    assert.equal(Object.isFrozen(frozen), true);
    assert.equal(Object.isFrozen(frozen.items), true);
  });

  it('congela objetos dentro de array', () => {
    const frozen = deepImmutable({ items: [{ id: 1 }, { id: 2 }] });

    assert.equal(Object.isFrozen(frozen.items), true);
    assert.equal(Object.isFrozen(frozen.items[0]), true);
    assert.equal(Object.isFrozen(frozen.items[1]), true);
  });

  it('congela array na raiz e seus elementos objeto', () => {
    const frozen = deepImmutable([{ id: 1 }]);

    assert.equal(Object.isFrozen(frozen), true);
    assert.equal(Object.isFrozen(frozen[0]), true);
  });

  it('lança TypeError ao mutar propriedade aninhada', () => {
    const frozen = deepImmutable({ a: { b: 'value' } });

    assert.throws(() => {
      frozen.a.b = 'mutated';
    }, TypeError);
    assert.equal(frozen.a.b, 'value');
  });

  it('lança TypeError ao atribuir propriedade em terceiro nível', () => {
    const frozen = deepImmutable({ a: { b: { c: 'value' } } });

    assert.throws(() => {
      frozen.a.b.c = 'mutated';
    }, TypeError);
    assert.equal(frozen.a.b.c, 'value');
  });

  it('lança TypeError ao adicionar propriedade na raiz', () => {
    const frozen = deepImmutable<{ a: number; b?: number }>({ a: 1 });

    assert.throws(() => {
      frozen.b = 2;
    }, TypeError);
    assert.equal('b' in frozen, false);
  });

  it('lança TypeError ao adicionar propriedade em objeto aninhado', () => {
    const frozen = deepImmutable<{ nested: { a: number; b?: number } }>({ nested: { a: 1 } });

    assert.throws(() => {
      frozen.nested.b = 2;
    }, TypeError);
    assert.equal('b' in frozen.nested, false);
  });

  it('lança TypeError ao remover propriedade na raiz', () => {
    const frozen = deepImmutable<{ a?: number }>({ a: 1 });

    assert.throws(() => {
      delete frozen.a;
    }, TypeError);
    assert.equal(frozen.a, 1);
  });

  it('lança TypeError ao remover propriedade em objeto aninhado', () => {
    const frozen = deepImmutable<{ nested: { a?: number } }>({ nested: { a: 1 } });

    assert.throws(() => {
      delete frozen.nested.a;
    }, TypeError);
    assert.equal(frozen.nested.a, 1);
  });

  it('o tipo de retorno é T, não Readonly — o compilador aceita atribuição que só falha em runtime', () => {
    const frozen = deepImmutable({ root: 1 });

    const returnTypeIsT: TypeEquals<typeof frozen, { root: number }> = true;
    const returnTypeIsNotReadonly: TypeEquals<typeof frozen, Readonly<{ root: number }>> = false;

    assert.equal(returnTypeIsT, true);
    assert.equal(returnTypeIsNotReadonly, false);
    assert.throws(() => {
      frozen.root = 2;
    }, TypeError);
  });

  it('lê a propriedade com getter enumerável uma vez e congela o objeto devolvido nessa leitura', () => {
    let calls = 0;
    let produced: { inner: number } | undefined;
    const raw = {
      get value(): { inner: number } {
        calls += 1;
        produced = { inner: calls };
        return produced;
      },
    };

    deepImmutable(raw);

    assert.equal(calls, 1);
    assert.equal(Object.isFrozen(produced), true);
    assert.equal(Object.isFrozen(raw.value), false);
  });

  it('lança TypeError com TypedArray não vazio aninhado', () => {
    assert.throws(() => deepImmutable({ bytes: new Uint8Array(1) }), TypeError);
  });

  it('lança TypeError com Buffer não vazio aninhado, deixando congelado o visitado antes e a raiz não', () => {
    const before = { inner: 1 };
    const raw = { before, buf: Buffer.from('a') };

    assert.throws(() => deepImmutable(raw), TypeError);
    assert.equal(Object.isFrozen(before), true);
    assert.equal(Object.isFrozen(raw), false);
  });

  it('não desce em propriedade com chave symbol', () => {
    const key = Symbol('k');
    const frozen = deepImmutable({ [key]: { inner: 1 } });

    assert.equal(Object.isFrozen(frozen), true);
    assert.equal(Object.isFrozen(frozen[key]), false);
  });

  it('não desce em propriedade não enumerável', () => {
    const raw: { hidden?: { inner: number } } = {};
    Object.defineProperty(raw, 'hidden', { value: { inner: 1 }, enumerable: false });

    const frozen = deepImmutable(raw);

    assert.equal(Object.isFrozen(frozen), true);
    assert.equal(Object.isFrozen(frozen.hidden), false);
  });

  it('não congela função — nem na raiz nem aninhada', () => {
    const fn = (): number => 1;

    const frozenRoot = deepImmutable(fn);
    const frozenHolder = deepImmutable({ fn });

    assert.equal(frozenRoot, fn);
    assert.equal(Object.isFrozen(fn), false);
    assert.equal(Object.isFrozen(frozenHolder), true);
    assert.equal(Object.isFrozen(frozenHolder.fn), false);
  });

  it('não desce no protótipo — objeto herdado pelo protótipo continua mutável', () => {
    const shared = { inner: 1 };
    const prototype = { shared };
    const raw = Object.create(prototype) as typeof prototype;

    deepImmutable(raw);

    assert.equal(Object.isFrozen(raw), true);
    assert.equal(Object.isFrozen(shared), false);
  });

  it('em estrutura cíclica estoura a pilha com RangeError', () => {
    const raw: { self?: unknown } = {};
    raw.self = raw;

    assert.throws(() => deepImmutable(raw), RangeError);
  });

  it('congela Date, mas setTime continua mutando o valor interno', () => {
    const date = new Date(0);

    const frozen = deepImmutable({ date });
    frozen.date.setTime(1000);

    assert.equal(Object.isFrozen(frozen.date), true);
    assert.equal(frozen.date.getTime(), 1000);
  });

  it('congela VO composto com sub-objetos em todos os níveis', () => {
    const frozen = deepImmutable({
      value: { cents: 100000n.toString() },
      period: { start: '2026-01-01', end: '2026-12-31' },
    });

    assert.equal(Object.isFrozen(frozen), true);
    assert.equal(Object.isFrozen(frozen.value), true);
    assert.equal(Object.isFrozen(frozen.period), true);
  });
});

describe('deepImmutable — primitivos são devolvidos sem alteração', () => {
  it('number: deepImmutable(42) devolve 42', () => {
    assert.equal(deepImmutable(42), 42);
  });

  it('string: deepImmutable("x") devolve "x"', () => {
    assert.equal(deepImmutable('x'), 'x');
  });

  it('boolean: deepImmutable(true) devolve true', () => {
    assert.equal(deepImmutable(true), true);
  });

  it('null: deepImmutable(null) devolve null', () => {
    assert.equal(deepImmutable(null), null);
  });

  it('undefined: deepImmutable(undefined) devolve undefined', () => {
    assert.equal(deepImmutable<string | undefined>(undefined), undefined);
  });

  it('bigint: deepImmutable(10n) devolve 10n', () => {
    assert.equal(deepImmutable(10n), 10n);
  });

  it('symbol: deepImmutable(sym) devolve o mesmo symbol', () => {
    const sym = Symbol('s');

    assert.equal(deepImmutable(sym), sym);
  });
});
