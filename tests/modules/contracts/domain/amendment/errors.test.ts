import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

// CTR-DOMAIN-TAGGED-ERRORS (W0 RED) — Padrão D (DO D§22): consumo canônico
// é exclusivamente via `import * as AmendmentError from './errors.ts'`. Este import
// deve compilar e expor as case constructors como free functions no W1.
import * as AmendmentError from '#src/modules/contracts/domain/amendment/errors.ts';

// ============================================================================
// Padrão D (DO D§22) — case constructors como free functions
// ============================================================================

describe('errors.ts — Padrão D (DO D§22)', () => {
  it('expõe case constructors como free functions (não namespace-object)', () => {
    // Arrange
    const expectedFreeFunctions = [
      'amendmentNumberRequired',
      'amendmentDescriptionRequired',
      'amendmentInvalidCreatedAt',
      'amendmentInvalidNewEndDate',
      'amendmentImpactValueZero',
      'amendmentInvalidEventDate',
      'amendmentNotPending',
      'amendmentDocumentAlreadyAttached',
      'amendmentWithoutSignedDocument',
    ] as const;
    // Act / Assert
    for (const fnName of expectedFreeFunctions) {
      const fn = (AmendmentError as unknown as Record<string, unknown>)[fnName];
      assert.equal(
        typeof fn,
        'function',
        `${fnName} deve ser exportada como free function (Padrão D — DO D§22)`,
      );
    }
  });

  it("NÃO expõe namespace-object aninhado (DON'T D§21)", () => {
    // Arrange / Act
    const aliased = (AmendmentError as unknown as Record<string, unknown>)['AmendmentError'];
    // Assert
    assert.equal(
      aliased,
      undefined,
      "errors.ts não pode ter `export const AmendmentError = { ... }` aninhado (DON'T D§21)",
    );
  });

  it('importa via `import * as AmendmentError from "./errors.ts"` (canal canônico)', () => {
    // Arrange / Act
    const hasAtLeastOneCtor = typeof AmendmentError.amendmentNumberRequired === 'function';
    // Assert
    assert.equal(hasAtLeastOneCtor, true, 'import * as AmendmentError deve expor case ctors');
  });
});

// ============================================================================
// Tagged variants — shape { tag, ...payload } (DO D§22 + DO D§24)
// ============================================================================

describe('AmendmentError variants — tagged records (DO D§22 + D24)', () => {
  it('amendmentNumberRequired cria { tag: "AmendmentNumberRequired" } (sem payload)', () => {
    // Arrange / Act
    const e = AmendmentError.amendmentNumberRequired();
    // Assert
    assert.equal(e.tag, 'AmendmentNumberRequired');
    assert.equal(Object.keys(e).length, 1);
  });

  it('amendmentDescriptionRequired cria { tag: "AmendmentDescriptionRequired" } (sem payload)', () => {
    // Arrange / Act
    const e = AmendmentError.amendmentDescriptionRequired();
    // Assert
    assert.equal(e.tag, 'AmendmentDescriptionRequired');
    assert.equal(Object.keys(e).length, 1);
  });

  it('amendmentInvalidCreatedAt cria { tag: "AmendmentInvalidCreatedAt" } (sem payload)', () => {
    // Arrange / Act
    const e = AmendmentError.amendmentInvalidCreatedAt();
    // Assert
    assert.equal(e.tag, 'AmendmentInvalidCreatedAt');
    assert.equal(Object.keys(e).length, 1);
  });

  it('amendmentInvalidNewEndDate cria { tag: "AmendmentInvalidNewEndDate" } (sem payload)', () => {
    // Arrange / Act
    const e = AmendmentError.amendmentInvalidNewEndDate();
    // Assert
    assert.equal(e.tag, 'AmendmentInvalidNewEndDate');
    assert.equal(Object.keys(e).length, 1);
  });

  it('amendmentImpactValueZero cria { tag: "AmendmentImpactValueZero" } (sem payload)', () => {
    // Arrange / Act
    const e = AmendmentError.amendmentImpactValueZero();
    // Assert
    assert.equal(e.tag, 'AmendmentImpactValueZero');
    assert.equal(Object.keys(e).length, 1);
  });

  it('amendmentInvalidEventDate cria { tag: "AmendmentInvalidEventDate" } (sem payload)', () => {
    // Arrange / Act
    const e = AmendmentError.amendmentInvalidEventDate();
    // Assert
    assert.equal(e.tag, 'AmendmentInvalidEventDate');
    assert.equal(Object.keys(e).length, 1);
  });

  it('amendmentNotPending cria { tag: "AmendmentNotPending", currentStatus } (D23)', () => {
    // Arrange
    const currentStatus = 'Homologated' as const;
    // Act
    const e = AmendmentError.amendmentNotPending(currentStatus);
    // Assert
    assert.equal(e.tag, 'AmendmentNotPending');
    assert.equal(e.currentStatus, 'Homologated');
  });

  it('amendmentDocumentAlreadyAttached cria tag sem payload', () => {
    // Arrange / Act
    const e = AmendmentError.amendmentDocumentAlreadyAttached();
    // Assert
    assert.equal(e.tag, 'AmendmentDocumentAlreadyAttached');
    assert.equal(Object.keys(e).length, 1);
  });

  it('amendmentWithoutSignedDocument cria tag sem payload', () => {
    // Arrange / Act
    const e = AmendmentError.amendmentWithoutSignedDocument();
    // Assert
    assert.equal(e.tag, 'AmendmentWithoutSignedDocument');
    assert.equal(Object.keys(e).length, 1);
  });
});

// ============================================================================
// PascalCase do tag bate com PascalCase do nome da case constructor (D24)
// ============================================================================

describe('AmendmentError — tag value matches PascalCase do nome do construtor (D24)', () => {
  it('para cada case ctor `amendmentXxx`, o tag é exatamente `AmendmentXxx`', () => {
    // Arrange
    const pairs: readonly (readonly [string, () => Readonly<{ tag: string }>])[] = [
      ['AmendmentNumberRequired', () => AmendmentError.amendmentNumberRequired()],
      ['AmendmentDescriptionRequired', () => AmendmentError.amendmentDescriptionRequired()],
      ['AmendmentInvalidCreatedAt', () => AmendmentError.amendmentInvalidCreatedAt()],
      ['AmendmentInvalidNewEndDate', () => AmendmentError.amendmentInvalidNewEndDate()],
      ['AmendmentImpactValueZero', () => AmendmentError.amendmentImpactValueZero()],
      ['AmendmentInvalidEventDate', () => AmendmentError.amendmentInvalidEventDate()],
      ['AmendmentNotPending', () => AmendmentError.amendmentNotPending('Homologated')],
      ['AmendmentDocumentAlreadyAttached', () => AmendmentError.amendmentDocumentAlreadyAttached()],
      ['AmendmentWithoutSignedDocument', () => AmendmentError.amendmentWithoutSignedDocument()],
    ];
    // Act / Assert
    for (const [expectedTag, ctor] of pairs) {
      const e = ctor();
      assert.equal(e.tag, expectedTag, `case ctor deve produzir tag PascalCase = ${expectedTag}`);
    }
  });
});
