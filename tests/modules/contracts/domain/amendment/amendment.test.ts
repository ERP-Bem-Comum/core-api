import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import * as Money from '#src/shared/kernel/money.ts';
import * as NonZeroMoney from '#src/shared/kernel/non-zero-money.ts';
import * as AmendmentId from '#src/modules/contracts/domain/shared/amendment-id.ts';
import * as ContractId from '#src/modules/contracts/domain/shared/contract-id.ts';
import * as DocumentId from '#src/modules/contracts/domain/shared/document-id.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import { Amendment } from '#src/modules/contracts/domain/amendment/amendment.ts';
import type { CreateAmendmentInput } from '#src/modules/contracts/domain/amendment/types.ts';
import { updateAmendment } from '#src/modules/contracts/domain/amendment/types.ts';
import { toContractAdjustment } from '#src/modules/contracts/application/use-cases/homologate-amendment.ts';

const D = (iso: string): Date => new Date(iso);
const INVALID_DATE = new Date('not-a-date');
const VALID_UUID = '7f3a1234-5678-4abc-9def-fedcba987654';

const money = (cents: number) => {
  const r = Money.fromCents(cents);
  if (!r.ok) throw new Error(`test fixture broken: ${r.error}`);
  return r.value;
};

/** Produz NonZeroMoney para fixtures de Addition/Suppression. */
const nonZeroMoney = (cents: number) => {
  const m = money(cents);
  const r = NonZeroMoney.from(m);
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
    impactValue: nonZeroMoney(impactCents),
  });
  if (!r.ok) throw new Error(`fixture broken: ${JSON.stringify(r.error)}`);
  return r.value.amendment;
};

const createPendingWithDoc = () => {
  const a = createAddition();
  const r = Amendment.attachSignedDocument(a, DocumentId.generate());
  if (!r.ok) throw new Error(`fixture broken: ${JSON.stringify(r.error)}`);
  return r.value.amendment;
};

const createHomologated = () => {
  const a = createPendingWithDoc();
  const r = Amendment.homologate(a, userRef(), D('2026-04-01'));
  if (!r.ok) throw new Error(`fixture broken: ${JSON.stringify(r.error)}`);
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
      impactValue: nonZeroMoney(500000),
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

  // CTR-DOMAIN-INVARIANT-CONTEXTUAL — W1: teste removido.
  // Amendment.create agora exige NonZeroMoney em impactValue (rota α DO D§25).
  // Money.ZERO não é NonZeroMoney → TS rejeita em compile time.
  // A validação impactValue zero foi movida para o use case createAmendment (rota γ DO D§26).
});

// ============================================================================
// create — Suppression
// ============================================================================

describe('Amendment.create — Suppression', () => {
  it('creates Pending Suppression with impactValue', () => {
    const r = Amendment.create({
      ...baseInput(),
      kind: 'Suppression',
      impactValue: nonZeroMoney(300000),
    });
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    assert.equal(r.value.amendment.kind, 'Suppression');
  });

  // CTR-DOMAIN-INVARIANT-CONTEXTUAL — W1: teste removido.
  // Amendment.create agora exige NonZeroMoney em impactValue (rota α DO D§25).
  // Money.ZERO não é NonZeroMoney → TS rejeita em compile time.
  // A validação impactValue zero foi movida para o use case createAmendment (rota γ DO D§26).
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
    if (!r.ok) assert.equal(r.error.tag, 'AmendmentInvalidNewEndDate');
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
    if (!r.ok) assert.equal(r.error.tag, 'AmendmentNumberRequired');
  });

  it('rejects whitespace-only amendmentNumber', () => {
    const r = Amendment.create({
      ...baseInput({ amendmentNumber: '   ' }),
      kind: 'Misc',
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error.tag, 'AmendmentNumberRequired');
  });

  it('rejects empty description', () => {
    const r = Amendment.create({
      ...baseInput({ description: '' }),
      kind: 'Misc',
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error.tag, 'AmendmentDescriptionRequired');
  });

  it('rejects invalid createdAt', () => {
    const r = Amendment.create({
      ...baseInput({ createdAt: INVALID_DATE }),
      kind: 'Misc',
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error.tag, 'AmendmentInvalidCreatedAt');
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

  it('rejects when amendment already has document (via parsePendingWithoutDocument)', () => {
    // Após W1, attachSignedDocument aceita apenas PendingWithoutDocumentAmendment —
    // a rejeição de PendingWithDocument é garantia estática (CA3) + via parse na borda.
    const a = createPendingWithDoc();
    const r = Amendment.parsePendingWithoutDocument(a);
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error.tag, 'AmendmentDocumentAlreadyAttached');
  });

  it('rejects when amendment is Homologated (via parsePendingWithoutDocument)', () => {
    // A rejeição de HomologatedAmendment é garantia estática (CA3) + via parse na borda.
    const a = createHomologated();
    const r = Amendment.parsePendingWithoutDocument(a);
    assert.equal(isErr(r), true);
    if (!r.ok) {
      assert.equal(r.error.tag, 'AmendmentNotPending');
      if (r.error.tag === 'AmendmentNotPending') {
        assert.equal(r.error.currentStatus, 'Homologated');
      }
    }
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

  it('rejects Pending without signedDocumentRef (via parsePendingWithDocument)', () => {
    // Após W1, homologate aceita apenas PendingWithDocumentAmendment —
    // a rejeição de PendingWithoutDocument é garantia estática (CA3) + via parse na borda.
    const a = createAddition();
    const r = Amendment.parsePendingWithDocument(a);
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error.tag, 'AmendmentWithoutSignedDocument');
  });

  it('rejects already Homologated amendment (via parsePendingWithDocument)', () => {
    // A rejeição de HomologatedAmendment é garantia estática (CA3) + via parse na borda.
    const a = createHomologated();
    const r = Amendment.parsePendingWithDocument(a);
    assert.equal(isErr(r), true);
    if (!r.ok) {
      assert.equal(r.error.tag, 'AmendmentNotPending');
      if (r.error.tag === 'AmendmentNotPending') {
        assert.equal(r.error.currentStatus, 'Homologated');
      }
    }
  });

  it('rejects invalid at date', () => {
    const a = createPendingWithDoc();
    const r = Amendment.homologate(a, userRef(), INVALID_DATE);
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error.tag, 'AmendmentInvalidEventDate');
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
      impactValue: nonZeroMoney(200000),
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
  it('R2: cannot homologate without signed document (via parsePendingWithDocument)', () => {
    // homologate só aceita PendingWithDocumentAmendment — parsePendingWithDocument
    // é a borda correta para testar este invariante após W1.
    const a = createAddition();
    assert.equal(a.signedDocumentRef, null);
    const r = Amendment.parsePendingWithDocument(a);
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

// ============================================================================
// CTR-DOMAIN-DEBRAND-AGG — Bloco A DON'T §1 + DO A§4
// ============================================================================

describe("Amendment — desbrandado (Bloco A DON'T §1)", () => {
  it('Amendment não tem propriedade __brand em runtime', () => {
    // Arrange
    const amendment = createAddition();
    // Act
    const descriptors = Object.getOwnPropertyDescriptors(amendment);
    const keys = Object.keys(descriptors);
    // Assert
    assert.equal(
      keys.includes('__brand'),
      false,
      'Amendment não deve carregar marcador __brand em runtime',
    );
  });
});

describe('updateAmendment — helper canônico (DO A§4)', () => {
  it('exporta updateAmendment com assinatura esperada', () => {
    // Arrange / Act
    const fn = updateAmendment;
    // Assert
    assert.equal(typeof fn, 'function', 'updateAmendment deve ser exportado como função');
  });

  it('retorna nova instância (não muta prev)', () => {
    // Arrange
    const prev = createAddition(); // PendingWithoutDocumentAmendment
    // Act — patch com campo vazio; updateAmendment retorna nova referência frozen
    const next = updateAmendment(prev, {});
    // Assert
    assert.notEqual(next, prev, 'updateAmendment deve retornar nova referência');
    assert.equal(prev.status, 'Pending', 'prev.status não pode ser mutado');
    assert.equal(prev.signedDocumentRef, null, 'prev.signedDocumentRef não pode ser mutado');
  });

  it('CTR-DOMAIN-STATE-MACHINE-AMENDMENT — AmendmentUpdate é tipo vazio (Record<never, never>)', () => {
    // AmendmentUpdate = Readonly<Record<never, never>> — nenhum campo mutável por patch.
    // A proteção real contra mudança de estado via updateAmendment é estrutural:
    // as assinaturas de attachSignedDocument e homologate exigem subtipos refinados
    // (testado via @ts-expect-error no bloco CA3 abaixo). updateAmendment com patch
    // vazio é o único uso legítimo — prova que a chamada compila e retorna frozen.
    const prev = createAddition();
    const next = updateAmendment(prev, {});
    assert.equal(Object.isFrozen(next), true, 'AmendmentUpdate({}) deve retornar frozen');
    assert.equal(next.status, 'Pending', 'status preservado — updateAmendment não muda estado');
  });

  it('CA-10 — Object.isFrozen(updateAmendment(a, {})) é true', () => {
    // Arrange
    const prev = createAddition();
    // Act
    const next = updateAmendment(prev, {});
    // Assert
    assert.equal(Object.isFrozen(next), true, 'resultado de updateAmendment deve ser frozen');
  });

  it('preserva discriminated union — kind e variant não mudam', () => {
    // Arrange
    const prev = createAddition(500000);
    // Act
    const next = updateAmendment(prev, { signedDocumentRef: DocumentId.generate() });
    // Assert
    assert.equal(next.kind, 'Addition', 'kind deve ser preservado');
    if (next.kind === 'Addition' && prev.kind === 'Addition') {
      assert.equal(next.impactValue.cents, prev.impactValue.cents, 'variant deve ser preservado');
    } else {
      throw new Error('expected Addition kind in both prev and next');
    }
    assert.notEqual(next.signedDocumentRef, null, 'signedDocumentRef deve ter sido aplicado');
  });
});

// ============================================================================
// CTR-DOMAIN-STATE-MACHINE-AMENDMENT — W0 RED
// Refinement constructors: parsePending, parsePendingWithoutDocument,
// parsePendingWithDocument (substituem assertPending — DON'T D§19/§23)
// ============================================================================

// ─── CA2 — Amendment.parsePending ───────────────────────────────────────────

describe('Amendment.parsePending — happy path (CA2)', () => {
  it('retorna ok para PendingWithoutDocument (status Pending, sem doc)', () => {
    // Arrange
    const a = createAddition(); // status Pending, signedDocumentRef null
    // Act — W0 RED: parsePending não existe → TypeError
    const r = Amendment.parsePending(a);
    // Assert
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    assert.equal(r.value.status, 'Pending');
  });

  it('retorna ok para PendingWithDocument (status Pending, com doc)', () => {
    // Arrange
    const a = createPendingWithDoc(); // status Pending, signedDocumentRef DocumentId
    // Act — W0 RED: parsePending não existe → TypeError
    const r = Amendment.parsePending(a);
    // Assert
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    assert.equal(r.value.status, 'Pending');
  });
});

describe('Amendment.parsePending — rejeições (CA2)', () => {
  it('retorna err(AmendmentNotPending) para Homologated', () => {
    // Arrange
    const a = createHomologated();
    // Act — W0 RED: parsePending não existe → TypeError
    const r = Amendment.parsePending(a);
    // Assert
    assert.equal(isErr(r), true);
    if (r.ok) return;
    assert.equal(r.error.tag, 'AmendmentNotPending');
    if (r.error.tag === 'AmendmentNotPending') {
      assert.equal(r.error.currentStatus, 'Homologated');
    }
  });
});

// ─── CA2(b) — Amendment.parsePendingWithoutDocument ─────────────────────────

describe('Amendment.parsePendingWithoutDocument — happy path (CA2b)', () => {
  it('retorna ok para PendingWithoutDocument', () => {
    // Arrange
    const a = createAddition(); // Pending, sem doc
    // Act — W0 RED: parsePendingWithoutDocument não existe → TypeError
    const r = Amendment.parsePendingWithoutDocument(a);
    // Assert
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    assert.equal(r.value.status, 'Pending');
    assert.equal(r.value.signedDocumentRef, null);
  });
});

describe('Amendment.parsePendingWithoutDocument — rejeições (CA2b)', () => {
  it('retorna err(AmendmentDocumentAlreadyAttached) para PendingWithDocument', () => {
    // Arrange
    const a = createPendingWithDoc(); // Pending, com doc
    // Act — W0 RED: parsePendingWithoutDocument não existe → TypeError
    const r = Amendment.parsePendingWithoutDocument(a);
    // Assert
    assert.equal(isErr(r), true);
    if (r.ok) return;
    assert.equal(r.error.tag, 'AmendmentDocumentAlreadyAttached');
  });

  it('retorna err(AmendmentNotPending) para Homologated', () => {
    // Arrange
    const a = createHomologated();
    // Act — W0 RED: parsePendingWithoutDocument não existe → TypeError
    const r = Amendment.parsePendingWithoutDocument(a);
    // Assert
    assert.equal(isErr(r), true);
    if (r.ok) return;
    assert.equal(r.error.tag, 'AmendmentNotPending');
    if (r.error.tag === 'AmendmentNotPending') {
      assert.equal(r.error.currentStatus, 'Homologated');
    }
  });
});

// ─── CA2(c) — Amendment.parsePendingWithDocument ────────────────────────────

describe('Amendment.parsePendingWithDocument — happy path (CA2c)', () => {
  it('retorna ok para PendingWithDocument', () => {
    // Arrange
    const a = createPendingWithDoc(); // Pending, com doc
    // Act — W0 RED: parsePendingWithDocument não existe → TypeError
    const r = Amendment.parsePendingWithDocument(a);
    // Assert
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    assert.equal(r.value.status, 'Pending');
    assert.notEqual(r.value.signedDocumentRef, null);
  });
});

describe('Amendment.parsePendingWithDocument — rejeições (CA2c)', () => {
  it('retorna err(AmendmentWithoutSignedDocument) para PendingWithoutDocument', () => {
    // Arrange
    const a = createAddition(); // Pending, sem doc
    // Act — W0 RED: parsePendingWithDocument não existe → TypeError
    const r = Amendment.parsePendingWithDocument(a);
    // Assert
    assert.equal(isErr(r), true);
    if (r.ok) return;
    assert.equal(r.error.tag, 'AmendmentWithoutSignedDocument');
  });

  it('retorna err(AmendmentNotPending) para Homologated', () => {
    // Arrange
    const a = createHomologated();
    // Act — W0 RED: parsePendingWithDocument não existe → TypeError
    const r = Amendment.parsePendingWithDocument(a);
    // Assert
    assert.equal(isErr(r), true);
    if (r.ok) return;
    assert.equal(r.error.tag, 'AmendmentNotPending');
    if (r.error.tag === 'AmendmentNotPending') {
      assert.equal(r.error.currentStatus, 'Homologated');
    }
  });
});

// ─── CA1 runtime — discriminador composto ────────────────────────────────────

describe('Amendment — discriminador composto (CA1 runtime)', () => {
  it("'signedDocumentRef' está presente em PendingWithoutDocument mas é null", () => {
    // Arrange
    const a = createAddition();
    // Assert — o campo existe no objeto (in operator), mas tem valor null
    assert.equal('signedDocumentRef' in a, true, 'campo signedDocumentRef deve existir no objeto');
    assert.equal(a.signedDocumentRef, null, 'valor deve ser null em PendingWithoutDocument');
  });

  it("'signedDocumentRef' está presente em PendingWithDocument e é DocumentId", () => {
    // Arrange
    const a = createPendingWithDoc();
    // Assert
    assert.equal('signedDocumentRef' in a, true);
    assert.notEqual(a.signedDocumentRef, null, 'valor deve ser DocumentId em PendingWithDocument');
  });

  it('HomologatedAmendment tem signedDocumentRef, homologatedAt e homologatedBy não-null', () => {
    // Arrange
    const a = createHomologated();
    // Assert — todos os 3 campos terminais presentes com valores não-null
    assert.notEqual(
      a.signedDocumentRef,
      null,
      'signedDocumentRef deve ser DocumentId em Homologated',
    );
    assert.notEqual(a.homologatedAt, null, 'homologatedAt deve ser Date em Homologated');
    assert.notEqual(a.homologatedBy, null, 'homologatedBy deve ser UserRef em Homologated');
  });
});

// ─── CA3 — traves estáticas (ativadas em W1) ────────────────────────────────

describe('Amendment — traves estáticas de tipo (CA3)', () => {
  it('TS rejeita homologate(PendingWithoutDocument) em compile time', () => {
    // createAddition() retorna PendingWithoutDocumentAmendment após W1.
    const a = createAddition();
    // @ts-expect-error — PendingWithoutDocumentAmendment não é atribuível a PendingWithDocumentAmendment
    Amendment.homologate(a, userRef(), new Date('2026-04-01'));
  });

  it('TS rejeita attachSignedDocument(HomologatedAmendment) em compile time', () => {
    // createHomologated() retorna HomologatedAmendment após W1.
    const a = createHomologated();
    // @ts-expect-error — HomologatedAmendment não é atribuível a PendingWithoutDocumentAmendment
    Amendment.attachSignedDocument(a, DocumentId.generate());
  });
});

// ============================================================================
// CTR-DOMAIN-INVARIANT-CONTEXTUAL — CA3 estática: NonZeroMoney em Amendment.create
// ============================================================================

describe('Amendment.create — CA3 estática (NonZeroMoney em impactValue)', () => {
  it('TS rejeita Amendment.create({ kind: Addition, impactValue: Money }) em compile time', () => {
    // Arrange — money(500000) retorna Money (não NonZeroMoney).
    const rawMoney = money(500000);

    // W0 RED: Em W0, Amendment.create ainda aceita Money cru (types.ts usa impactValue: Money).
    //         Portanto @ts-expect-error fica acima de uma linha SEM erro de tipo → o
    //         compilador emite "Unused @ts-expect-error directive" → é exatamente o RED esperado.
    //
    // W1 GREEN: Após types.ts mudar CreateAmendmentInput para impactValue: NonZeroMoney,
    //           o @ts-expect-error passa a suprimir o erro real
    //           "Type 'Money' is not assignable to type 'NonZeroMoney'" → teste verde.
    //
    Amendment.create({
      ...baseInput(),
      kind: 'Addition',
      // @ts-expect-error — Money não é assignable a NonZeroMoney (CA3 — rota α DO D§25).
      impactValue: rawMoney,
    });

    // Nota: não há assert de runtime aqui — a verificação é puramente estática.
    // O comportamento em runtime depende do state: em W0 a chamada pode retornar
    // ok ou err dependendo do valor; em W1 a linha não compila sem @ts-expect-error.
    assert.ok(true, 'CA3: verificação estática via @ts-expect-error — ver comentário acima');
  });
});
