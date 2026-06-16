/**
 * PAR-SUPPLIER-EVENTS · W0 — unit do mapper `supplierEventsToOutboxMessages`.
 *
 * Contrato de integração `partners → financial` (ADR-0043): só `SupplierRegistered`
 * e `SupplierEdited` viram OutboxMessage; `SupplierDeactivated`/`SupplierReactivated`
 * são filtrados (0 mensagens). Payload autocontido `{ supplierRef, name, document, occurredAt }`
 * montado a partir do agregado (snapshot). `eventId` = UUID v4 novo; `aggregateType` = 'Supplier'.
 *
 * DEVE FALHAR em W0 (supplierEventsToOutboxMessages inexistente).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isUuidV4 } from '#src/shared/utils/id.ts';
import * as Supplier from '#src/modules/partners/domain/supplier/supplier.ts';
import type { Supplier as SupplierAggregate } from '#src/modules/partners/domain/supplier/types.ts';
import type { SupplierEvent } from '#src/modules/partners/domain/supplier/events.ts';
import { supplierEventsToOutboxMessages } from '#src/modules/partners/adapters/persistence/mappers/supplier-outbox.mapper.ts';

const REGISTERED_AT = new Date('2026-06-16T21:00:00.000Z');

const buildActive = (cnpjRaw = '11222333000181'): SupplierAggregate => {
  const r = Supplier.register({
    id: '7f3a1234-5678-4abc-9def-fedcba987654' as never,
    name: 'Fornecedor X LTDA',
    email: 'contato@fornecedor.com.br',
    cnpj: cnpjRaw,
    corporateName: 'Fornecedor X LTDA',
    fantasyName: 'FX',
    serviceCategory: 'INFORMATICA',
    bankAccount: { bank: '001', agency: '0001-2', accountNumber: '123456', checkDigit: '7' },
    pixKey: null,
    registeredAt: REGISTERED_AT,
  });
  if (!r.ok) throw new Error(`fixture supplier: ${r.error}`);
  return r.value.supplier;
};

describe('supplierEventsToOutboxMessages', () => {
  it('SupplierRegistered → 1 OutboxMessage com payload de integração', () => {
    const supplier = buildActive();
    const event: SupplierEvent = {
      type: 'SupplierRegistered',
      supplierId: supplier.id,
      cnpj: supplier.cnpj,
      occurredAt: REGISTERED_AT,
    };

    const messages = supplierEventsToOutboxMessages([event], supplier);
    assert.equal(messages.length, 1);

    const m = messages[0];
    assert.ok(m !== undefined);
    assert.equal(m.aggregateType, 'Supplier');
    assert.equal(m.aggregateId, String(supplier.id));
    assert.equal(m.eventType, 'SupplierRegistered');
    assert.equal(m.occurredAt.getTime(), REGISTERED_AT.getTime());
    assert.equal(isUuidV4(m.eventId), true);

    const payload = JSON.parse(m.payload) as Record<string, unknown>;
    assert.equal(payload['supplierRef'], String(supplier.id));
    assert.equal(payload['name'], 'Fornecedor X LTDA');
    assert.equal(payload['document'], '11222333000181');
    assert.equal(payload['occurredAt'], REGISTERED_AT.toISOString());
  });

  it('SupplierEdited → 1 OutboxMessage com snapshot pós-edição', () => {
    const supplier = buildActive();
    const editedAt = new Date('2026-06-16T21:05:00.000Z');
    const event: SupplierEvent = {
      type: 'SupplierEdited',
      supplierId: supplier.id,
      occurredAt: editedAt,
    };

    const messages = supplierEventsToOutboxMessages([event], supplier);
    assert.equal(messages.length, 1);

    const m = messages[0];
    assert.ok(m !== undefined);
    assert.equal(m.eventType, 'SupplierEdited');
    assert.equal(m.occurredAt.getTime(), editedAt.getTime());

    const payload = JSON.parse(m.payload) as Record<string, unknown>;
    assert.equal(payload['supplierRef'], String(supplier.id));
    assert.equal(payload['name'], supplier.name);
    assert.equal(payload['document'], String(supplier.cnpj));
    assert.equal(payload['occurredAt'], editedAt.toISOString());
  });

  it('SupplierDeactivated → filtrado (0 mensagens)', () => {
    const supplier = buildActive();
    const event: SupplierEvent = {
      type: 'SupplierDeactivated',
      supplierId: supplier.id,
      occurredAt: new Date('2026-06-16T22:00:00.000Z'),
    };
    assert.equal(supplierEventsToOutboxMessages([event], supplier).length, 0);
  });

  it('SupplierReactivated → filtrado (0 mensagens)', () => {
    const supplier = buildActive();
    const event: SupplierEvent = {
      type: 'SupplierReactivated',
      supplierId: supplier.id,
      occurredAt: new Date('2026-06-16T23:00:00.000Z'),
    };
    assert.equal(supplierEventsToOutboxMessages([event], supplier).length, 0);
  });

  it('mistura → só publicáveis (Registered + Edited), filtra o resto', () => {
    const supplier = buildActive();
    const events: readonly SupplierEvent[] = [
      {
        type: 'SupplierRegistered',
        supplierId: supplier.id,
        cnpj: supplier.cnpj,
        occurredAt: REGISTERED_AT,
      },
      { type: 'SupplierDeactivated', supplierId: supplier.id, occurredAt: REGISTERED_AT },
      { type: 'SupplierEdited', supplierId: supplier.id, occurredAt: REGISTERED_AT },
      { type: 'SupplierReactivated', supplierId: supplier.id, occurredAt: REGISTERED_AT },
    ];
    const messages = supplierEventsToOutboxMessages(events, supplier);
    assert.equal(messages.length, 2);
    assert.deepEqual(
      messages.map((m) => m.eventType),
      ['SupplierRegistered', 'SupplierEdited'],
    );
    assert.notEqual(messages[0]?.eventId, messages[1]?.eventId);
  });

  it('eventIds únicos por mensagem', () => {
    const supplier = buildActive();
    const events: readonly SupplierEvent[] = [
      {
        type: 'SupplierRegistered',
        supplierId: supplier.id,
        cnpj: supplier.cnpj,
        occurredAt: REGISTERED_AT,
      },
      { type: 'SupplierEdited', supplierId: supplier.id, occurredAt: REGISTERED_AT },
    ];
    const messages = supplierEventsToOutboxMessages(events, supplier);
    const ids = new Set(messages.map((m) => m.eventId));
    assert.equal(ids.size, messages.length);
  });
});
