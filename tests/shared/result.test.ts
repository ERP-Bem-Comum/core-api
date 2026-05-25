/**
 * Testes do kit canônico `shared/result.ts` definido na entrevista 0001 Bloco I.
 *
 * Ticket: CTR-SHARED-RESULT-COMBINATORS (Frente A, top-3 leverage #3).
 * Origem: handbook/interviews/0001-functional-ddd-domain-refresh.md §Bloco I (DO 13-19, DON'T 13-18).
 *
 * Kit canônico (6 exports + 1 type):
 *   Result, ok, err, isOk, isErr, mapErr, combine (collect-all)
 *
 * Esta wave (W0) escreve testes que DEVEM FALHAR contra o `result.ts` atual:
 *   - `mapErr` ainda não existe (atual exporta `mapError`).
 *   - `combine` atual é fail-fast (retorna 1º err); o canônico é collect-all.
 */

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

// ──────────────────────────────────────────────────────────────────────────────
// CA-1 / shape básico: `ok` / `err` produzem o discriminated union correto.
// ──────────────────────────────────────────────────────────────────────────────

describe('ok — construtor de sucesso', () => {
  it('produz objeto { ok: true, value }', () => {
    // Arrange
    const value = 42;

    // Act
    const r = ok(value);

    // Assert
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value, 42);
  });

  it('preserva o tipo do value (string)', () => {
    // Arrange
    const value = 'hello';

    // Act
    const r = ok(value);

    // Assert
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value, 'hello');
  });

  it('aceita objeto como value (sem mutação interna)', () => {
    // Arrange
    const value = { id: 1, name: 'x' } as const;

    // Act
    const r = ok(value);

    // Assert
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.id, 1);
      assert.equal(r.value.name, 'x');
    }
  });
});

describe('err — construtor de erro', () => {
  it('produz objeto { ok: false, error }', () => {
    // Arrange
    const error = 'not-found' as const;

    // Act
    const r = err(error);

    // Assert
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'not-found');
  });

  it('preserva o tipo literal do error (string literal union)', () => {
    // Arrange
    type DomainError = 'a-error' | 'b-error';
    const error: DomainError = 'b-error';

    // Act
    const r = err(error);

    // Assert
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'b-error');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// CA-2 / type predicates: `isOk` e `isErr` permitem narrowing.
// ──────────────────────────────────────────────────────────────────────────────

describe('isOk — type predicate de sucesso', () => {
  it('retorna true para ok(x)', () => {
    // Arrange
    const r: Result<number, string> = ok(7);

    // Act
    const flag = isOk(r);

    // Assert
    assert.equal(flag, true);
  });

  it('retorna false para err(e)', () => {
    // Arrange
    const r: Result<number, string> = err('boom');

    // Act
    const flag = isOk(r);

    // Assert
    assert.equal(flag, false);
  });

  it('narrowing após isOk permite acessar .value', () => {
    // Arrange
    const r: Result<number, string> = ok(99);

    // Act + Assert
    if (isOk(r)) {
      // Se este branch compilar, narrowing funciona.
      assert.equal(r.value, 99);
    } else {
      assert.fail('expected ok branch');
    }
  });
});

describe('isErr — type predicate de erro', () => {
  it('retorna true para err(e)', () => {
    // Arrange
    const r: Result<number, string> = err('nope');

    // Act
    const flag = isErr(r);

    // Assert
    assert.equal(flag, true);
  });

  it('retorna false para ok(x)', () => {
    // Arrange
    const r: Result<number, string> = ok(1);

    // Act
    const flag = isErr(r);

    // Assert
    assert.equal(flag, false);
  });

  it('narrowing após isErr permite acessar .error', () => {
    // Arrange
    const r: Result<number, string> = err('domain-violation');

    // Act + Assert
    if (isErr(r)) {
      assert.equal(r.error, 'domain-violation');
    } else {
      assert.fail('expected err branch');
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// CA-3 / `mapErr`: transforma apenas o erro, preserva ok.
// (Renomeia o antigo `mapError`. CA-2 do ticket exige a nova nomenclatura.)
// ──────────────────────────────────────────────────────────────────────────────

describe('mapErr — transformação de erro', () => {
  it('preserva ok(x) sem invocar o mapper', () => {
    // Arrange
    let called = false;
    const r: Result<number, 'raw-e'> = ok(10);

    // Act
    const mapped = mapErr(r, (e) => {
      called = true;
      return `wrapped:${e}` as const;
    });

    // Assert
    assert.equal(called, false, 'mapper não deve ser chamado em ok');
    assert.equal(isOk(mapped), true);
    if (mapped.ok) assert.equal(mapped.value, 10);
  });

  it('transforma o error em err(e) via função pura', () => {
    // Arrange
    const r: Result<number, 'raw-e'> = err('raw-e');

    // Act
    const mapped = mapErr(r, (e) => `wrapped:${e}` as const);

    // Assert
    assert.equal(isErr(mapped), true);
    if (!mapped.ok) assert.equal(mapped.error, 'wrapped:raw-e');
  });

  it('permite traduzir union de erros para um tipo de borda (γ pattern)', () => {
    // Arrange — simula uso real (Bloco I §16): combine + mapErr no fim.
    type Domain = 'money-negative' | 'period-invalid';
    interface Boundary {
      tag: 'invalid-input';
      cause: Domain;
    }
    const r: Result<number, Domain> = err('money-negative');

    // Act
    const translated = mapErr(r, (e) => ({ tag: 'invalid-input', cause: e }) as Boundary);

    // Assert
    assert.equal(isErr(translated), true);
    if (!translated.ok) {
      assert.equal(translated.error.tag, 'invalid-input');
      assert.equal(translated.error.cause, 'money-negative');
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// CA-4 / `combine` — semântica APPLICATIVE (collect-all, NÃO fail-fast).
// Mudança semântica crítica: o atual fail-fast é VIOLAÇÃO do kit canônico.
// ──────────────────────────────────────────────────────────────────────────────

describe('combine — happy path (todos ok)', () => {
  it('com tupla mista de tipos retorna ok(tupla preservada)', () => {
    // Arrange
    const inputs = [ok(1), ok('two'), ok(true)] as const;

    // Act
    const r = combine(inputs);

    // Assert
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value[0], 1);
      assert.equal(r.value[1], 'two');
      assert.equal(r.value[2], true);
    }
  });

  it('com array vazio retorna ok([])', () => {
    // Arrange
    const inputs: readonly Result<number, string>[] = [];

    // Act
    const r = combine(inputs);

    // Assert
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(Array.isArray(r.value), true);
      assert.equal(r.value.length, 0);
    }
  });

  it('com um único ok retorna ok([value])', () => {
    // Arrange
    const inputs = [ok(42)] as const;

    // Act
    const r = combine(inputs);

    // Assert
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.length, 1);
      assert.equal(r.value[0], 42);
    }
  });
});

describe('combine — collect-all (semântica applicative)', () => {
  it('um único erro: retorna err([erro])', () => {
    // Arrange
    const inputs = [err('a-err' as const)] as const;

    // Act
    const r = combine(inputs);

    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) {
      assert.equal(r.error.length, 1);
      assert.equal(r.error[0], 'a-err');
    }
  });

  it('múltiplos erros: COLETA todos na ordem original (NÃO fail-fast)', () => {
    // Arrange — caso crítico que distingue fail-fast (antigo) de collect-all (canônico).
    // Inputs: [ok, err('a'), ok, err('b'), err('c')]
    const inputs = [ok(1), err('a' as const), ok(2), err('b' as const), err('c' as const)] as const;

    // Act
    const r = combine(inputs);

    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) {
      // Fail-fast retornaria err('a') — escalar, não array.
      // Collect-all retorna err(['a', 'b', 'c']) — array preservando ordem.
      assert.equal(Array.isArray(r.error), true);
      assert.equal(r.error.length, 3);
      assert.deepEqual([...r.error], ['a', 'b', 'c']);
    }
  });

  it('CA-5 cenário do ticket: [ok(1), err("a"), ok(2), err("b")] → err(["a","b"])', () => {
    // Arrange — espelha literal o exemplo do 000-request.md §CA-5.
    const inputs = [ok(1), err('a' as const), ok(2), err('b' as const)] as const;

    // Act
    const r = combine(inputs);

    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) {
      assert.deepEqual([...r.error], ['a', 'b']);
    }
  });

  it('todos os inputs erro: coleta todos', () => {
    // Arrange
    const inputs = [err('x' as const), err('y' as const), err('z' as const)] as const;

    // Act
    const r = combine(inputs);

    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) {
      assert.deepEqual([...r.error], ['x', 'y', 'z']);
    }
  });

  it('NÃO mistura values com errors (descarta values quando há ao menos um err)', () => {
    // Arrange — garantia explícita de que o tipo de retorno é ou Result<T, readonly E[]>,
    // nunca um híbrido.
    const inputs = [ok(1), err('e' as const), ok(2)] as const;

    // Act
    const r = combine(inputs);

    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) {
      // O array de erros NÃO deve conter o "1" nem o "2" (values descartados).
      const errors = [...r.error];
      assert.equal(errors.includes(1 as never), false);
      assert.equal(errors.includes(2 as never), false);
      assert.equal(errors.length, 1);
      assert.equal(errors[0], 'e');
    }
  });
});

describe('combine — preservação de tipos da tupla', () => {
  it('tupla heterogênea preserva posição e tipo (compile-time check via runtime)', () => {
    // Arrange — tupla [number, string, boolean] vira Result<readonly [number, string, boolean], …>
    const a: Result<number, string> = ok(1);
    const b: Result<string, string> = ok('s');
    const c: Result<boolean, string> = ok(false);
    const inputs = [a, b, c] as const;

    // Act
    const r = combine(inputs);

    // Assert
    assert.equal(isOk(r), true);
    if (r.ok) {
      // Se as posições e tipos forem preservados, estes acessos compilam e batem em runtime.
      const [n, s, bo] = r.value;
      assert.equal(typeof n, 'number');
      assert.equal(typeof s, 'string');
      assert.equal(typeof bo, 'boolean');
      assert.equal(n, 1);
      assert.equal(s, 's');
      assert.equal(bo, false);
    }
  });
});
