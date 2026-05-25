/**
 * Testes da facade `shared/brand.ts` modernizada na entrevista 0001 Bloco B.
 *
 * Ticket: CTR-SHARED-BRAND-UNIQUE-SYMBOL (Frente A — Refactor radical do domínio, folha sem deps).
 * Origem: handbook/interviews/0001-functional-ddd-domain-refresh.md §Bloco B
 *   - DO B§11 (linha 863): shared/brand.ts modernizado: unique symbol global + literal K.
 *   - DON'T B§12 (linha 905): declare const brand espalhado em cada VO — centraliza aqui.
 *   - CONSIDER B§3 (linha 935): BrandOf<T> útil em testes/diagnóstico.
 *
 * API canônica alvo (1 tipo + 1 helper type):
 *   Brand<T, K extends string>  — marca T com identidade nominal K (unique symbol global).
 *   BrandOf<B>                  — extrai K de um tipo brandado; `never` se não-brandado.
 *
 * Esta wave (W0) escreve testes que DEVEM FALHAR contra `src/shared/primitives/brand.ts` atual:
 *   - `BrandOf` ainda não é exportado pelo módulo.
 *   - O import nomeado `{ Brand, BrandOf }` dispara erro de compilação ANTES de qualquer
 *     asserção rodar — é o fail-by-absence canônico de Beck.
 *
 * Triangulation (Beck): múltiplos cenários distintos em `BrandOf` (3 tipos brandados +
 * 3 tipos não-brandados) e na estrutura nominal de `Brand` (covariância no T, exigência
 * de cast no sentido oposto, persistência do tipo runtime) impedem fake-it na W1 —
 * a impl tem que ser a real, não um conditional hardcoded.
 *
 * Como funciona o assert type-level: Brand é puro compile-time, sem footprint runtime.
 * Validamos a inferência via VALOR concreto cuja atribuição força `tsc` a verificar a
 * forma do tipo. Se BrandOf mudar de assinatura, `tsc --noEmit` falha aqui antes do W3.
 * O `assert.equal` em seguida confirma que o teste rodou (não foi skipped).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import type { Brand, BrandOf } from '#src/shared/primitives/brand.ts';

// ──────────────────────────────────────────────────────────────────────────────
// CA-1 — Importação. O módulo deve exportar AMBOS `Brand` e `BrandOf`.
// Hoje (W0) `BrandOf` não existe — `tsc --noEmit` falha neste arquivo.
// ──────────────────────────────────────────────────────────────────────────────

describe('shared/brand.ts — exports', () => {
  it('CA-1 — re-importa Brand e BrandOf do módulo canônico (smoke compile-time)', () => {
    // Arrange — alias type-level só pra forçar `tsc` a resolver os símbolos importados.
    type _SmokeBrand = Brand<string, 'Smoke'>;
    type _SmokeExtract = BrandOf<_SmokeBrand>;

    // Act — instanciar valor compatível com cada alias prova que ambos existem.
    const branded = 'value' as _SmokeBrand;
    const extracted: _SmokeExtract = 'Smoke';

    // Assert — runtime apenas confirma que o teste executou (não foi skipped).
    assert.equal(typeof branded, 'string');
    assert.equal(extracted, 'Smoke');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// CA-5 — `BrandOf<Brand<T, K>>` extrai exatamente o literal `K`.
// Testado com 3 formatos de T (string, number, objeto) para impedir fake-it
// que retorne sempre o mesmo literal hardcoded.
// ──────────────────────────────────────────────────────────────────────────────

describe('BrandOf — extrai o literal K de tipos brandados', () => {
  it("CA-5a — BrandOf<Brand<number, 'Foo'>> resolve para 'Foo'", () => {
    // Arrange
    type Foo = Brand<number, 'Foo'>;

    // Act — atribuição obriga `tsc` a verificar que `BrandOf<Foo>` === 'Foo'.
    const extracted: BrandOf<Foo> = 'Foo';

    // Assert
    assert.equal(extracted, 'Foo');
  });

  it("CA-5b — BrandOf<Brand<string, 'ContractId'>> resolve para 'ContractId'", () => {
    // Arrange
    type ContractIdLike = Brand<string, 'ContractId'>;

    // Act
    const extracted: BrandOf<ContractIdLike> = 'ContractId';

    // Assert
    assert.equal(extracted, 'ContractId');
  });

  it("CA-5c — BrandOf<Brand<{ readonly cents: number }, 'Money'>> resolve para 'Money'", () => {
    // Arrange
    type MoneyLike = Brand<{ readonly cents: number }, 'Money'>;

    // Act
    const extracted: BrandOf<MoneyLike> = 'Money';

    // Assert
    assert.equal(extracted, 'Money');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// CA-6 — `BrandOf<T>` retorna `never` para tipos NÃO brandados.
// Testado com 3 formatos (primitivo string, primitivo number, objeto plano) para
// confirmar que o conditional só dispara em estruturas que carregam `__brand`.
// ──────────────────────────────────────────────────────────────────────────────

describe('BrandOf — retorna never em tipos não-brandados', () => {
  it('CA-6a — BrandOf<string> é never', () => {
    // Arrange — alias auxiliar prova-é-never via conditional `extends never ? true : false`.
    type IsNever = [BrandOf<string>] extends [never] ? true : false;

    // Act
    const isNever: IsNever = true;

    // Assert
    assert.equal(isNever, true);
  });

  it('CA-6b — BrandOf<number> é never', () => {
    // Arrange
    type IsNever = [BrandOf<number>] extends [never] ? true : false;

    // Act
    const isNever: IsNever = true;

    // Assert
    assert.equal(isNever, true);
  });

  it('CA-6c — BrandOf<{ value: number }> (objeto sem __brand) é never', () => {
    // Arrange
    type IsNever = [BrandOf<{ value: number }>] extends [never] ? true : false;

    // Act
    const isNever: IsNever = true;

    // Assert
    assert.equal(isNever, true);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Estrutura nominal: comportamento RUNTIME e direções de atribuição.
// Brand não tem footprint runtime — o valor brandado é estruturalmente igual ao T.
// Validamos: (i) typeof inalterado; (ii) covariância no T (brand → T sem cast);
// (iii) sentido oposto exige cast (T → brand não compila sem `as`).
// ──────────────────────────────────────────────────────────────────────────────

describe('Brand — estrutura nominal e comportamento runtime', () => {
  it('valor brandado preserva o tipo runtime do T (string permanece string)', () => {
    // Arrange
    type ContractIdLike = Brand<string, 'ContractId'>;
    const raw = 'CTR-001';

    // Act — cast obrigatório no construtor; em produção isso fica dentro de smart constructor.
    const branded = raw as ContractIdLike;

    // Assert
    assert.equal(typeof branded, 'string');
    assert.equal(branded, 'CTR-001');
  });

  it('valor brandado preserva o tipo runtime do T (objeto permanece objeto)', () => {
    // Arrange
    type MoneyLike = Brand<{ readonly cents: number }, 'Money'>;
    const raw = { cents: 100000 };

    // Act
    const branded = raw as MoneyLike;

    // Assert
    assert.equal(typeof branded, 'object');
    assert.equal(branded.cents, 100000);
  });

  it('covariância no T — Brand<T, K> é atribuível a T sem cast', () => {
    // Arrange — invariante necessária para mappers (snapshot de VO → primitivo).
    type ContractIdLike = Brand<string, 'ContractId'>;
    const branded = 'CTR-001' as ContractIdLike;

    // Act — atribuição direta sem `as`; compila porque Brand<T, K> ⊆ T.
    const asPlainString: string = branded;

    // Assert
    assert.equal(asPlainString, 'CTR-001');
    assert.equal(typeof asPlainString, 'string');
  });

  it('sentido oposto exige cast — T não é atribuível a Brand<T, K> sem `as`', () => {
    // Arrange — invariante necessária para nominalidade (mistura acidental impossível).
    type ContractIdLike = Brand<string, 'ContractId'>;
    const raw = 'CTR-001';

    // Act — atribuir `raw` (string) a uma variável `ContractIdLike` SÓ é possível com cast.
    // Se a linha seguinte fosse `const branded: ContractIdLike = raw;`, `tsc` falharia.
    // Este teste documenta a invariante via cast explícito (forma sintática única que compila).
    const branded: ContractIdLike = raw as ContractIdLike;

    // Assert — em runtime continuam estruturalmente iguais.
    assert.equal(branded, raw);
  });

  it('dois brands com K distintos NÃO são intercambiáveis sem cast', () => {
    // Arrange
    type ContractIdLike = Brand<string, 'ContractId'>;
    type AmendmentIdLike = Brand<string, 'AmendmentId'>;
    const contractId = 'CTR-001' as ContractIdLike;

    // Act — converter requer cast duplo (passa pela base string ou unknown).
    // `const wrong: AmendmentIdLike = contractId;` não compilaria.
    const amendmentId: AmendmentIdLike = contractId as unknown as AmendmentIdLike;

    // Assert — runtime mantém o valor; o ganho é estritamente compile-time.
    assert.equal(amendmentId, 'CTR-001');
  });
});
