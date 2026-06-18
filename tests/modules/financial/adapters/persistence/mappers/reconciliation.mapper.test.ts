// Round-trip row↔domínio da conciliação (#123). Cobre Active+difference, Undone (audit) e rejeição
// de type inválido vindo do banco. Teste puro — roda no gate.

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { confirm, undo } from '#src/modules/financial/domain/reconciliation/reconciliation.ts';
import * as ReconciliationId from '#src/modules/financial/domain/reconciliation/reconciliation-id.ts';
import * as StatementTransactionId from '#src/modules/financial/domain/statement/statement-transaction-id.ts';
import * as PayableId from '#src/modules/financial/domain/shared/payable-id.ts';
import type { PayableSnapshot } from '#src/modules/financial/domain/reconciliation/types.ts';
import {
  reconciliationToRow,
  itemsToRows,
  toDomain,
} from '#src/modules/financial/adapters/persistence/mappers/reconciliation.mapper.ts';
import type { Reconciliation } from '#src/modules/financial/domain/reconciliation/types.ts';
import type { ReconciliationRow } from '#src/modules/financial/adapters/persistence/schemas/mysql.ts';

const WHEN = new Date('2024-05-20T12:00:00.000Z');

// `reconciliationToRow` devolve o shape de INSERT ($inferInsert: nullables opcionais); `toDomain` lê
// o shape de SELECT ($inferSelect: nullables requeridos). Os valores reais estão completos (toRow põe
// `?? null`), então o cast representa fielmente uma row lida do banco — atalho só do teste.
const asSelectRow = (recon: Reconciliation): ReconciliationRow =>
  reconciliationToRow(recon) as ReconciliationRow;

const snap = (valueCents: number): PayableSnapshot => ({
  id: PayableId.generate(),
  status: 'Paid',
  valueCents,
});

const buildActive = (difference?: { valueCents: number; treatment: 'Interest' }) => {
  const out = confirm({
    reconciliationId: ReconciliationId.generate(),
    transactionId: StatementTransactionId.generate(),
    transactionValueCents: difference === undefined ? 1000 : 1050,
    payables: [snap(1000)],
    ...(difference !== undefined ? { difference } : {}),
    reconciledBy: '99999999-9999-4999-8999-999999999999',
    occurredAt: WHEN,
  });
  if (!out.ok) throw new Error('setup: confirm');
  return out.value.reconciliation;
};

describe('financial/adapters/persistence/mappers/reconciliation.mapper', () => {
  it('round-trip Active com difference (Partial)', () => {
    const recon = buildActive({ valueCents: 50, treatment: 'Interest' });
    const row = asSelectRow(recon);
    const items = itemsToRows(recon);

    const back = toDomain(row, items);
    assert.equal(back.ok, true);
    if (back.ok) {
      assert.equal(back.value.id, recon.id);
      assert.equal(back.value.type, 'Partial');
      assert.equal(back.value.status, 'Active');
      assert.equal(back.value.difference?.valueCents, 50);
      assert.equal(back.value.difference?.treatment, 'Interest');
      assert.equal(back.value.items.length, 1);
      assert.equal(back.value.items[0]?.payableId, recon.items[0]?.payableId);
    }
  });

  it('round-trip Undone preserva a auditoria', () => {
    const active = buildActive();
    const undone = undo(active, { undoneBy: 'u2', occurredAt: WHEN, reason: 'erro de lançamento' });
    if (!undone.ok) throw new Error('setup: undo');
    const back = toDomain(asSelectRow(undone.value.reconciliation), itemsToRows(active));
    assert.equal(back.ok, true);
    if (back.ok) {
      assert.equal(back.value.status, 'Undone');
      assert.equal(back.value.audit.undoneBy, 'u2');
      assert.equal(back.value.audit.undoReason, 'erro de lançamento');
      assert.equal(back.value.difference, null);
    }
  });

  it('toDomain rejeita type inválido vindo do banco', () => {
    const recon = buildActive();
    const row: ReconciliationRow = { ...asSelectRow(recon), type: 'Bogus' };
    const back = toDomain(row, itemsToRows(recon));
    assert.equal(back.ok, false);
    if (!back.ok) assert.equal(back.error, 'invalid-reconciliation-type');
  });
});
