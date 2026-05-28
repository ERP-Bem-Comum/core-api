/**
 * CTR-DOMAIN-STATE-MACHINE-AMENDMENT — W0 RED — CA6: mapper round-trip por subtipo
 * CTR-DOMAIN-MAPPER-RESULT         — W0 RED — CA6: tagged errors com payload de evidência
 *
 * `amendmentFromRow` atual retorna sempre `ok(amendment)` com cast inseguro
 * `as unknown as Amendment`. Após W1, o mapper decide o subtipo via switch
 * em `row.status` × `row.signedDocumentRef` e rejeita shapes impossíveis:
 *   - Pending + homologatedAt/homologatedBy não-null → err({ tag: 'AmendmentMapperImpossibleShape', reason })
 *   - Homologated + signedDocumentRef/homologatedAt/homologatedBy null → idem
 *
 * Estado W0 RED (CTR-DOMAIN-STATE-MACHINE-AMENDMENT):
 *   Asserts isErr(r) falham — mapper retorna ok para todos os shapes.
 *
 * Estado W0 RED (CTR-DOMAIN-MAPPER-RESULT):
 *   Asserts de payload (.tag, .reason, .attemptedValue) falham adicionalmente porque
 *   AmendmentMapperError ainda é string literal union — `r.error.tag` é undefined.
 *
 * Estado W1 (GREEN): mapper refatorado com tagged records passa tudo.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk, isErr } from '#src/shared/index.ts';
import {
  amendmentFromRow,
  type AmendmentRow,
} from '#src/modules/contracts/adapters/persistence/mappers/amendment.mapper.ts';

// ─── Helpers de fixture de row ────────────────────────────────────────────────

const AMENDMENT_BASE_ROW: Omit<
  AmendmentRow,
  'status' | 'signedDocumentRef' | 'homologatedAt' | 'homologatedBy'
> = {
  id: '22222222-2222-4222-8222-222222222222',
  contractId: '11111111-1111-4111-8111-111111111111',
  amendmentNumber: 'AD 01-001/2026',
  description: 'Aditivo mapper test',
  createdAt: new Date('2026-03-01T00:00:00.000Z'),
  kind: 'Addition',
  impactValueCents: 500_000,
  newEndDate: null,
};

const VALID_DOC_ID = '33333333-3333-4333-8333-333333333333';
const VALID_USER_REF = '44444444-4444-4444-8444-444444444444';

/** PendingWithoutDocument: status Pending, signedDocumentRef null, sem campos terminais. */
const pendingWithoutDocRow = (): AmendmentRow => ({
  ...AMENDMENT_BASE_ROW,
  status: 'Pending',
  signedDocumentRef: null,
  homologatedAt: null,
  homologatedBy: null,
});

/** PendingWithDocument: status Pending, signedDocumentRef preenchido, sem campos terminais. */
const pendingWithDocRow = (): AmendmentRow => ({
  ...AMENDMENT_BASE_ROW,
  status: 'Pending',
  signedDocumentRef: VALID_DOC_ID,
  homologatedAt: null,
  homologatedBy: null,
});

/** HomologatedAmendment: status Homologated, todos os 3 campos terminais presentes. */
const homologatedRow = (): AmendmentRow => ({
  ...AMENDMENT_BASE_ROW,
  status: 'Homologated',
  signedDocumentRef: VALID_DOC_ID,
  homologatedAt: new Date('2026-03-20T00:00:00.000Z'),
  homologatedBy: VALID_USER_REF,
});

/** Shape impossível: Pending com homologatedAt preenchido (CA6 — DON'T C§29). */
const pendingWithHomologatedAtRow = (): AmendmentRow => ({
  ...AMENDMENT_BASE_ROW,
  status: 'Pending',
  signedDocumentRef: null,
  homologatedAt: new Date('2026-03-20T00:00:00.000Z'),
  homologatedBy: null,
});

/** Shape impossível: Pending com homologatedBy preenchido (CA6 — DON'T C§29). */
const pendingWithHomologatedByRow = (): AmendmentRow => ({
  ...AMENDMENT_BASE_ROW,
  status: 'Pending',
  signedDocumentRef: null,
  homologatedAt: null,
  homologatedBy: VALID_USER_REF,
});

/** Shape impossível: Homologated sem signedDocumentRef (CA6 — DON'T C§29). */
const homologatedWithoutDocRow = (): AmendmentRow => ({
  ...AMENDMENT_BASE_ROW,
  status: 'Homologated',
  signedDocumentRef: null,
  homologatedAt: new Date('2026-03-20T00:00:00.000Z'),
  homologatedBy: VALID_USER_REF,
});

/** Shape impossível: Homologated sem homologatedAt (CA6 — DON'T C§29). */
const homologatedWithoutAtRow = (): AmendmentRow => ({
  ...AMENDMENT_BASE_ROW,
  status: 'Homologated',
  signedDocumentRef: VALID_DOC_ID,
  homologatedAt: null,
  homologatedBy: VALID_USER_REF,
});

/** Shape impossível: Homologated sem homologatedBy (CA6 — DON'T C§29). */
const homologatedWithoutByRow = (): AmendmentRow => ({
  ...AMENDMENT_BASE_ROW,
  status: 'Homologated',
  signedDocumentRef: VALID_DOC_ID,
  homologatedAt: new Date('2026-03-20T00:00:00.000Z'),
  homologatedBy: null,
});

// ─── CA6-a: shapes válidos retornam ok com o subtipo correto ─────────────────

describe('amendmentFromRow — shapes válidos (CA6)', () => {
  it('Pending + signedDocumentRef null → ok com status Pending e signedDocumentRef null', () => {
    // Arrange
    const row = pendingWithoutDocRow();
    // Act
    const r = amendmentFromRow(row);
    // Assert
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    assert.equal(r.value.status, 'Pending');
    assert.equal(r.value.signedDocumentRef, null);
    // Após W1: subtipo será PendingWithoutDocumentAmendment — homologatedAt/By null obrigatório
    assert.equal(r.value.homologatedAt, null);
    assert.equal(r.value.homologatedBy, null);
  });

  it('Pending + signedDocumentRef DocumentId → ok com status Pending e signedDocumentRef preservado', () => {
    // Arrange
    const row = pendingWithDocRow();
    // Act
    const r = amendmentFromRow(row);
    // Assert
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    assert.equal(r.value.status, 'Pending');
    assert.notEqual(
      r.value.signedDocumentRef,
      null,
      'signedDocumentRef deve ser preservado no round-trip',
    );
    // Após W1: subtipo será PendingWithDocumentAmendment
    assert.equal(r.value.homologatedAt, null);
    assert.equal(r.value.homologatedBy, null);
  });

  it('Homologated + todos os campos terminais → ok com status Homologated e campos preservados', () => {
    // Arrange
    const row = homologatedRow();
    // Act
    const r = amendmentFromRow(row);
    // Assert
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    assert.equal(r.value.status, 'Homologated');
    // Após W1: subtipo será HomologatedAmendment — 3 campos terminais obrigatórios
    assert.notEqual(r.value.signedDocumentRef, null, 'signedDocumentRef deve ser preservado');
    assert.notEqual(r.value.homologatedAt, null, 'homologatedAt deve ser preservado');
    assert.notEqual(r.value.homologatedBy, null, 'homologatedBy deve ser preservado');
    if (r.value.homologatedAt !== null) {
      assert.equal(
        r.value.homologatedAt.getTime(),
        row.homologatedAt!.getTime(),
        'homologatedAt deve ser preservado no round-trip',
      );
    }
  });
});

// ─── CA6-b / CTR-DOMAIN-MAPPER-RESULT: shapes impossíveis → tagged error com payload ─
//
// Em W0 (CTR-DOMAIN-STATE-MACHINE-AMENDMENT): isErr(r) falha — mapper retorna ok.
//
// Em W0 (CTR-DOMAIN-MAPPER-RESULT): adicionalmente r.error.tag é undefined porque
//   AmendmentMapperError ainda é string literal.
//
// Em W1: mapper emite err({ tag: 'AmendmentMapperImpossibleShape', reason: '...' }).

describe("amendmentFromRow — shapes impossíveis → tagged error com payload (CA6 — DON'T C§29)", () => {
  it("Pending + homologatedAt != null → err({ tag: 'AmendmentMapperImpossibleShape' })", () => {
    // Arrange
    const row = pendingWithHomologatedAtRow();
    // Act
    const r = amendmentFromRow(row);
    // Assert
    assert.equal(
      isErr(r),
      true,
      'Pending com homologatedAt preenchido deve ser rejeitado pelo mapper',
    );
    if (!r.ok) {
      // W0 RED (CTR-DOMAIN-MAPPER-RESULT): r.error é string — .tag === undefined
      assert.equal(
        (r.error as unknown as { tag: string }).tag,
        'AmendmentMapperImpossibleShape',
        "tag deve ser 'AmendmentMapperImpossibleShape'",
      );
      assert.equal(typeof (r.error as unknown as { reason: string }).reason, 'string');
    }
  });

  it("Pending + homologatedBy != null → err({ tag: 'AmendmentMapperImpossibleShape' })", () => {
    // Arrange
    const row = pendingWithHomologatedByRow();
    // Act
    const r = amendmentFromRow(row);
    // Assert
    assert.equal(
      isErr(r),
      true,
      'Pending com homologatedBy preenchido deve ser rejeitado pelo mapper',
    );
    if (!r.ok) {
      assert.equal((r.error as unknown as { tag: string }).tag, 'AmendmentMapperImpossibleShape');
      assert.equal(typeof (r.error as unknown as { reason: string }).reason, 'string');
    }
  });

  it("Homologated + signedDocumentRef null → err({ tag: 'AmendmentMapperImpossibleShape' })", () => {
    // Arrange
    const row = homologatedWithoutDocRow();
    // Act
    const r = amendmentFromRow(row);
    // Assert
    assert.equal(
      isErr(r),
      true,
      'Homologated sem signedDocumentRef deve ser rejeitado pelo mapper',
    );
    if (!r.ok) {
      assert.equal((r.error as unknown as { tag: string }).tag, 'AmendmentMapperImpossibleShape');
      assert.equal(typeof (r.error as unknown as { reason: string }).reason, 'string');
    }
  });

  it("Homologated + homologatedAt null → err({ tag: 'AmendmentMapperImpossibleShape' })", () => {
    // Arrange
    const row = homologatedWithoutAtRow();
    // Act
    const r = amendmentFromRow(row);
    // Assert
    assert.equal(isErr(r), true, 'Homologated sem homologatedAt deve ser rejeitado pelo mapper');
    if (!r.ok) {
      assert.equal((r.error as unknown as { tag: string }).tag, 'AmendmentMapperImpossibleShape');
      assert.equal(typeof (r.error as unknown as { reason: string }).reason, 'string');
    }
  });

  it("Homologated + homologatedBy null → err({ tag: 'AmendmentMapperImpossibleShape' })", () => {
    // Arrange
    const row = homologatedWithoutByRow();
    // Act
    const r = amendmentFromRow(row);
    // Assert
    assert.equal(isErr(r), true, 'Homologated sem homologatedBy deve ser rejeitado pelo mapper');
    if (!r.ok) {
      assert.equal((r.error as unknown as { tag: string }).tag, 'AmendmentMapperImpossibleShape');
      assert.equal(typeof (r.error as unknown as { reason: string }).reason, 'string');
    }
  });
});

// ============================================================================
// CTR-DOMAIN-INVARIANT-CONTEXTUAL — CA7: mapper rejeita row Addition + cents = 0
// CTR-DOMAIN-MAPPER-RESULT        — CA6: assert migrado para tagged payload
// ============================================================================
//
// Estado W0 RED (CTR-DOMAIN-INVARIANT-CONTEXTUAL):
//   isErr(r) falha — variantFromRow retorna ok(Money.ZERO) para cents = 0.
//
// Estado W0 RED (CTR-DOMAIN-MAPPER-RESULT):
//   r.error.tag falha adicionalmente — AmendmentMapperError ainda é string literal.
//
// Estado W1 GREEN: NonZeroMoney.from(Money.ZERO) → err → mapper emite
//   err({ tag: 'AmendmentMapperImpossibleShape', reason: '...' }).

describe('amendmentFromRow — CA7 + CA6: impactValueCents = 0 rejeitado com tagged payload', () => {
  it("Row Addition + impactValueCents = 0 → err({ tag: 'AmendmentMapperImpossibleShape' })", () => {
    // Arrange — row com shape de estado válido (Pending sem doc), mas impactValue zero.
    const row: AmendmentRow = {
      ...AMENDMENT_BASE_ROW,
      kind: 'Addition',
      impactValueCents: 0, // ← valor impossível para Addition após W1
      status: 'Pending',
      signedDocumentRef: null,
      homologatedAt: null,
      homologatedBy: null,
    };
    // Act
    const r = amendmentFromRow(row);
    // Assert
    assert.equal(
      isErr(r),
      true,
      'Row Addition + impactValueCents = 0 deve ser rejeitado pelo mapper como shape impossível',
    );
    if (!r.ok) {
      // W0 RED (CTR-DOMAIN-MAPPER-RESULT): r.error é string — .tag === undefined
      assert.equal(
        (r.error as unknown as { tag: string }).tag,
        'AmendmentMapperImpossibleShape',
        "tag deve ser 'AmendmentMapperImpossibleShape'",
      );
      assert.equal(typeof (r.error as unknown as { reason: string }).reason, 'string');
    }
  });

  it("Row Suppression + impactValueCents = 0 → err({ tag: 'AmendmentMapperImpossibleShape' })", () => {
    // Arrange — mesmo comportamento para Suppression (symmetric com Addition).
    const row: AmendmentRow = {
      ...AMENDMENT_BASE_ROW,
      kind: 'Suppression',
      impactValueCents: 0, // ← valor impossível para Suppression após W1
      status: 'Pending',
      signedDocumentRef: null,
      homologatedAt: null,
      homologatedBy: null,
    };
    // Act
    const r = amendmentFromRow(row);
    // Assert
    assert.equal(
      isErr(r),
      true,
      'Row Suppression + impactValueCents = 0 deve ser rejeitado pelo mapper como shape impossível',
    );
    if (!r.ok) {
      assert.equal((r.error as unknown as { tag: string }).tag, 'AmendmentMapperImpossibleShape');
      assert.equal(typeof (r.error as unknown as { reason: string }).reason, 'string');
    }
  });
});

// ─── NOVO: CA6 — DB corrompido: kind inválido → payload AmendmentMapperInvalidKind ─
//
// W0 RED (CTR-DOMAIN-MAPPER-RESULT): AmendmentMapperError ainda é string literal.
//   `r.error.tag` resolve undefined, assert falha.
// W1 GREEN: amendmentFromRow emite err(amendmentMapperInvalidKind(row.kind)) onde
//   amendmentMapperInvalidKind = (v) => ({ tag: 'AmendmentMapperInvalidKind', attemptedValue: v }).
//
// Note: AmendmentRow.kind é `string` no schema — cast via `as unknown as AmendmentRow`
// permite injetar valor arbitrário para simular DB corrompido.

describe('amendmentFromRow — DB corrompido: kind inválido (CA6 — tagged payload)', () => {
  it("row com kind desconhecido → err({ tag: 'AmendmentMapperInvalidKind', attemptedValue })", () => {
    // Arrange — kind não pertence ao enum AmendmentKind
    const BAD_KIND = 'UnknownKind';
    const row = {
      ...AMENDMENT_BASE_ROW,
      kind: BAD_KIND,
      status: 'Pending',
      signedDocumentRef: null,
      homologatedAt: null,
      homologatedBy: null,
    } as unknown as AmendmentRow;
    // Act
    const r = amendmentFromRow(row);
    // Assert
    assert.equal(isErr(r), true, 'row com kind inválido deve ser rejeitado');
    if (!r.ok) {
      // W0 RED: r.error é string — .tag === undefined, falha aqui
      assert.equal(
        (r.error as unknown as { tag: string }).tag,
        'AmendmentMapperInvalidKind',
        "tag deve ser 'AmendmentMapperInvalidKind'",
      );
      assert.equal(
        (r.error as unknown as { attemptedValue: string }).attemptedValue,
        BAD_KIND,
        'payload.attemptedValue deve carregar o kind que causou a falha',
      );
    }
  });

  it("row com id inválido → err({ tag: 'AmendmentMapperInvalidId', attemptedValue })", () => {
    // Arrange — id não é UUID v4 válido
    const BAD_ID = 'not-a-uuid-at-all';
    const row = {
      ...AMENDMENT_BASE_ROW,
      id: BAD_ID,
      status: 'Pending',
      signedDocumentRef: null,
      homologatedAt: null,
      homologatedBy: null,
    } as unknown as AmendmentRow;
    // Act
    const r = amendmentFromRow(row);
    // Assert
    assert.equal(isErr(r), true, 'row com id inválido deve ser rejeitado');
    if (!r.ok) {
      assert.equal((r.error as unknown as { tag: string }).tag, 'AmendmentMapperInvalidId');
      assert.equal((r.error as unknown as { attemptedValue: string }).attemptedValue, BAD_ID);
    }
  });
});
