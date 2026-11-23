import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import type { Brand, BrandOf } from '#src/shared/primitives/brand.ts';
import type { Money } from '#src/shared/kernel/money.ts';
import type { ContractId } from '#src/modules/contracts/domain/shared/contract-id.ts';

/**
 * Resolve para `true` quando `A` e `B` são atribuíveis um ao outro, e para `false` caso contrário.
 *
 * @typeParam A - Primeiro tipo comparado.
 * @typeParam B - Segundo tipo comparado.
 */
type Equals<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

/**
 * Resolve para `true` quando um valor do tipo `From` é atribuível a `To`, e para `false` caso contrário.
 *
 * @typeParam From - Tipo de origem da atribuição.
 * @typeParam To - Tipo de destino da atribuição.
 */
type IsAssignable<From, To> = [From] extends [To] ? true : false;

describe('Brand — identidade nominal em tempo de compilação', () => {
  it('Brand<T, K> é atribuível ao T de origem sem cast', () => {
    type ContractIdLike = Brand<string, 'ContractId'>;
    const branded = 'CTR-001' as ContractIdLike;
    const plain: string = branded;
    const widens: IsAssignable<ContractIdLike, string> = true;

    assert.equal(plain, 'CTR-001');
    assert.equal(widens, true);
  });

  it('T puro não é atribuível a Brand<T, K>', () => {
    const accepts: IsAssignable<string, Brand<string, 'ContractId'>> = false;

    assert.equal(accepts, false);
  });

  it('dois Brand com o mesmo T e K distintos não são atribuíveis entre si', () => {
    type ContractIdLike = Brand<string, 'ContractId'>;
    type AmendmentIdLike = Brand<string, 'AmendmentId'>;
    const forward: IsAssignable<ContractIdLike, AmendmentIdLike> = false;
    const backward: IsAssignable<AmendmentIdLike, ContractIdLike> = false;

    assert.equal(forward, false);
    assert.equal(backward, false);
  });

  it('dois Brand declarados separadamente com o mesmo T e o mesmo K são o mesmo tipo', () => {
    type FinancialCategoryIdLike = Brand<string, 'CategoryId'>;
    type BudgetCategoryIdLike = Brand<string, 'CategoryId'>;
    const same: Equals<FinancialCategoryIdLike, BudgetCategoryIdLike> = true;
    const financial = 'CAT-1' as FinancialCategoryIdLike;
    const budget: BudgetCategoryIdLike = financial;

    assert.equal(same, true);
    assert.equal(budget, 'CAT-1');
  });

  it('Brand com o mesmo K e T sem relação de subtipo não são atribuíveis entre si', () => {
    const forward: IsAssignable<Brand<number, 'Id'>, Brand<string, 'Id'>> = false;
    const backward: IsAssignable<Brand<string, 'Id'>, Brand<number, 'Id'>> = false;

    assert.equal(forward, false);
    assert.equal(backward, false);
  });

  it('com o mesmo K, Brand<T1, K> é atribuível a Brand<T2, K> quando T1 é atribuível a T2', () => {
    const literalToString: IsAssignable<Brand<'CTR', 'Id'>, Brand<string, 'Id'>> = true;
    const wideObjectToNarrow: IsAssignable<
      Brand<{ a: number; b: number }, 'X'>,
      Brand<{ a: number }, 'X'>
    > = true;
    const stringToLiteral: IsAssignable<Brand<string, 'Id'>, Brand<'CTR', 'Id'>> = false;

    assert.equal(literalToString, true);
    assert.equal(wideObjectToNarrow, true);
    assert.equal(stringToLiteral, false);
  });

  it('Brand<T, K> é atribuível a Brand<T, K | Outro>, que aceita qualquer um dos literais', () => {
    type Narrow = Brand<string, 'ContractId'>;
    type Wide = Brand<string, 'ContractId' | 'AmendmentId'>;
    const narrowToWide: IsAssignable<Narrow, Wide> = true;
    const wideToNarrow: IsAssignable<Wide, Narrow> = false;

    assert.equal(narrowToWide, true);
    assert.equal(wideToNarrow, false);
  });

  it('Brand<T, string> aceita qualquer Brand do mesmo T', () => {
    const accepts: IsAssignable<Brand<string, 'ContractId'>, Brand<string, string>> = true;

    assert.equal(accepts, true);
  });

  it('uma propriedade de chave textual "__brand" não satisfaz Brand<T, K>', () => {
    type Forged = string & { readonly __brand: 'ContractId' };
    const accepts: IsAssignable<Forged, Brand<string, 'ContractId'>> = false;
    const extracted: Equals<BrandOf<Forged>, never> = true;

    assert.equal(accepts, false);
    assert.equal(extracted, true);
  });

  it('Brand<T, K> preserva os membros de T', () => {
    type MoneyLike = Brand<{ readonly cents: number }, 'Money'>;
    const branded = { cents: 100000 } as MoneyLike;
    const contractId = 'CTR-001' as Brand<string, 'ContractId'>;

    assert.equal(branded.cents, 100000);
    assert.equal(contractId.length, 7);
  });

  it('marcar Brand<T, K> com um segundo K disjunto do primeiro reduz o tipo a never', () => {
    type Twice = Brand<Brand<string, 'A'>, 'B'>;
    const isNever: Equals<Twice, never> = true;

    assert.equal(isNever, true);
  });

  it('marcar Brand<T, K> de novo com o mesmo K resolve para o próprio Brand<T, K>', () => {
    type Twice = Brand<Brand<string, 'A'>, 'A'>;
    const isNever: Equals<Twice, never> = false;
    const same: Equals<Twice, Brand<string, 'A'>> = true;

    assert.equal(isNever, false);
    assert.equal(same, true);
  });

  it('marcar Brand<T, K> com uma união que contém K resolve para o próprio Brand<T, K>', () => {
    type Twice = Brand<Brand<string, 'A'>, 'A' | 'B'>;
    const isNever: Equals<Twice, never> = false;
    const same: Equals<Twice, Brand<string, 'A'>> = true;

    assert.equal(isNever, false);
    assert.equal(same, true);
  });

  it('K aceita literal, união de literais, template literal e o próprio string', () => {
    const literal: Equals<BrandOf<Brand<string, 'A'>>, 'A'> = true;
    const union: Equals<BrandOf<Brand<string, 'A' | 'B'>>, 'A' | 'B'> = true;
    const template: Equals<BrandOf<Brand<string, `id-${number}`>>, `id-${number}`> = true;
    const wide: Equals<BrandOf<Brand<string, string>>, string> = true;

    assert.equal(literal, true);
    assert.equal(union, true);
    assert.equal(template, true);
    assert.equal(wide, true);
  });
});

describe('Brand — ausência de efeito em runtime', () => {
  it('o módulo brand.ts não exporta nenhum valor em runtime', async () => {
    const runtimeExports = await import('#src/shared/primitives/brand.ts');

    assert.deepEqual(Object.keys(runtimeExports), []);
  });

  it('o valor marcado com Brand é o mesmo valor de origem (string permanece string)', () => {
    const raw = 'CTR-001';
    const branded = raw as Brand<string, 'ContractId'>;

    assert.equal(typeof branded, 'string');
    assert.equal(branded, raw);
  });

  it('o valor marcado com Brand é o mesmo objeto de origem, sem chave adicional', () => {
    const raw = { cents: 100000 };
    const branded = raw as Brand<{ readonly cents: number }, 'Money'>;

    assert.equal(branded, raw);
    assert.deepEqual(Object.keys(branded), ['cents']);
    assert.deepEqual(Object.getOwnPropertySymbols(branded), []);
  });
});

describe('BrandOf — extrai o literal K de um tipo brandado', () => {
  it("BrandOf<Brand<number, 'Foo'>> resolve para 'Foo'", () => {
    const extracted: Equals<BrandOf<Brand<number, 'Foo'>>, 'Foo'> = true;

    assert.equal(extracted, true);
  });

  it("BrandOf<Brand<string, 'ContractId'>> resolve para 'ContractId'", () => {
    const extracted: Equals<BrandOf<Brand<string, 'ContractId'>>, 'ContractId'> = true;

    assert.equal(extracted, true);
  });

  it("BrandOf<Brand<{ readonly cents: number }, 'Money'>> resolve para 'Money'", () => {
    const extracted: Equals<BrandOf<Brand<{ readonly cents: number }, 'Money'>>, 'Money'> = true;

    assert.equal(extracted, true);
  });

  it("BrandOf<Money> do kernel resolve para 'Money'", () => {
    const extracted: Equals<BrandOf<Money>, 'Money'> = true;

    assert.equal(extracted, true);
  });

  it("BrandOf<ContractId> de contracts resolve para 'ContractId'", () => {
    const extracted: Equals<BrandOf<ContractId>, 'ContractId'> = true;

    assert.equal(extracted, true);
  });

  it('BrandOf distribui sobre união de Brand e resolve para a união dos literais', () => {
    type Either = Brand<string, 'ContractId'> | Brand<number, 'Money'>;
    const extracted: Equals<BrandOf<Either>, 'ContractId' | 'Money'> = true;

    assert.equal(extracted, true);
  });

  it('BrandOf de Brand com K união resolve para a mesma união', () => {
    const extracted: Equals<BrandOf<Brand<string, 'A' | 'B'>>, 'A' | 'B'> = true;

    assert.equal(extracted, true);
  });

  it('BrandOf de união entre Brand e tipo não-brandado resolve só para o literal do Brand', () => {
    const extracted: Equals<BrandOf<Brand<string, 'ContractId'> | number>, 'ContractId'> = true;

    assert.equal(extracted, true);
  });
});

describe('BrandOf — resolve para never em tipo não-brandado', () => {
  it('BrandOf<string> é never', () => {
    const isNever: Equals<BrandOf<string>, never> = true;

    assert.equal(isNever, true);
  });

  it('BrandOf<number> é never', () => {
    const isNever: Equals<BrandOf<number>, never> = true;

    assert.equal(isNever, true);
  });

  it('BrandOf<{ value: number }> é never', () => {
    const isNever: Equals<BrandOf<{ value: number }>, never> = true;

    assert.equal(isNever, true);
  });

  it('BrandOf<never> é never', () => {
    const isNever: Equals<BrandOf<never>, never> = true;

    assert.equal(isNever, true);
  });

  it('BrandOf<unknown> é never', () => {
    const isNever: Equals<BrandOf<unknown>, never> = true;

    assert.equal(isNever, true);
  });
});

describe('BrandOf — identidades que não são literal nem never', () => {
  it('BrandOf<Brand<string, string>> resolve para string', () => {
    const extracted: Equals<BrandOf<Brand<string, string>>, string> = true;

    assert.equal(extracted, true);
  });
});
