import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as DisableReason from '#src/modules/partners/domain/collaborator/disable-reason.ts';

// PARTNERS-DISABLE-REASON-LEGACY-MARKER: 'LEGACY_MIGRATION' é marcador de proveniência
// de ETL (D10) — distinto dos 4 motivos de negócio. Decisão do especialista de domínio.

describe('DisableReason.parse', () => {
  it('aceita o marcador de backfill LEGACY_MIGRATION', () => {
    const r = DisableReason.parse('LEGACY_MIGRATION');
    assert.ok(r.ok, "esperava 'LEGACY_MIGRATION' válido");
    if (r.ok) assert.equal(r.value, 'LEGACY_MIGRATION');
  });

  it('mantém os 4 motivos de negócio legados', () => {
    for (const v of [
      'DESLIGAMENTO_ABC',
      'FALECIMENTO',
      'TEMPO_CONTRATO_FINALIZADO',
      'SOLICITACAO_RESCISAO_CONTRATUAL',
    ]) {
      assert.ok(DisableReason.parse(v).ok, `${v} deve continuar válido`);
    }
  });

  it('rejeita valor desconhecido', () => {
    assert.ok(!DisableReason.parse('legacy-migration').ok, 'kebab não é o valor canônico');
    assert.ok(!DisableReason.parse('QUALQUER').ok);
  });
});
