/**
 * PAR-SUPPLIER-EVENTS · W0 — use case publica eventos de fornecedor no outbox.
 *
 * `registerSupplier` → 1 `SupplierRegistered` no outbox com supplierRef/name/document.
 * `editSupplier` (qualquer edição) → 1 `SupplierEdited` com snapshot pós-edição.
 * `deactivate`/`reactivate` → nada publicado (filtrados — ADR-0043).
 *
 * Repo in-memory com outbox in-memory injetado (espelha o padrão do financial
 * `createInMemoryDocumentRepository(timelineStore?)`).
 *
 * DEVE FALHAR em W0 (assinatura `save(supplier, events)` + outbox injetável inexistentes).
 */

import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk } from '#src/shared/index.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import * as PlainDate from '#src/shared/kernel/plain-date.ts';
import { makeInMemorySupplierStore } from '#src/modules/partners/adapters/persistence/repos/supplier-repository.in-memory.ts';
import { InMemoryOutbox } from '#src/modules/partners/adapters/outbox/outbox.in-memory.ts';
import { registerSupplier } from '#src/modules/partners/application/use-cases/register-supplier.ts';
import { editSupplier } from '#src/modules/partners/application/use-cases/edit-supplier.ts';
import { deactivateSupplier } from '#src/modules/partners/application/use-cases/deactivate-supplier.ts';
import { reactivateSupplier } from '#src/modules/partners/application/use-cases/reactivate-supplier.ts';

const NOW = new Date('2026-06-16T21:00:00.000Z');
const clock: Clock = { now: () => NOW, today: () => PlainDate.fromDate(NOW) };

let outbox: ReturnType<typeof InMemoryOutbox>;
let store: ReturnType<typeof makeInMemorySupplierStore>;

const validCmd = (cnpj = '11.222.333/0001-81') => ({
  name: 'Gráfica Boa Impressão',
  email: 'contato@boaimpressao.com.br',
  cnpj,
  corporateName: 'Boa Impressão Gráfica LTDA',
  fantasyName: 'Boa Impressão',
  serviceCategory: 'GRAFICA',
  bankAccount: { bank: '001', agency: '1234', accountNumber: '56789', checkDigit: '0' },
  pixKey: null,
});

beforeEach(() => {
  outbox = InMemoryOutbox();
  store = makeInMemorySupplierStore(outbox);
});

const payloadOf = (eventType: string): Record<string, unknown> => {
  const row = outbox.all().find((r) => r.eventType === eventType);
  assert.ok(row !== undefined, `outbox row ${eventType} ausente`);
  return JSON.parse(row.payload) as Record<string, unknown>;
};

describe('registerSupplier publica SupplierRegistered', () => {
  it('1 evento SupplierRegistered com supplierRef/name/document', async () => {
    const r = await registerSupplier({ supplierRepo: store.repository, clock })(validCmd());
    assert.equal(isOk(r), true);
    if (!r.ok) return;

    const published = outbox.all();
    assert.equal(published.length, 1);
    const row = published[0];
    assert.ok(row !== undefined);
    assert.equal(row.eventType, 'SupplierRegistered');
    assert.equal(row.aggregateType, 'Supplier');
    assert.equal(row.aggregateId, String(r.value.supplier.id));

    const payload = payloadOf('SupplierRegistered');
    assert.equal(payload['supplierRef'], String(r.value.supplier.id));
    assert.equal(payload['name'], 'Gráfica Boa Impressão');
    assert.equal(payload['document'], '11222333000181');
    assert.equal(payload['occurredAt'], NOW.toISOString());
  });
});

describe('editSupplier publica SupplierEdited (snapshot pós-edição)', () => {
  it('qualquer edição publica 1 SupplierEdited com valores novos', async () => {
    const reg = await registerSupplier({ supplierRepo: store.repository, clock })(validCmd());
    assert.equal(isOk(reg), true);
    if (!reg.ok) return;
    const id = reg.value.supplier.id as unknown as string;
    outbox.clear();

    const edit = await editSupplier({ supplierRepo: store.repository, clock })({
      supplierId: id,
      canEditSensitive: false,
      ...validCmd(),
      name: 'Gráfica Boa Impressão — Filial',
    });
    assert.equal(isOk(edit), true);
    if (!edit.ok) return;

    const published = outbox.all();
    assert.equal(published.length, 1);
    assert.equal(published[0]?.eventType, 'SupplierEdited');

    const payload = payloadOf('SupplierEdited');
    assert.equal(payload['supplierRef'], id);
    assert.equal(payload['name'], 'Gráfica Boa Impressão — Filial');
    assert.equal(payload['document'], '11222333000181');
  });

  it('edição de CNPJ (canEditSensitive) reflete o novo document no payload', async () => {
    const reg = await registerSupplier({ supplierRepo: store.repository, clock })(validCmd());
    assert.equal(isOk(reg), true);
    if (!reg.ok) return;
    const id = reg.value.supplier.id as unknown as string;
    outbox.clear();

    const edit = await editSupplier({ supplierRepo: store.repository, clock })({
      supplierId: id,
      canEditSensitive: true,
      ...validCmd('11.444.777/0001-61'),
    });
    assert.equal(isOk(edit), true);
    if (!edit.ok) return;

    const published = outbox.all();
    assert.equal(published.length, 1);
    assert.equal(published[0]?.eventType, 'SupplierEdited');

    const payload = payloadOf('SupplierEdited');
    assert.equal(payload['supplierRef'], id);
    assert.equal(payload['document'], '11444777000161');
  });
});

describe('deactivate/reactivate NÃO publicam (filtrados — ADR-0043)', () => {
  it('deactivate não publica evento', async () => {
    const reg = await registerSupplier({ supplierRepo: store.repository, clock })(validCmd());
    if (!reg.ok) return;
    const id = reg.value.supplier.id as unknown as string;
    outbox.clear();

    const r = await deactivateSupplier({ supplierRepo: store.repository, clock })({
      supplierId: id,
    });
    assert.equal(isOk(r), true);
    assert.equal(outbox.all().length, 0);
  });

  it('reactivate não publica evento', async () => {
    const reg = await registerSupplier({ supplierRepo: store.repository, clock })(validCmd());
    if (!reg.ok) return;
    const id = reg.value.supplier.id as unknown as string;
    await deactivateSupplier({ supplierRepo: store.repository, clock })({ supplierId: id });
    outbox.clear();

    const r = await reactivateSupplier({ supplierRepo: store.repository, clock })({
      supplierId: id,
    });
    assert.equal(isOk(r), true);
    assert.equal(outbox.all().length, 0);
  });
});
