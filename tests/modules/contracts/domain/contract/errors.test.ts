import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

// CTR-DOMAIN-TAGGED-ERRORS (W0 RED) — Padrão D (DO D§22): consumo canônico
// é exclusivamente via `import * as ContractError from './errors.ts'`. Este import
// deve compilar e expor as case constructors como free functions no W1.
import * as ContractError from '#src/modules/contracts/domain/contract/errors.ts';
import * as Money from '#src/shared/kernel/money.ts';
import * as AmendmentId from '#src/modules/contracts/domain/shared/amendment-id.ts';

const D = (iso: string): Date => new Date(iso);

const money = (cents: number) => {
  const r = Money.fromCents(cents);
  if (!r.ok) throw new Error(`test fixture broken: ${r.error}`);
  return r.value;
};

// ============================================================================
// Padrão D (DO D§22) — case constructors como free functions
// ============================================================================

describe('errors.ts — Padrão D (DO D§22)', () => {
  it('expõe case constructors como free functions (não namespace-object)', () => {
    // Arrange
    const expectedFreeFunctions = [
      'contractSequentialNumberRequired',
      'contractSequentialNumberInvalidFormat',
      'contractTitleRequired',
      'contractObjectiveRequired',
      'contractInvalidSignedAt',
      'contractOriginalValueZero',
      'contractInvalidEventDate',
      'contractNotActive',
      'contractCannotExpireYet',
      'contractCannotExpireIndefinitePeriod',
      'contractCannotExtendIndefinitePeriod',
      'contractValueWouldGoNegative',
      'contractPeriodExtensionNotAfterCurrentEnd',
      'contractAmendmentAlreadyApplied',
    ] as const;
    // Act / Assert
    for (const fnName of expectedFreeFunctions) {
      const fn = (ContractError as unknown as Record<string, unknown>)[fnName];
      assert.equal(
        typeof fn,
        'function',
        `${fnName} deve ser exportada como free function (Padrão D — DO D§22)`,
      );
    }
  });

  it("NÃO expõe namespace-object aninhado (DON'T D§21)", () => {
    // Arrange / Act
    // O anti-padrão proibido é `export const ContractError = { ... } as const`
    // ao lado de `export type ContractError`. Em consumo via `import * as`,
    // isso apareceria como propriedade `ContractError` (declaration merging).
    const aliased = (ContractError as unknown as Record<string, unknown>)['ContractError'];
    // Assert
    assert.equal(
      aliased,
      undefined,
      "errors.ts não pode ter `export const ContractError = { ... }` aninhado (DON'T D§21)",
    );
  });

  it('importa via `import * as ContractError from "./errors.ts"` (canal canônico)', () => {
    // Arrange / Act
    // Se o import * acima compila e o módulo expõe pelo menos uma case ctor,
    // o canal canônico está disponível.
    const hasAtLeastOneCtor = typeof ContractError.contractTitleRequired === 'function';
    // Assert
    assert.equal(hasAtLeastOneCtor, true, 'import * as ContractError deve expor case ctors');
  });
});

// ============================================================================
// Tagged variants — shape { tag, ...payload } (DO D§22 + DO D§24)
// ============================================================================

describe('ContractError variants — tagged records (DO D§22 + D24)', () => {
  it('contractNotActive cria { tag: "ContractNotActive", currentStatus } (D23 — evidência)', () => {
    // Arrange
    const currentStatus = 'Expired' as const;
    // Act
    const e = ContractError.contractNotActive(currentStatus);
    // Assert
    assert.equal(e.tag, 'ContractNotActive');
    assert.equal(e.currentStatus, 'Expired');
  });

  it('contractCannotExpireYet cria { tag: "ContractCannotExpireYet", currentEnd, attemptedAt } (D23)', () => {
    // Arrange
    const currentEnd = D('2026-12-31');
    const attemptedAt = D('2026-06-15');
    // Act
    const e = ContractError.contractCannotExpireYet(currentEnd, attemptedAt);
    // Assert
    assert.equal(e.tag, 'ContractCannotExpireYet');
    assert.equal(e.currentEnd.getTime(), currentEnd.getTime());
    assert.equal(e.attemptedAt.getTime(), attemptedAt.getTime());
  });

  it('contractValueWouldGoNegative cria { tag, currentValue, attemptedDecrease } (D23)', () => {
    // Arrange
    const currentValue = money(10000000);
    const attemptedDecrease = money(10000001);
    // Act
    const e = ContractError.contractValueWouldGoNegative(currentValue, attemptedDecrease);
    // Assert
    assert.equal(e.tag, 'ContractValueWouldGoNegative');
    assert.equal(e.currentValue.cents, 10000000);
    assert.equal(e.attemptedDecrease.cents, 10000001);
  });

  it('contractPeriodExtensionNotAfterCurrentEnd cria { tag, currentEnd, attemptedEnd } (D23)', () => {
    // Arrange
    const currentEnd = D('2026-12-31');
    const attemptedEnd = D('2026-06-30');
    // Act
    const e = ContractError.contractPeriodExtensionNotAfterCurrentEnd(currentEnd, attemptedEnd);
    // Assert
    assert.equal(e.tag, 'ContractPeriodExtensionNotAfterCurrentEnd');
    assert.equal(e.currentEnd.getTime(), currentEnd.getTime());
    assert.equal(e.attemptedEnd.getTime(), attemptedEnd.getTime());
  });

  it('contractAmendmentAlreadyApplied cria { tag, amendmentId } (D23)', () => {
    // Arrange
    const amendmentId = AmendmentId.generate();
    // Act
    const e = ContractError.contractAmendmentAlreadyApplied(amendmentId);
    // Assert
    assert.equal(e.tag, 'ContractAmendmentAlreadyApplied');
    assert.equal(e.amendmentId, amendmentId);
  });

  it('contractSequentialNumberInvalidFormat cria { tag, attempted } (D23)', () => {
    // Arrange
    const attempted = '0001/2026';
    // Act
    const e = ContractError.contractSequentialNumberInvalidFormat(attempted);
    // Assert
    assert.equal(e.tag, 'ContractSequentialNumberInvalidFormat');
    assert.equal(e.attempted, attempted);
  });

  it('contractTitleRequired cria { tag: "ContractTitleRequired" } (sem payload)', () => {
    // Arrange / Act
    const e = ContractError.contractTitleRequired();
    // Assert
    assert.equal(e.tag, 'ContractTitleRequired');
    assert.equal(
      Object.keys(e).length,
      1,
      'erro de validação simples não carrega payload (somente tag)',
    );
  });

  it('contractSequentialNumberRequired cria { tag: "ContractSequentialNumberRequired" } (sem payload)', () => {
    // Arrange / Act
    const e = ContractError.contractSequentialNumberRequired();
    // Assert
    assert.equal(e.tag, 'ContractSequentialNumberRequired');
    assert.equal(Object.keys(e).length, 1);
  });

  it('contractOriginalValueZero cria { tag: "ContractOriginalValueZero" } (sem payload)', () => {
    // Arrange / Act
    const e = ContractError.contractOriginalValueZero();
    // Assert
    assert.equal(e.tag, 'ContractOriginalValueZero');
    assert.equal(Object.keys(e).length, 1);
  });

  it('contractInvalidEventDate cria { tag: "ContractInvalidEventDate" } (sem payload)', () => {
    // Arrange / Act
    const e = ContractError.contractInvalidEventDate();
    // Assert
    assert.equal(e.tag, 'ContractInvalidEventDate');
    assert.equal(Object.keys(e).length, 1);
  });

  it('contractCannotExpireIndefinitePeriod cria tag sem payload', () => {
    // Arrange / Act
    const e = ContractError.contractCannotExpireIndefinitePeriod();
    // Assert
    assert.equal(e.tag, 'ContractCannotExpireIndefinitePeriod');
    assert.equal(Object.keys(e).length, 1);
  });

  it('contractCannotExtendIndefinitePeriod cria tag sem payload', () => {
    // Arrange / Act
    const e = ContractError.contractCannotExtendIndefinitePeriod();
    // Assert
    assert.equal(e.tag, 'ContractCannotExtendIndefinitePeriod');
    assert.equal(Object.keys(e).length, 1);
  });

  it('contractObjectiveRequired cria tag sem payload', () => {
    // Arrange / Act
    const e = ContractError.contractObjectiveRequired();
    // Assert
    assert.equal(e.tag, 'ContractObjectiveRequired');
    assert.equal(Object.keys(e).length, 1);
  });

  it('contractInvalidSignedAt cria tag sem payload', () => {
    // Arrange / Act
    const e = ContractError.contractInvalidSignedAt();
    // Assert
    assert.equal(e.tag, 'ContractInvalidSignedAt');
    assert.equal(Object.keys(e).length, 1);
  });
});

// ============================================================================
// PascalCase do tag bate com PascalCase do nome da case constructor (D24)
// ============================================================================

describe('ContractError — tag value matches PascalCase do nome do construtor (D24)', () => {
  it('para cada case ctor `contractXxx`, o tag é exatamente `ContractXxx`', () => {
    // Arrange
    const pairs: readonly (readonly [string, () => Readonly<{ tag: string }>])[] = [
      ['ContractSequentialNumberRequired', () => ContractError.contractSequentialNumberRequired()],
      ['ContractTitleRequired', () => ContractError.contractTitleRequired()],
      ['ContractObjectiveRequired', () => ContractError.contractObjectiveRequired()],
      ['ContractInvalidSignedAt', () => ContractError.contractInvalidSignedAt()],
      ['ContractOriginalValueZero', () => ContractError.contractOriginalValueZero()],
      ['ContractInvalidEventDate', () => ContractError.contractInvalidEventDate()],
      [
        'ContractCannotExpireIndefinitePeriod',
        () => ContractError.contractCannotExpireIndefinitePeriod(),
      ],
      [
        'ContractCannotExtendIndefinitePeriod',
        () => ContractError.contractCannotExtendIndefinitePeriod(),
      ],
      [
        'ContractSequentialNumberInvalidFormat',
        () => ContractError.contractSequentialNumberInvalidFormat('001-2026'),
      ],
      ['ContractNotActive', () => ContractError.contractNotActive('Expired')],
      [
        'ContractCannotExpireYet',
        () => ContractError.contractCannotExpireYet(D('2026-12-31'), D('2026-06-15')),
      ],
      [
        'ContractValueWouldGoNegative',
        () => ContractError.contractValueWouldGoNegative(money(100), money(200)),
      ],
      [
        'ContractPeriodExtensionNotAfterCurrentEnd',
        () =>
          ContractError.contractPeriodExtensionNotAfterCurrentEnd(D('2026-12-31'), D('2026-06-30')),
      ],
      [
        'ContractAmendmentAlreadyApplied',
        () => ContractError.contractAmendmentAlreadyApplied(AmendmentId.generate()),
      ],
    ];
    // Act / Assert
    for (const [expectedTag, ctor] of pairs) {
      const e = ctor();
      assert.equal(e.tag, expectedTag, `case ctor deve produzir tag PascalCase = ${expectedTag}`);
    }
  });
});
