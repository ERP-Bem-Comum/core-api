import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import type { Result } from '#src/shared/primitives/result.ts';
import {
  GENERIC_PUBLIC_MESSAGES,
  publicErrorClassOf,
  publicMessageResolver,
  type ErrorCodeOf,
  type UseCaseErrorOf,
} from '#src/shared/http/public-message.ts';

type Equals<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

describe('publicMessageResolver', () => {
  const resolve = publicMessageResolver<'a-code' | 'b-code'>(
    { 'a-code': 'Mensagem A.', 'b-code': 'Mensagem B.' },
    (code) => `fallback:${code}`,
  );

  it('devolve a mensagem da tabela para um código presente nela', () => {
    assert.equal(resolve('a-code'), 'Mensagem A.');
    assert.equal(resolve('b-code'), 'Mensagem B.');
  });

  it('devolve o fallback para código ausente da tabela', () => {
    assert.equal(resolve('unknown-code'), 'fallback:unknown-code');
  });

  it('nome herdado do protótipo de Object não conta como presente na tabela', () => {
    assert.equal(resolve('constructor'), 'fallback:constructor');
    assert.equal(resolve('toString'), 'fallback:toString');
  });
});

describe('publicErrorClassOf', () => {
  const cases: readonly (readonly [number, string])[] = [
    [400, 'bad-request'],
    [413, 'bad-request'],
    [404, 'not-found'],
    [409, 'conflict'],
    [422, 'unprocessable'],
    [500, 'internal'],
    [502, 'internal'],
    [503, 'internal'],
  ];
  for (const [status, expected] of cases) {
    it(`status ${String(status)} -> ${expected}`, () => {
      assert.equal(publicErrorClassOf(status), expected);
    });
  }
});

describe('GENERIC_PUBLIC_MESSAGES', () => {
  it('tem uma frase PT-BR por classe, nenhuma igual ao nome da classe', () => {
    assert.deepEqual(GENERIC_PUBLIC_MESSAGES, {
      'not-found': 'Recurso não encontrado.',
      conflict: 'A operação conflita com o estado atual do recurso.',
      'bad-request': 'Requisição inválida.',
      unprocessable: 'Não foi possível processar a requisição.',
      internal: 'Ocorreu um erro interno.',
    });
  });
});

describe('ErrorCodeOf / UseCaseErrorOf', () => {
  it('ErrorCodeOf mantém string literal e extrai o `tag` de variante registro', () => {
    const typed: Equals<
      ErrorCodeOf<'x-code' | Readonly<{ tag: 'YCode'; at: Date }>>,
      'x-code' | 'YCode'
    > = true;
    assert.equal(typed, true);
  });

  it('UseCaseErrorOf junta o `E` de cada função que devolve Promise<Result> e ignora as demais', () => {
    type Deps = Readonly<{
      one: (x: string) => Promise<Result<number, 'one-failed'>>;
      two: () => Promise<Result<void, 'two-failed' | Readonly<{ tag: 'TwoTagged' }>>>;
      plain: () => Promise<void>;
      bucket: string;
    }>;
    const typed: Equals<
      UseCaseErrorOf<Deps>,
      'one-failed' | 'two-failed' | Readonly<{ tag: 'TwoTagged' }>
    > = true;
    assert.equal(typed, true);
  });
});
