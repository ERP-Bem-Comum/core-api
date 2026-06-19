import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

// W0 RED (#159 caminho A): o VO EntryType ainda não existe. Conjunto canônico = spec 017
// data-model.md:37 (10 valores). `normalize` mapeia bruto→canônico (fallback 'Other');
// `rehydrate` rejeita valor fora do union vindo do banco.
import * as EntryType from '#src/modules/financial/domain/statement/entry-type.ts';

const CANONICAL: readonly EntryType.EntryType[] = [
  'PIX',
  'TED',
  'DOC',
  'Fee',
  'Boleto',
  'DARF',
  'Investment',
  'Redemption',
  'Transfer',
  'Other',
];

describe('financial/domain/statement/entry-type', () => {
  it('VALUES expõe exatamente os 10 valores canônicos da spec 017', () => {
    assert.deepEqual([...EntryType.VALUES].sort(), [...CANONICAL].sort());
  });

  it('CA1: bruto desconhecido ou vazio → Other', () => {
    assert.equal(EntryType.normalize('XPTO'), 'Other');
    assert.equal(EntryType.normalize(''), 'Other');
    assert.equal(EntryType.normalize('   '), 'Other');
  });

  it('CA2: mapeia siglas/sinônimos do banco para o canônico (caixa exata)', () => {
    // siglas BR — preservam a caixa canônica (data-model.md:96)
    assert.equal(EntryType.normalize('PIX'), 'PIX');
    assert.equal(EntryType.normalize('pix'), 'PIX');
    assert.equal(EntryType.normalize('TED'), 'TED');
    assert.equal(EntryType.normalize('DOC'), 'DOC');
    assert.equal(EntryType.normalize('DARF'), 'DARF');
    assert.equal(EntryType.normalize('BOLETO'), 'Boleto');
    // sinônimos OFX/CSV → canônico Capitalizado
    assert.equal(EntryType.normalize('FEE'), 'Fee');
    assert.equal(EntryType.normalize('SRVCHG'), 'Fee');
    assert.equal(EntryType.normalize('TARIFA'), 'Fee');
    assert.equal(EntryType.normalize('XFER'), 'Transfer');
    assert.equal(EntryType.normalize('TRANSFER'), 'Transfer');
    assert.equal(EntryType.normalize('TRANSFERENCIA'), 'Transfer');
    assert.equal(EntryType.normalize('RESGATE'), 'Redemption');
  });

  it('valor já canônico sobrevive a normalize (idempotência)', () => {
    for (const v of CANONICAL) {
      assert.equal(EntryType.normalize(v), v);
    }
  });

  it('rehydrate aceita cada valor canônico do union', () => {
    for (const v of CANONICAL) {
      const r = EntryType.rehydrate(v);
      assert.equal(r.ok, true);
      if (r.ok) assert.equal(r.value, v);
    }
  });

  it('CA4 (base): rehydrate rejeita valor fora do union → invalid-entry-type', () => {
    for (const raw of ['XPTO', '', 'fee', 'pix', 'OTHER']) {
      const r = EntryType.rehydrate(raw);
      assert.equal(r.ok, false);
      if (!r.ok) assert.equal(r.error, 'invalid-entry-type');
    }
  });
});
