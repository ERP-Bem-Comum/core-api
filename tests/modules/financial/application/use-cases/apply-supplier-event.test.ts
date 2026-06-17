/**
 * FIN-SUPPLIER-VIEW-APPLY · W0 — aplicação de evento de fornecedor no read-model (US2 #47).
 *
 * `applySupplierEvent({ store })({ eventType, payload })`: filtra `SupplierRegistered`/`SupplierEdited`
 * (demais → skip/ok), parseia o payload de integração (ADR-0043) e faz `store.upsert` (o guard de
 * recência vive no store). Payload malformado → erro (worker faz retry/DLQ).
 *
 * DEVE FALHAR em W0 (`apply-supplier-event.ts` inexistente).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk, isErr } from '#src/shared/index.ts';
import { createInMemorySupplierViewStore } from '#src/modules/financial/adapters/persistence/repos/supplier-view-store.in-memory.ts';
import { applySupplierEvent } from '#src/modules/financial/application/use-cases/apply-supplier-event.ts';

const REF = '11111111-1111-4111-8111-111111111111';
const payload = (over: Record<string, unknown> = {}): string =>
  JSON.stringify({
    supplierRef: REF,
    name: 'Gráfica Boa Impressão',
    document: '11222333000181',
    occurredAt: '2026-06-16T12:00:00.000Z',
    ...over,
  });

describe('applySupplierEvent', () => {
  it('SupplierRegistered com payload válido popula o read-model', async () => {
    const store = createInMemorySupplierViewStore();
    const r = await applySupplierEvent({ store })({
      eventType: 'SupplierRegistered',
      payload: payload(),
    });
    assert.equal(isOk(r), true);
    const got = await store.get(REF);
    assert.equal(isOk(got), true);
    if (got.ok) {
      assert.equal(got.value?.name, 'Gráfica Boa Impressão');
      assert.equal(got.value?.document, '11222333000181');
    }
  });

  it('SupplierEdited posterior atualiza (snapshot novo)', async () => {
    const store = createInMemorySupplierViewStore();
    await applySupplierEvent({ store })({ eventType: 'SupplierRegistered', payload: payload() });
    await applySupplierEvent({ store })({
      eventType: 'SupplierEdited',
      payload: payload({
        name: 'Gráfica Boa Impressão — Filial',
        document: '11444777000161',
        occurredAt: '2026-06-16T13:00:00.000Z',
      }),
    });
    const got = await store.get(REF);
    if (got.ok) {
      assert.equal(got.value?.name, 'Gráfica Boa Impressão — Filial');
      assert.equal(got.value?.document, '11444777000161');
    }
  });

  it('eventType fora do contrato (SupplierDeactivated) → ok, sem escrita', async () => {
    const store = createInMemorySupplierViewStore();
    const r = await applySupplierEvent({ store })({
      eventType: 'SupplierDeactivated',
      payload: payload(),
    });
    assert.equal(isOk(r), true);
    const got = await store.get(REF);
    if (got.ok) assert.equal(got.value, null);
  });

  it('payload JSON malformado → erro', async () => {
    const store = createInMemorySupplierViewStore();
    const r = await applySupplierEvent({ store })({
      eventType: 'SupplierRegistered',
      payload: '{ not json',
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'supplier-event-payload-invalid');
  });

  it('payload com shape inválido (faltando document) → erro', async () => {
    const store = createInMemorySupplierViewStore();
    const r = await applySupplierEvent({ store })({
      eventType: 'SupplierRegistered',
      payload: JSON.stringify({
        supplierRef: REF,
        name: 'X',
        occurredAt: '2026-06-16T12:00:00.000Z',
      }),
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'supplier-event-payload-invalid');
  });

  it('idempotente: aplicar o mesmo evento 2× mantém o estado', async () => {
    const store = createInMemorySupplierViewStore();
    await applySupplierEvent({ store })({ eventType: 'SupplierRegistered', payload: payload() });
    await applySupplierEvent({ store })({ eventType: 'SupplierRegistered', payload: payload() });
    const got = await store.get(REF);
    if (got.ok) assert.equal(got.value?.name, 'Gráfica Boa Impressão');
  });
});
