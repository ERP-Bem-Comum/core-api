import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr } from '#src/shared/index.ts';
import * as ReconciliationId from '#src/modules/financial/domain/reconciliation/reconciliation-id.ts';
import * as PayableId from '#src/modules/financial/domain/shared/payable-id.ts';
import * as StatementTransactionId from '#src/modules/financial/domain/statement/statement-transaction-id.ts';
import type { DocumentStatus } from '#src/modules/financial/domain/document/types.ts';
import { confirm } from '#src/modules/financial/domain/reconciliation/reconciliation.ts';

// #141/#247: suíte de regressão dos 4 CAs da issue contra o NOVO comportamento (conciliação parcial).
// CA1/CA2/CA3-classificação preservados; CA4 agora concilia o valor REAL alocado (saldo parcial).
const ACTOR = '11111111-1111-4111-8111-111111111111';
const WHEN = new Date('2024-05-19T09:00:00.000Z');

const snap = (valueCents: number, status: DocumentStatus = 'Paid') => ({
  id: PayableId.generate(),
  status,
  valueCents,
});

type Difference = Readonly<{
  valueCents: number;
  treatment: 'Interest' | 'Penalty' | 'Discount' | 'Fee' | 'Partial';
}>;

type Snap = ReturnType<typeof snap>;

const input = (
  payables: readonly Snap[],
  transactionValueCents: number,
  opts?: {
    difference?: Difference;
    allocations?: readonly { payableId: Snap['id']; reconciledValueCents: number }[];
  },
) => ({
  reconciliationId: ReconciliationId.generate(),
  transactionId: StatementTransactionId.generate(),
  transactionValueCents,
  payables,
  reconciledBy: ACTOR,
  occurredAt: WHEN,
  ...(opts?.difference !== undefined ? { difference: opts.difference } : {}),
  ...(opts?.allocations !== undefined ? { allocations: opts.allocations } : {}),
});

// Suíte de CARACTERIZAÇÃO do estado atual (Feathers): trava o que já funciona (CA1/CA2/CA3-classif)
// como regression guard e documenta o DELTA pendente da #141 (CA4 saldo parcial; CA3-centro-de-custo).
describe('financial/domain/reconciliation — #141 caracterização (verificar+refinar)', () => {
  it('Issue-CA1: diferença = 0 → conciliação cheia', () => {
    const r = confirm(input([snap(8000)], 8000));
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value.reconciliation.difference, null);
  });

  it('Issue-CA2: diferença ≠ 0 SEM classificação → bloqueia', () => {
    const r = confirm(input([snap(8000)], 8450));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'reconciliation-not-balanced');
  });

  it('Issue-CA3 (classificação): diferença Desconto classificada → Partial + treatment preservado', () => {
    const r = confirm(
      input([snap(8000)], 7600, { difference: { valueCents: -400, treatment: 'Discount' } }),
    );
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.reconciliation.type, 'Partial');
      assert.equal(r.value.reconciliation.difference?.treatment, 'Discount');
    }
  });

  it('Issue-CA4 (NOVO): título 8000, pago 6000 (Partial) → concilia o valor REAL alocado (6000)', () => {
    // #247: o CA4 agora concilia só o valor pago (6000); o saldo aberto (2000) deriva o status
    // PartiallyReconciled do título na persistência. reconciledValueCents reflete o alocado.
    const p = snap(8000);
    const r = confirm(
      input([p], 6000, {
        difference: { valueCents: -2000, treatment: 'Partial' },
        allocations: [{ payableId: p.id, reconciledValueCents: 6000 }],
      }),
    );
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value.reconciliation.items[0]?.reconciledValueCents, 6000);
  });
});
