/**
 * FIN-TIMELINE-CHANGES-BOUNDS — W0 RED (#54, ADR-0027 contract-first).
 *
 * O response schema da trilha deve espelhar os bounds de coluna do banco:
 * `changes.field` é `varchar(60)` → `.max(60)`; `changes.before`/`after` são `text` → `.max(65535)`.
 * RED enquanto os campos forem `z.string()` irrestritos (61/65536 chars passam hoje).
 *
 * É response schema (saída do banco): os casos "aceito" garantem que nenhum dado válido
 * existente (≤ limites do banco) passa a ser rejeitado (CA4).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { timelineEntrySchema } from '#src/modules/financial/adapters/http/schemas.ts';

const baseEntry = {
  eventType: 'DocumentSaved',
  target: { kind: 'Document', id: '11111111-1111-4111-8111-111111111111' },
  occurredAt: '2026-06-16T12:00:00.000Z',
  actor: null,
  reason: null,
  changes: [{ field: 'netValueCents', before: null, after: '1000' }],
} as const;

const withChange = (change: { field: string; before: string | null; after: string | null }) => ({
  ...baseEntry,
  changes: [change],
});

describe('timelineEntrySchema.changes — bounds espelham o storage (#54)', () => {
  it('aceita uma entrada válida (sanity)', () => {
    assert.ok(timelineEntrySchema.safeParse(baseEntry).success);
  });

  it('field com 60 chars (limite varchar(60)) é aceito', () => {
    const entry = withChange({ field: 'a'.repeat(60), before: null, after: null });
    assert.ok(timelineEntrySchema.safeParse(entry).success);
  });

  it('field com 61 chars é rejeitado (.max(60))', () => {
    const entry = withChange({ field: 'a'.repeat(61), before: null, after: null });
    assert.ok(!timelineEntrySchema.safeParse(entry).success);
  });

  it('before com 65535 chars (limite TEXT) é aceito', () => {
    const entry = withChange({ field: 'f', before: 'x'.repeat(65535), after: null });
    assert.ok(timelineEntrySchema.safeParse(entry).success);
  });

  it('before com 65536 chars é rejeitado (.max(65535))', () => {
    const entry = withChange({ field: 'f', before: 'x'.repeat(65536), after: null });
    assert.ok(!timelineEntrySchema.safeParse(entry).success);
  });

  it('after com 65535 chars (limite TEXT) é aceito', () => {
    const entry = withChange({ field: 'f', before: null, after: 'x'.repeat(65535) });
    assert.ok(timelineEntrySchema.safeParse(entry).success);
  });

  it('after com 65536 chars é rejeitado (.max(65535))', () => {
    const entry = withChange({ field: 'f', before: null, after: 'x'.repeat(65536) });
    assert.ok(!timelineEntrySchema.safeParse(entry).success);
  });
});

// #823 / #406 — os marcos de remessa e conciliação chegam ao web-app pela MESMA resposta: o `z.enum`
// deriva de `TIMELINE_EVENT_TYPES`, e é ele que o BFF valida. Um tipo que o schema recusasse faria
// o GET da trilha falhar inteiro no primeiro título transmitido.
describe('timelineEntrySchema.eventType — remessa e conciliação (#823/#406)', () => {
  const payableEntry = (eventType: string, changes: readonly object[], reason: string | null) => ({
    ...baseEntry,
    eventType,
    target: { kind: 'Payable', id: '22222222-2222-4222-8222-222222222222' },
    actor: '33333333-3333-4333-8333-333333333333',
    reason,
    changes,
  });

  it('PayableTransmitted com status, NSA e your_number', () => {
    const entry = payableEntry(
      'PayableTransmitted',
      [
        { field: 'status', before: 'Approved', after: 'Transmitted' },
        { field: 'remittanceNsa', before: null, after: '42' },
        { field: 'remittanceYourNumber', before: null, after: 'YN0000000042' },
      ],
      null,
    );
    assert.ok(timelineEntrySchema.safeParse(entry).success);
  });

  it('PayableReconciled e ReconciliationUndone (com motivo)', () => {
    const reconciled = payableEntry(
      'PayableReconciled',
      [{ field: 'status', before: 'Paid', after: 'Reconciled' }],
      null,
    );
    const undone = payableEntry(
      'ReconciliationUndone',
      [{ field: 'status', before: 'Reconciled', after: 'Paid' }],
      'conciliado no título errado',
    );
    assert.ok(timelineEntrySchema.safeParse(reconciled).success);
    assert.ok(timelineEntrySchema.safeParse(undone).success);
  });

  it('o descarte de remessa segue fora da trilha', () => {
    const entry = payableEntry('PayableTransmissionDiscarded', [], 'x');
    assert.ok(!timelineEntrySchema.safeParse(entry).success);
  });
});
