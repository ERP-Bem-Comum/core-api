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
