/**
 * PARTNERS-ETL-WRITE-PORT — InMemory do LegacyEntityStore (idempotência por legacy_id).
 * DEVE FALHAR em W0 (makeInMemoryLegacyEntityStore inexistente). Roda em `pnpm test`.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { makeInMemoryLegacyEntityStore } from '#src/modules/partners/adapters/persistence/repos/legacy-entity-store.in-memory.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import * as Supplier from '#src/modules/partners/domain/supplier/supplier.ts';
import * as SupplierId from '#src/modules/partners/domain/supplier/supplier-id.ts';
import type { Supplier as SupplierEntity } from '#src/modules/partners/domain/supplier/types.ts';

const clock = ClockFixed(new Date('2026-06-02T12:00:00.000Z'));

const buildSupplier = (cnpj: string): SupplierEntity => {
  const r = Supplier.register({
    id: SupplierId.generate(),
    name: 'Fornecedor X',
    email: 'contato@fornecedor.com.br',
    cnpj,
    corporateName: 'Fornecedor X LTDA',
    fantasyName: 'FX',
    serviceCategory: 'INFORMATICA',
    bankAccount: { bank: '001', agency: '0001-2', accountNumber: '123456', checkDigit: '7' },
    pixKey: null,
    registeredAt: clock.now(),
  });
  if (!r.ok) throw new Error(`fixture supplier: ${r.error}`);
  return r.value.supplier;
};

describe('makeInMemoryLegacyEntityStore', () => {
  const makeStore = () =>
    makeInMemoryLegacyEntityStore<SupplierEntity, SupplierId.SupplierId>((s) => s.id);

  it('provision de legacyId novo → created e findByLegacyId acha a ref', async () => {
    const store = makeStore();
    const s = buildSupplier('11222333000181');

    const r = await store.provision(s, 7);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value, 'created');

    const found = await store.findByLegacyId(7);
    assert.equal(found.ok, true);
    if (!found.ok) return;
    assert.equal(found.value, s.id);
  });

  it('re-provisionar mesmo legacyId → already-exists e NÃO sobrescreve a ref', async () => {
    const store = makeStore();
    const a = buildSupplier('11222333000181');
    const b = buildSupplier('11444777000161');

    const first = await store.provision(a, 42);
    assert.equal(first.ok && first.value === 'created', true);

    const second = await store.provision(b, 42);
    assert.equal(second.ok, true);
    if (!second.ok) return;
    assert.equal(second.value, 'already-exists');

    const found = await store.findByLegacyId(42);
    assert.equal(found.ok, true);
    if (!found.ok) return;
    assert.equal(found.value, a.id); // preserva o primeiro, não o segundo
  });

  it('findByLegacyId de legacyId ausente → null', async () => {
    const store = makeStore();
    const found = await store.findByLegacyId(999);
    assert.equal(found.ok, true);
    if (!found.ok) return;
    assert.equal(found.value, null);
  });
});
