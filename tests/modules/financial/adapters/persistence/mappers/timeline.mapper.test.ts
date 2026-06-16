/**
 * FIN-TIMELINE-MODEL-TIDY — defesa de leitura do event_type (#56b).
 *
 * A trilha só carrega TIMELINE_EVENT_TYPES (sem `DocumentCancelled`, inalcançável por design).
 * O CHECK do banco barra a escrita; o mapper é a defesa em profundidade na leitura: uma row
 * com `event_type='DocumentCancelled'` (corrupção) é rejeitada como estado inválido.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { mapRowToTimelineEntry } from '#src/modules/financial/adapters/persistence/mappers/timeline.mapper.ts';
import type { TimelineEntryRow } from '#src/modules/financial/adapters/persistence/schemas/mysql.ts';

const baseRow: TimelineEntryRow = {
  id: '11111111-1111-4111-8111-111111111111',
  eventId: '22222222-2222-4222-8222-222222222222',
  documentId: '33333333-3333-4333-8333-333333333333',
  targetKind: 'Document',
  targetId: '33333333-3333-4333-8333-333333333333',
  eventType: 'DocumentSaved',
  occurredAt: new Date('2026-06-16T12:00:00.000Z'),
  actorRef: null,
};

describe('mapRowToTimelineEntry — defesa de event_type da trilha (#56b)', () => {
  it('aceita um event_type válido da trilha (DocumentSaved)', () => {
    const r = mapRowToTimelineEntry({ entryRow: { ...baseRow }, changeRows: [] });
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value.eventType, 'DocumentSaved');
  });

  it('rejeita event_type=DocumentCancelled → timeline-invalid-event-type', () => {
    const r = mapRowToTimelineEntry({
      entryRow: { ...baseRow, eventType: 'DocumentCancelled' },
      changeRows: [],
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'timeline-invalid-event-type');
  });
});
