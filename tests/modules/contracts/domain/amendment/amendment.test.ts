import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import { Money } from '#src/modules/contracts/domain/shared/money.ts';
import {
  AmendmentId,
  ContractId,
  DocumentId,
  UserRef,
} from '#src/modules/contracts/domain/shared/ids.ts';
import { Amendment } from '#src/modules/contracts/domain/amendment/amendment.ts';
import type { CreateAmendmentInput } from '#src/modules/contracts/domain/amendment/types.ts';
import { toContractAdjustment } from '#src/modules/contracts/application/use-cases/homologate-amendment.ts';

const D = (iso: string): Date => new Date(iso);
const INVALID_DATE = new Date('not-a-date');
const VALID_UUID = '7f3a1234-5678-4abc-9def-fedcba987654';

const money = (cents: number) => {
  const r = Money.fromCents(cents);
  if (!r.ok) throw new Error(`test fixture broken: ${r.error}`);
  return r.value;
};

const userRef = () => {
  const r = UserRef.rehydrate(VALID_UUID);
  if (!r.ok) throw new Error(`test fixture broken: ${r.error}`);
  return r.value;
};

const baseInput = (overrides: Partial<Omit<CreateAmendmentInput, 'kind'>> = {}) => ({
  id: AmendmentId.generate(),
  contractId: ContractId.generate(),
  amendmentNumber: 'AD 01-001/2026',
  description: 'Ampliação de escopo',
  createdAt: D('2026-03-01'),
  ...overrides,
});

const createAddition = (impactCents = 500000) => {
  const r = Amendment.create({
    ...baseInput(),
    kind: 'Addition',
    impactValue: money(impactCents),
  });
  if (!r.ok) throw new Error(`fixture broken: ${r.error}`);
  return r.value.amendment;
};

const createPendingWithDoc = () => {
  const a = createAddition();
  const r = Amendment.attachSignedDocument(a, DocumentId.generate());
  if (!r.ok) throw new Error(`fixture broken: ${r.error}`);
  return r.value.amendment;
};

const createHomologated = () => {
  const a = createPendingWithDoc();
  const r = Amendment.homologate(a, userRef(), D('2026-04-01'));
  if (!r.ok) throw new Error(`fixture broken: ${r.error}`);
  return r.value.amendment;
};

// ============================================================================
// create — Addition
// ============================================================================

describe('Amendment.create — Addition', () => {
  it('creates Pending Addition with impactValue', () => {
    const r = Amendment.create({
      ...baseInput(),
      kind: 'Addition',
      impactValue: money(500000),
    });
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    const { amendment, event } = r.value;
    assert.equal(amendment.status, 'Pending');
    assert.equal(amendment.kind, 'Addition');
    if (amendment.kind === 'Addition') {
      assert.equal(amendment.impactValue.cents, 500000);
    }
    assert.equal(amendment.signedDocumentRef, null);
    assert.equal(amendment.homologatedAt, null);
    assert.equal(amendment.homologatedBy, null);
    assert.equal(event.type, 'AmendmentCreated');
  });

  it('rejects impactValue of zero', () => {
    const r = Amendment.create({
      ...baseInput(),
      kind: 'Addition',
      impactValue: Money.zero(),
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'amendment-impact-value-zero');
  });
});

// ============================================================================
// create — Suppression
// ============================================================================

describe('Amendment.create — Suppression', () => {
  it('creates Pending Suppression with impactValue', () => {
    const r = Amendment.create({
      ...baseInput(),
      kind: 'Suppression',
      impactValue: money(300000),
    });
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    assert.equal(r.value.amendment.kind, 'Suppression');
  });

  it('rejects impactValue of zero', () => {
    const r = Amendment.create({
      ...baseInput(),
      kind: 'Suppression',
      impactValue: Money.zero(),
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'amendment-impact-value-zero');
  });
});

// ============================================================================
// create — TermChange
// ============================================================================

describe('Amendment.create — TermChange', () => {
  it('creates Pending TermChange with newEndDate', () => {
    const r = Amendment.create({
      ...baseInput(),
      kind: 'TermChange',
      newEndDate: D('2027-06-30'),
    });
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    assert.equal(r.value.amendment.kind, 'TermChange');
    if (r.value.amendment.kind === 'TermChange') {
      assert.equal(r.value.amendment.newEndDate.getTime(), D('2027-06-30').getTime());
    }
  });

  it('rejects invalid newEndDate', () => {
    const r = Amendment.create({
      ...baseInput(),
      kind: 'TermChange',
      newEndDate: INVALID_DATE,
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'amendment-invalid-new-end-date');
  });
});

// ============================================================================
// create — Misc
// ============================================================================

describe('Amendment.create — Misc', () => {
  it('creates Pending Misc with only description', () => {
    const r = Amendment.create({
      ...baseInput(),
      kind: 'Misc',
    });
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    assert.equal(r.value.amendment.kind, 'Misc');
  });
});

// ============================================================================
// create — validações comuns
// ============================================================================

describe('Amendment.create — common validations', () => {
  it('rejects empty amendmentNumber', () => {
    const r = Amendment.create({
      ...baseInput({ amendmentNumber: '' }),
      kind: 'Misc',
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'amendment-number-required');
  });

  it('rejects whitespace-only amendmentNumber', () => {
    const r = Amendment.create({
      ...baseInput({ amendmentNumber: '   ' }),
      kind: 'Misc',
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'amendment-number-required');
  });

  it('rejects empty description', () => {
    const r = Amendment.create({
      ...baseInput({ description: '' }),
      kind: 'Misc',
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'amendment-description-required');
  });

  it('rejects invalid createdAt', () => {
    const r = Amendment.create({
      ...baseInput({ createdAt: INVALID_DATE }),
      kind: 'Misc',
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'amendment-invalid-created-at');
  });
});

// ============================================================================
// attachSignedDocument
// ============================================================================

describe('Amendment.attachSignedDocument', () => {
  it('attaches doc to Pending amendment without doc', () => {
    const a = createAddition();
    const docId = DocumentId.generate();
    const r = Amendment.attachSignedDocument(a, docId);
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    assert.equal(r.value.amendment.signedDocumentRef, docId);
    assert.equal(r.value.amendment.status, 'Pending');
    assert.equal(r.value.event.type, 'AmendmentDocumentAttached');
  });

  it('rejects when amendment already has document', () => {
    const a = createPendingWithDoc();
    const r = Amendment.attachSignedDocument(a, DocumentId.generate());
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'amendment-document-already-attached');
  });

  it('rejects when amendment is Homologated', () => {
    const a = createHomologated();
    const r = Amendment.attachSignedDocument(a, DocumentId.generate());
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'amendment-not-pending');
  });
});

// ============================================================================
// homologate
// ============================================================================

describe('Amendment.homologate', () => {
  it('homologates Pending with signedDocumentRef', () => {
    const a = createPendingWithDoc();
    const by = userRef();
    const at = D('2026-04-01');
    const r = Amendment.homologate(a, by, at);
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    assert.equal(r.value.amendment.status, 'Homologated');
    assert.equal(r.value.amendment.homologatedAt?.getTime(), at.getTime());
    assert.equal(r.value.amendment.homologatedBy, by);
    assert.equal(r.value.event.type, 'AmendmentHomologated');
  });

  it('rejects Pending without signedDocumentRef (R2 of handbook)', () => {
    const a = createAddition();
    const r = Amendment.homologate(a, userRef(), D('2026-04-01'));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'amendment-without-signed-document');
  });

  it('rejects already Homologated amendment', () => {
    const a = createHomologated();
    const r = Amendment.homologate(a, userRef(), D('2026-05-01'));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'amendment-not-pending');
  });

  it('rejects invalid at date', () => {
    const a = createPendingWithDoc();
    const r = Amendment.homologate(a, userRef(), INVALID_DATE);
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'amendment-invalid-event-date');
  });
});

// ============================================================================
// toContractAdjustment
// ============================================================================

describe('toContractAdjustment', () => {
  it('translates Addition to ValueIncrease', () => {
    const a = createAddition(500000);
    const adj = toContractAdjustment(a);
    assert.equal(adj.kind, 'ValueIncrease');
    if (adj.kind === 'ValueIncrease') {
      assert.equal(adj.amount.cents, 500000);
      assert.equal(adj.amendmentId, a.id);
    }
  });

  it('translates Suppression to ValueDecrease', () => {
    const r = Amendment.create({
      ...baseInput(),
      kind: 'Suppression',
      impactValue: money(200000),
    });
    if (!r.ok) throw new Error('fixture broken');
    const adj = toContractAdjustment(r.value.amendment);
    assert.equal(adj.kind, 'ValueDecrease');
    if (adj.kind === 'ValueDecrease') {
      assert.equal(adj.amount.cents, 200000);
    }
  });

  it('translates TermChange to PeriodExtension', () => {
    const r = Amendment.create({
      ...baseInput(),
      kind: 'TermChange',
      newEndDate: D('2027-12-31'),
    });
    if (!r.ok) throw new Error('fixture broken');
    const adj = toContractAdjustment(r.value.amendment);
    assert.equal(adj.kind, 'PeriodExtension');
    if (adj.kind === 'PeriodExtension') {
      assert.equal(adj.newEnd.getTime(), D('2027-12-31').getTime());
    }
  });

  it('translates Misc to Acknowledgment', () => {
    const r = Amendment.create({ ...baseInput(), kind: 'Misc' });
    if (!r.ok) throw new Error('fixture broken');
    const adj = toContractAdjustment(r.value.amendment);
    assert.equal(adj.kind, 'Acknowledgment');
    if (adj.kind === 'Acknowledgment') {
      assert.equal(adj.amendmentId, r.value.amendment.id);
    }
  });
});

// ============================================================================
// invariantes
// ============================================================================

describe('Amendment — invariants', () => {
  it('R2: cannot homologate without signed document', () => {
    const a = createAddition();
    assert.equal(a.signedDocumentRef, null);
    const r = Amendment.homologate(a, userRef(), D('2026-04-01'));
    assert.equal(isErr(r), true);
  });

  it('status transitions: Pending → Pending+Doc → Homologated', () => {
    const p1 = createAddition();
    assert.equal(p1.status, 'Pending');
    assert.equal(p1.signedDocumentRef, null);

    const docId = DocumentId.generate();
    const p2 = Amendment.attachSignedDocument(p1, docId);
    if (!p2.ok) throw new Error('fixture broken');
    assert.equal(p2.value.amendment.status, 'Pending');
    assert.equal(p2.value.amendment.signedDocumentRef, docId);

    const p3 = Amendment.homologate(p2.value.amendment, userRef(), D('2026-04-01'));
    if (!p3.ok) throw new Error('fixture broken');
    assert.equal(p3.value.amendment.status, 'Homologated');
  });
});
