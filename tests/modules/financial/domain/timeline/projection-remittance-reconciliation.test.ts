// #823 / #406 — projeções PURAS dos marcos de remessa e conciliação na trilha do título.
//
// O que se fixa aqui é o CONTRATO que o web-app lê: nomes de campo (`status`, `remittanceNsa`,
// `remittanceYourNumber`), status em EN, alvo sempre o TÍTULO, autor e motivo onde existem.
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import type { UserRef } from '#src/shared/kernel/user-ref.ts';
import type { DocumentId } from '#src/modules/financial/domain/shared/document-id.ts';
import type { PayableId } from '#src/modules/financial/domain/shared/payable-id.ts';
import {
  projectReconciliationStatus,
  projectTransmission,
} from '#src/modules/financial/domain/timeline/projection.ts';
import { TIMELINE_EVENT_TYPES } from '#src/modules/financial/domain/document/events.ts';

const DOC = '11111111-1111-4111-8111-111111111111' as DocumentId;
const PAYABLE = '22222222-2222-4222-8222-222222222222' as PayableId;
const ACTOR = '33333333-3333-4333-8333-333333333333' as UserRef;
const AT = new Date('2026-10-19T12:00:00.000Z');

describe('#823 — projectTransmission (marco "Transmitido" na trilha do título)', () => {
  const entry = projectTransmission({
    eventId: 'ev-1',
    documentId: DOC,
    payableId: PAYABLE,
    nsa: 42,
    yourNumber: 'YN0000000042',
    actor: ACTOR,
    occurredAt: AT,
  });

  it('alvo é o TÍTULO — nunca o documento (a nota pode ter saído em parte)', () => {
    assert.deepEqual(entry.target, { kind: 'Payable', id: PAYABLE });
    assert.equal(entry.documentId, DOC);
    assert.equal(entry.eventType, 'PayableTransmitted');
  });

  it('carrega Approved → Transmitted, o NSA da remessa e o your_number do título', () => {
    assert.deepEqual(entry.changes, [
      { field: 'status', before: 'Approved', after: 'Transmitted' },
      { field: 'remittanceNsa', before: null, after: '42' },
      { field: 'remittanceYourNumber', before: null, after: 'YN0000000042' },
    ]);
  });

  it('autor e instante de quem gerou; sem motivo', () => {
    assert.equal(entry.actor, ACTOR);
    assert.equal(entry.occurredAt, AT);
    assert.equal(entry.reason, null);
  });
});

describe('#406 — projectReconciliationStatus (conciliar / desfazer conciliação)', () => {
  it('conciliar: Paid → Reconciled, autor de quem conciliou, sem motivo', () => {
    const entry = projectReconciliationStatus({
      eventType: 'PayableReconciled',
      eventId: 'ev-2',
      documentId: DOC,
      payableId: PAYABLE,
      statusBefore: 'Paid',
      statusAfter: 'Reconciled',
      actor: ACTOR,
      reason: null,
      occurredAt: AT,
    });
    assert.equal(entry.eventType, 'PayableReconciled');
    assert.deepEqual(entry.target, { kind: 'Payable', id: PAYABLE });
    assert.deepEqual(entry.changes, [{ field: 'status', before: 'Paid', after: 'Reconciled' }]);
    assert.equal(entry.actor, ACTOR);
    assert.equal(entry.reason, null);
  });

  it('desfazer: Reconciled → Paid, com o motivo informado', () => {
    const entry = projectReconciliationStatus({
      eventType: 'ReconciliationUndone',
      eventId: 'ev-3',
      documentId: DOC,
      payableId: PAYABLE,
      statusBefore: 'Reconciled',
      statusAfter: 'Paid',
      actor: ACTOR,
      reason: 'extrato importado em duplicidade',
      occurredAt: AT,
    });
    assert.equal(entry.eventType, 'ReconciliationUndone');
    assert.deepEqual(entry.changes, [{ field: 'status', before: 'Reconciled', after: 'Paid' }]);
    assert.equal(entry.reason, 'extrato importado em duplicidade');
  });

  it('status que não muda (2º parcial que não fecha) ainda é marco — só sem mudança de campo', () => {
    const entry = projectReconciliationStatus({
      eventType: 'PayableReconciled',
      eventId: 'ev-4',
      documentId: DOC,
      payableId: PAYABLE,
      statusBefore: 'PartiallyReconciled',
      statusAfter: 'PartiallyReconciled',
      actor: null,
      reason: null,
      occurredAt: AT,
    });
    assert.deepEqual(entry.changes, []);
  });
});

describe('#823 / #406 — os três marcos são aceitos na trilha', () => {
  it('TIMELINE_EVENT_TYPES lista transmissão, conciliação e desfazimento; o descarte segue fora', () => {
    for (const t of ['PayableTransmitted', 'PayableReconciled', 'ReconciliationUndone']) {
      assert.ok((TIMELINE_EVENT_TYPES as readonly string[]).includes(t), t);
    }
    assert.ok(
      !(TIMELINE_EVENT_TYPES as readonly string[]).includes('PayableTransmissionDiscarded'),
    );
  });
});
