/**
 * FIN-SUPPLIER-VIEW-BACKFILL · W0 — popula o read-model com fornecedores legados (US2 #47).
 * DEVE FALHAR até existir `backfillSupplierViews` (lógica pura, testável com store in-memory).
 */
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk } from '#src/shared/index.ts';
import { createInMemorySupplierViewStore } from '#src/modules/financial/adapters/persistence/repos/supplier-view-store.in-memory.ts';
import { backfillSupplierViews } from '#src/jobs/financial/supplier-view-backfill/backfill.ts';

const OLD = new Date('2000-01-01T00:00:00.000Z');
const records = [
  { supplierRef: 'a', name: 'Fornecedor A', document: '11222333000181' },
  { supplierRef: 'b', name: 'Fornecedor B', document: '11444777000161' },
];

describe('backfillSupplierViews', () => {
  it('popula o read-model a partir dos fornecedores existentes', async () => {
    const store = createInMemorySupplierViewStore();
    const r = await backfillSupplierViews(records, store, OLD);
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value.applied, 2);
    const a = await store.get('a');
    if (a.ok) assert.equal(a.value?.name, 'Fornecedor A');
  });

  it('re-execução é idempotente (não duplica nem corrompe)', async () => {
    const store = createInMemorySupplierViewStore();
    await backfillSupplierViews(records, store, OLD);
    const r = await backfillSupplierViews(records, store, OLD);
    assert.equal(isOk(r), true);
    const b = await store.get('b');
    if (b.ok) assert.equal(b.value?.name, 'Fornecedor B');
  });

  it('NÃO regride um evento real mais novo (guard de occurredAt antigo)', async () => {
    const store = createInMemorySupplierViewStore();
    await store.upsert({
      supplierRef: 'a',
      name: 'Atualizado por evento',
      document: '99999999000199',
      occurredAt: new Date('2026-06-16T12:00:00.000Z'),
    });
    await backfillSupplierViews(
      [{ supplierRef: 'a', name: 'Legado (backfill)', document: '11222333000181' }],
      store,
      OLD,
    );
    const a = await store.get('a');
    if (a.ok) {
      assert.equal(a.value?.name, 'Atualizado por evento');
      assert.equal(a.value?.document, '99999999000199');
    }
  });
});
