/**
 * Testes da facade `shared/immutable.ts` definida na entrevista 0001 Bloco B.
 *
 * Ticket: CTR-SHARED-IMMUTABLE (Frente A — Refactor radical do domínio, folha sem deps).
 * Origem: handbook/interviews/0001-functional-ddd-domain-refresh.md §Bloco B
 *   - DO B§10 (linha 862): facade `immutable()` / `deepImmutable()` em `shared/immutable.ts`.
 *   - DON'T B§5 (linha 898): `Object.freeze` direto em domínio — usa as facades.
 *   - CONSIDER B§2 (linha 934): `deepImmutable` para VOs compostos com sub-VOs aninhados.
 *   - CONSIDER B§5 (linha 937): `Object.isFrozen()` em testes confirmando invariante.
 *
 * API canônica (2 exports + 0 types — funções diretas):
 *   immutable<T extends object>(value: T): Readonly<T>   — shallow freeze, esconde Object.freeze.
 *   deepImmutable<T>(value: T): T                        — congela recursivo; primitivos passam direto.
 *
 * Esta wave (W0) escreve testes que DEVEM FALHAR contra `src/shared/primitives/immutable.ts` atual:
 *   - O módulo `immutable.ts` ainda não existe.
 *   - O ESM resolver dispara `ERR_MODULE_NOT_FOUND` antes de qualquer asserção rodar.
 *   - Este é o fail-by-absence canônico de Beck.
 *
 * Triangulation (Beck): múltiplos cenários distintos em `immutable` (shallow + identidade + TypeError)
 * e em `deepImmutable` (primitivos × null × undefined × aninhamento profundo × arrays) impedem
 * fake-it na W1 — a impl tem que ser a real, não um retorno hardcoded.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { immutable, deepImmutable } from '#src/shared/primitives/immutable.ts';

// ──────────────────────────────────────────────────────────────────────────────
// CA-3 — `immutable` retorna o objeto congelado em modo shallow.
// ──────────────────────────────────────────────────────────────────────────────

describe('immutable — shallow freeze (esconde Object.freeze)', () => {
  it('congela o objeto raiz (Object.isFrozen retorna true)', () => {
    // Arrange
    const raw = { a: 1, b: 2 };

    // Act
    const frozen = immutable(raw);

    // Assert
    assert.equal(Object.isFrozen(frozen), true);
  });

  it('preserva identidade — não copia, só congela (immutable(obj) === obj)', () => {
    // Arrange
    const raw = { x: 'foo' };

    // Act
    const frozen = immutable(raw);

    // Assert
    assert.equal(frozen, raw);
  });

  it('é SHALLOW — sub-objetos NÃO são congelados', () => {
    // Arrange
    const raw = { outer: 1, nested: { inner: 'still-mutable' } };

    // Act
    const frozen = immutable(raw);

    // Assert
    assert.equal(Object.isFrozen(frozen), true);
    assert.equal(Object.isFrozen(frozen.nested), false);
  });

  it('CA-6 — tentativa de mutação em propriedade congelada joga TypeError (ESM strict)', () => {
    // Arrange
    const frozen = immutable({ readonly: 'value' });

    // Act + Assert
    // ESM é strict por padrão; atribuir a propriedade congelada deve lançar TypeError.
    assert.throws(() => {
      (frozen as { readonly: string }).readonly = 'mutated';
    }, TypeError);
  });

  it('preserva os valores originais após o freeze', () => {
    // Arrange
    const raw = { id: 42, name: 'contract', active: true };

    // Act
    const frozen = immutable(raw);

    // Assert
    assert.equal(frozen.id, 42);
    assert.equal(frozen.name, 'contract');
    assert.equal(frozen.active, true);
  });

  it('aceita objeto vazio', () => {
    // Arrange
    const raw = {};

    // Act
    const frozen = immutable(raw);

    // Assert
    assert.equal(Object.isFrozen(frozen), true);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// CA-4 — `deepImmutable` congela recursivamente em cada nível.
// ──────────────────────────────────────────────────────────────────────────────

describe('deepImmutable — recursive freeze', () => {
  it('congela o objeto raiz', () => {
    // Arrange
    const raw = { a: { b: { c: 1 } } };

    // Act
    const frozen = deepImmutable(raw);

    // Assert
    assert.equal(Object.isFrozen(frozen), true);
  });

  it('congela o nível intermediário (a)', () => {
    // Arrange
    const raw = { a: { b: { c: 1 } } };

    // Act
    const frozen = deepImmutable(raw);

    // Assert
    assert.equal(Object.isFrozen(frozen.a), true);
  });

  it('congela o nível mais profundo (a.b)', () => {
    // Arrange
    const raw = { a: { b: { c: 1 } } };

    // Act
    const frozen = deepImmutable(raw);

    // Assert
    assert.equal(Object.isFrozen(frozen.a.b), true);
  });

  it('preserva identidade — não copia, congela in-place', () => {
    // Arrange
    const raw = { outer: 1 };

    // Act
    const frozen = deepImmutable(raw);

    // Assert
    assert.equal(frozen, raw);
  });

  it('congela array aninhado em objeto', () => {
    // Arrange
    const raw = { items: [1, 2, 3] };

    // Act
    const frozen = deepImmutable(raw);

    // Assert
    assert.equal(Object.isFrozen(frozen), true);
    assert.equal(Object.isFrozen(frozen.items), true);
  });

  it('congela objetos dentro de array', () => {
    // Arrange
    const raw = { items: [{ id: 1 }, { id: 2 }] };

    // Act
    const frozen = deepImmutable(raw);

    // Assert
    assert.equal(Object.isFrozen(frozen.items), true);
    assert.equal(Object.isFrozen(frozen.items[0]), true);
    assert.equal(Object.isFrozen(frozen.items[1]), true);
  });

  it('mutação em propriedade aninhada congelada joga TypeError', () => {
    // Arrange
    const frozen = deepImmutable({ a: { b: 'value' } });

    // Act + Assert
    assert.throws(() => {
      (frozen.a as { b: string }).b = 'mutated';
    }, TypeError);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// CA-5 — `deepImmutable` em primitivos retorna o valor sem alteração.
// ──────────────────────────────────────────────────────────────────────────────

describe('deepImmutable — primitivos passam direto', () => {
  it('number: deepImmutable(42) retorna 42', () => {
    // Arrange
    const raw = 42;

    // Act
    const result = deepImmutable(raw);

    // Assert
    assert.equal(result, 42);
  });

  it('string: deepImmutable("x") retorna "x"', () => {
    // Arrange
    const raw = 'x';

    // Act
    const result = deepImmutable(raw);

    // Assert
    assert.equal(result, 'x');
  });

  it('null: deepImmutable(null) retorna null', () => {
    // Arrange
    const raw = null;

    // Act
    const result = deepImmutable(raw);

    // Assert
    assert.equal(result, null);
  });

  it('undefined: deepImmutable(undefined) retorna undefined', () => {
    // Arrange
    const raw = undefined;

    // Act
    // `deepImmutable<undefined>` retorna `undefined`; o rule no-confusing-void-expression
    // trava atribuição por inferir `T ≡ void`. Disable intencional — o teste prova
    // que primitivos passam direto, e a atribuição é parte da assertiva.
    // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
    const result = deepImmutable(raw);

    // Assert
    assert.equal(result, undefined);
  });

  it('boolean: deepImmutable(true) retorna true', () => {
    // Arrange
    const raw = true;

    // Act
    const result = deepImmutable(raw);

    // Assert
    assert.equal(result, true);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Composição: `immutable` e `deepImmutable` interagem com tipos compostos do projeto.
// Garante que a facade não quebra padrões do domínio (Readonly<T>, branded, etc).
// ──────────────────────────────────────────────────────────────────────────────

describe('composição com tipos do domínio', () => {
  it('immutable preserva o tipo do objeto (Readonly<T> em compile-time)', () => {
    // Arrange
    type ContractSnapshot = Readonly<{ id: string; value: number }>;
    const raw: ContractSnapshot = { id: 'CTR-001', value: 1000 };

    // Act
    const frozen = immutable(raw);

    // Assert — runtime check; o ganho de Readonly<T> é compile-time (este teste compila).
    assert.equal(frozen.id, 'CTR-001');
    assert.equal(frozen.value, 1000);
    assert.equal(Object.isFrozen(frozen), true);
  });

  it('deepImmutable em VO composto (Money + Period-like) congela todos os níveis', () => {
    // Arrange — estrutura parecida com VO composto do domínio (sem brand pra simplificar).
    const raw = {
      value: { cents: 100000n.toString() },
      period: { start: '2026-01-01', end: '2026-12-31' },
    };

    // Act
    const frozen = deepImmutable(raw);

    // Assert
    assert.equal(Object.isFrozen(frozen), true);
    assert.equal(Object.isFrozen(frozen.value), true);
    assert.equal(Object.isFrozen(frozen.period), true);
  });
});
