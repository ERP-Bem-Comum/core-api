import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

// W0 RED (#292): catálogo de metadados por tipo ainda não existe.
import {
  metadataFor,
  allMetadata,
} from '#src/modules/financial/domain/document/document-type-metadata.ts';
import type { DocumentType } from '#src/modules/financial/domain/document/types.ts';

const ALL_TYPES: readonly DocumentType[] = [
  'NFS-e',
  'DANFE',
  'RPA',
  'Fatura',
  'Boleto',
  'Recibo',
  'Imposto',
];
const sorted = (xs: readonly string[]): readonly string[] => [...xs].sort();
const FOUR = ['CSRF', 'INSS', 'IRRF', 'ISS'];

describe('financial/domain/document/document-type-metadata — catálogo por tipo (#292)', () => {
  it('CA1: NFS-e → 4 retenções (ISS/IRRF/INSS/CSRF), accessKey não obrigatório', () => {
    const m = metadataFor('NFS-e');
    assert.deepEqual(sorted(m.allowedRetentions), FOUR);
    assert.equal(m.accessKeyRequired, false);
  });

  it('CA2: DANFE → sem retenções, accessKey obrigatório', () => {
    const m = metadataFor('DANFE');
    assert.deepEqual([...m.allowedRetentions], []);
    assert.equal(m.accessKeyRequired, true);
  });

  it('CA3: Boleto → sem retenções, forma de pagamento sugerida = Boleto', () => {
    const m = metadataFor('Boleto');
    assert.deepEqual([...m.allowedRetentions], []);
    assert.equal(m.suggestedPaymentMethod, 'Boleto');
  });

  it('CA4: Imposto → forma de pagamento sugerida = GuiaRecolhimento', () => {
    assert.equal(metadataFor('Imposto').suggestedPaymentMethod, 'GuiaRecolhimento');
  });

  it('CA4b: RPA → 4 retenções (igual NFS-e)', () => {
    assert.deepEqual(sorted(metadataFor('RPA').allowedRetentions), FOUR);
  });

  it('CA: tipos sem retenção/accessKey (Fatura/Recibo) → vazio + accessKey não obrigatório', () => {
    for (const t of ['Fatura', 'Recibo'] as const) {
      const m = metadataFor(t);
      assert.deepEqual([...m.allowedRetentions], []);
      assert.equal(m.accessKeyRequired, false);
      assert.equal(m.suggestedPaymentMethod, null);
    }
  });

  it('CA5: allMetadata cobre os 7 tipos, sem faltar nem duplicar', () => {
    const types = allMetadata().map((m) => m.type);
    assert.equal(types.length, 7);
    assert.deepEqual(sorted(types), sorted(ALL_TYPES));
  });
});
