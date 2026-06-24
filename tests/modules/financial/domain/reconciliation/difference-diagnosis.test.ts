import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr } from '#src/shared/index.ts';
import * as ReconciliationId from '#src/modules/financial/domain/reconciliation/reconciliation-id.ts';
import * as PayableId from '#src/modules/financial/domain/shared/payable-id.ts';
import * as StatementTransactionId from '#src/modules/financial/domain/statement/statement-transaction-id.ts';
import type { DocumentStatus } from '#src/modules/financial/domain/document/types.ts';
import { confirm } from '#src/modules/financial/domain/reconciliation/reconciliation.ts';

// W0-DIAGNÓSTICO #141: roda os 4 CAs da issue contra o código ATUAL para medir o delta.
// CA1/CA2/CA3-classificação devem passar (já modelados); CA4 (saldo parcial) deve FALHAR.
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

const input = (
  payables: readonly ReturnType<typeof snap>[],
  transactionValueCents: number,
  difference?: Difference,
) => ({
  reconciliationId: ReconciliationId.generate(),
  transactionId: StatementTransactionId.generate(),
  transactionValueCents,
  payables,
  reconciledBy: ACTOR,
  occurredAt: WHEN,
  ...(difference !== undefined ? { difference } : {}),
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
    const r = confirm(input([snap(8000)], 7600, { valueCents: -400, treatment: 'Discount' }));
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.reconciliation.type, 'Partial');
      assert.equal(r.value.reconciliation.difference?.treatment, 'Discount');
    }
  });

  it('Issue-CA4 PENDENTE (caracteriza o atual): título 8000, pago 6000 → hoje concilia INTEGRAL (8000)', () => {
    // DELTA #141: o CA4 da issue exige conciliar só o valor pago (6000) e manter 2000 do título aberto.
    // Hoje o domínio concilia o título integral (8000) — comportamento caracterizado abaixo; o saldo
    // parcial é trabalho de domínio M-L (modelar saldo/estado do título). Ver REPORT do W0 + #141.
    const r = confirm(input([snap(8000)], 6000, { valueCents: -2000, treatment: 'Partial' }));
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value.reconciliation.items[0]?.reconciledValueCents, 8000);
  });
});
