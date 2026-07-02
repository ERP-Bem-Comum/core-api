/**
 * ETL-FINANCIAL-WRITER — semântica do FinancialEtlStore (par InMemory do drizzle):
 * mark BLINDADO (nunca sobrescreve correlação; legacy_id duplicado → conflict) e
 * adoção de órfão (janela save→mark de run parcial — W2 issue 1/4).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  createInMemoryFinancialEtlStore,
  type InMemoryEtlDocument,
} from '#src/modules/financial/adapters/persistence/repos/financial-etl-store.in-memory.ts';

const doc = (over: Partial<InMemoryEtlDocument> = {}): InMemoryEtlDocument => ({
  id: 'doc-1',
  status: 'Open',
  version: 0,
  documentNumber: 'NF-1',
  supplierRef: 'sup-1',
  grossValueCents: 50000,
  legacyId: null,
  ...over,
});

describe('FinancialEtlStore (in-memory) — correlação legado↔novo', () => {
  it('findDocumentByLegacyId: null quando não migrado; ref quando marcado', async () => {
    const store = createInMemoryFinancialEtlStore([doc({ legacyId: 7 })]);
    const missing = await store.findDocumentByLegacyId(99);
    assert.ok(missing.ok);
    assert.equal(missing.value, null);
    const found = await store.findDocumentByLegacyId(7);
    assert.ok(found.ok);
    assert.equal(found.value?.id, 'doc-1');
    assert.equal(found.value?.status, 'Open');
    assert.equal(found.value?.version, 0);
  });

  it('mark: grava correlação em doc sem legacy_id', async () => {
    const store = createInMemoryFinancialEtlStore([doc()]);
    const r = await store.markDocumentLegacyId('doc-1', 7);
    assert.ok(r.ok);
    assert.equal(store.documents.get('doc-1')?.legacyId, 7);
  });

  it('mark BLINDADO: doc já correlacionado → conflict (nunca sobrescreve)', async () => {
    const store = createInMemoryFinancialEtlStore([doc({ legacyId: 5 })]);
    const r = await store.markDocumentLegacyId('doc-1', 7);
    assert.ok(!r.ok);
    assert.equal(r.error, 'financial-etl-store-conflict');
    assert.equal(store.documents.get('doc-1')?.legacyId, 5);
  });

  it('mark BLINDADO: id inexistente → conflict (nunca no-op silencioso)', async () => {
    const store = createInMemoryFinancialEtlStore([]);
    const r = await store.markDocumentLegacyId('ghost', 7);
    assert.ok(!r.ok);
    assert.equal(r.error, 'financial-etl-store-conflict');
  });

  it('mark BLINDADO: legacy_id já usado por outro doc → conflict (UNIQUE)', async () => {
    const store = createInMemoryFinancialEtlStore([
      doc({ id: 'doc-1', legacyId: 7 }),
      doc({ id: 'doc-2', documentNumber: 'NF-2', legacyId: null }),
    ]);
    const r = await store.markDocumentLegacyId('doc-2', 7);
    assert.ok(!r.ok);
    assert.equal(r.error, 'financial-etl-store-conflict');
  });

  it('órfão (janela save→mark): match por document_number + supplier_ref sem legacy_id', async () => {
    const store = createInMemoryFinancialEtlStore([doc()]);
    const hit = await store.findOrphanCandidate('NF-1', 'sup-1', 50000);
    assert.ok(hit.ok);
    assert.equal(hit.value?.id, 'doc-1');
    // Depois de adotado (marcado), deixa de ser órfão.
    await store.markDocumentLegacyId('doc-1', 7);
    const gone = await store.findOrphanCandidate('NF-1', 'sup-1', 50000);
    assert.ok(gone.ok);
    assert.equal(gone.value, null);
  });

  it('órfão: número igual mas fornecedor diferente NÃO é adotado (refinamento anti-falso-positivo)', async () => {
    const store = createInMemoryFinancialEtlStore([doc({ supplierRef: 'sup-OUTRO' })]);
    const miss = await store.findOrphanCandidate('NF-1', 'sup-1', 50000);
    assert.ok(miss.ok);
    assert.equal(miss.value, null);
  });

  it('órfão: número+fornecedor iguais mas VALOR diferente NÃO é adotado (identifierCode repete 15/52)', async () => {
    const store = createInMemoryFinancialEtlStore([doc({ grossValueCents: 999 })]);
    const miss2 = await store.findOrphanCandidate('NF-1', 'sup-1', 50000);
    assert.ok(miss2.ok);
    assert.equal(miss2.value, null);
  });
});
