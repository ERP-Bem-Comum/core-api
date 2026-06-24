import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

// W0 RED (#221): o mapper do read path payable-centric ainda não existe.
import {
  rowToPayableListItem,
  type PayableListRow,
} from '#src/modules/financial/adapters/persistence/mappers/payable-list.mapper.ts';

const baseRow = (over: Partial<PayableListRow> = {}): PayableListRow => ({
  payableId: '11111111-1111-4111-8111-111111111111',
  documentId: '22222222-2222-4222-8222-222222222222',
  kind: 'Parent',
  retentionType: null,
  valueCents: 793500,
  dueDate: new Date('2026-07-01T00:00:00.000Z'),
  status: 'Open',
  documentNumber: 'NF-123',
  series: '1',
  documentType: 'NFS-e',
  supplierRef: '33333333-3333-4333-8333-333333333333',
  contractRef: null,
  issueDate: new Date('2026-06-15T00:00:00.000Z'),
  paymentMethod: 'PIX',
  version: 0,
  grossValueCents: 1000000,
  netValueCents: 793500,
  paidAt: null,
  ...over,
});

describe('financial/adapters — payable-list.mapper (#221)', () => {
  it('CA1: linha do PAI → kind Parent, retentionType null, campos do documento', () => {
    const r = rowToPayableListItem(baseRow());
    assert.equal(r.ok, true, JSON.stringify(r));
    if (!r.ok) return;
    assert.equal(r.value.kind, 'Parent');
    assert.equal(r.value.retentionType, null);
    assert.equal(r.value.payableId, '11111111-1111-4111-8111-111111111111');
    assert.equal(r.value.documentId, '22222222-2222-4222-8222-222222222222');
    assert.equal(r.value.documentNumber, 'NF-123');
    assert.equal(r.value.series, '1');
    assert.equal(r.value.documentType, 'NFS-e');
    assert.equal(r.value.valueCents, 793500);
    assert.equal(r.value.status, 'Open');
    assert.equal(r.value.supplierRef, '33333333-3333-4333-8333-333333333333');
    assert.equal(r.value.contractRef, null);
  });

  it('CA1: linha do FILHO (retenção) → kind Child + retentionType', () => {
    const r = rowToPayableListItem(
      baseRow({ kind: 'Child', retentionType: 'ISS', valueCents: 35000 }),
    );
    assert.equal(r.ok, true, JSON.stringify(r));
    if (!r.ok) return;
    assert.equal(r.value.kind, 'Child');
    assert.equal(r.value.retentionType, 'ISS');
    assert.equal(r.value.valueCents, 35000);
  });

  it('CA1: kind inválido vindo do banco → invalid-payable-kind', () => {
    const r = rowToPayableListItem(baseRow({ kind: 'Bogus' }));
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'invalid-payable-kind');
  });

  it('CA1: status inválido vindo do banco → invalid-payable-status', () => {
    const r = rowToPayableListItem(baseRow({ status: 'Bogus' }));
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'invalid-payable-status');
  });
});
