import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr } from '#src/shared/index.ts';
import * as ReconciliationId from '#src/modules/financial/domain/reconciliation/reconciliation-id.ts';
import * as PayableId from '#src/modules/financial/domain/shared/payable-id.ts';
import * as StatementTransactionId from '#src/modules/financial/domain/statement/statement-transaction-id.ts';
import type { DocumentStatus } from '#src/modules/financial/domain/document/types.ts';
import { confirm } from '#src/modules/financial/domain/reconciliation/reconciliation.ts';
// W0 RED #141/#247: derivação do status do título a partir da soma conciliada (ainda não existe).
import { deriveReconciledStatus } from '#src/modules/financial/domain/payable/reconciled-status.ts';

const ACTOR = '11111111-1111-4111-8111-111111111111';
const WHEN = new Date('2024-05-19T09:00:00.000Z');

type Difference = Readonly<{
  valueCents: number;
  treatment: 'Interest' | 'Penalty' | 'Discount' | 'Fee' | 'Partial';
}>;

const snap = (valueCents: number, status: DocumentStatus = 'Paid') => ({
  id: PayableId.generate(),
  status,
  valueCents,
});

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

// ── CA4: pagamento parcial — reconciledValueCents passa a refletir o valor REAL alocado ──────────
describe('financial/domain/reconciliation — pagamento parcial (#141/#247 CA4)', () => {
  it('CA4: título 8000, alocado 6000 (Partial −2000) → reconciledValueCents = 6000 (não 8000)', () => {
    const p = snap(8000);
    const r = confirm(
      input([p], 6000, {
        difference: { valueCents: -2000, treatment: 'Partial' },
        allocations: [{ payableId: p.id, reconciledValueCents: 6000 }],
      }),
    );
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.reconciliation.items[0]?.reconciledValueCents, 6000);
      assert.equal(r.value.reconciliation.type, 'Partial');
    }
  });

  it('CA4: R3 — Σ itens (6000) + difference (−2000) === transação (4000? não) → balanceia em 6000', () => {
    const p = snap(8000);
    // transação = alocado (6000) + difference (−2000) = 4000? Não: a diferença "Partial" é o saldo
    // aberto, não soma à transação. R3: Σ itens.reconciledValueCents === transação quando treatment=Partial.
    const r = confirm(
      input([p], 6000, {
        difference: { valueCents: -2000, treatment: 'Partial' },
        allocations: [{ payableId: p.id, reconciledValueCents: 6000 }],
      }),
    );
    assert.equal(r.ok, true);
  });

  it('CA1 preservado: sem allocations → reconciledValueCents = payable.valueCents (conciliação cheia)', () => {
    const r = confirm(input([snap(8000)], 8000));
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.reconciliation.items[0]?.reconciledValueCents, 8000);
      assert.equal(r.value.reconciliation.difference, null);
    }
  });
});

// ── CA5: validação de sinal da diferença classificada ────────────────────────────────────────────
describe('financial/domain/reconciliation — sinal da diferença (#141/#247 CA5)', () => {
  it('CA5: Discount com valueCents > 0 → difference-sign-invalid', () => {
    const r = confirm(
      input([snap(8000)], 8400, { difference: { valueCents: 400, treatment: 'Discount' } }),
    );
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'difference-sign-invalid');
  });

  it('CA5: Interest com valueCents < 0 → difference-sign-invalid', () => {
    const r = confirm(
      input([snap(8000)], 7600, { difference: { valueCents: -400, treatment: 'Interest' } }),
    );
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'difference-sign-invalid');
  });

  it('CA5: Discount com valueCents < 0 → ok (sinal coerente)', () => {
    const r = confirm(
      input([snap(8000)], 7600, { difference: { valueCents: -400, treatment: 'Discount' } }),
    );
    assert.equal(r.ok, true);
  });

  it('CA5: Interest com valueCents > 0 → ok (sinal coerente)', () => {
    const r = confirm(
      input([snap(8000)], 8400, { difference: { valueCents: 400, treatment: 'Interest' } }),
    );
    assert.equal(r.ok, true);
  });

  it('CA5: Fee com valueCents > 0 → ok; Penalty com valueCents < 0 → erro', () => {
    const okFee = confirm(
      input([snap(8000)], 8050, { difference: { valueCents: 50, treatment: 'Fee' } }),
    );
    assert.equal(okFee.ok, true);
    const badPenalty = confirm(
      input([snap(8000)], 7900, { difference: { valueCents: -100, treatment: 'Penalty' } }),
    );
    assert.equal(isErr(badPenalty), true);
    if (!badPenalty.ok) assert.equal(badPenalty.error, 'difference-sign-invalid');
  });
});

// ── CA4/CA6: derivação do status do título a partir da soma conciliada ───────────────────────────
describe('financial/domain/payable — deriveReconciledStatus (#141/#247 CA4/CA6)', () => {
  it('CA4: soma (6000) < valor (8000) e > 0 → PartiallyReconciled', () => {
    assert.equal(deriveReconciledStatus(8000, 6000), 'PartiallyReconciled');
  });

  it('CA6: soma (8000) >= valor (8000) → Reconciled (idempotente, fecha o título)', () => {
    assert.equal(deriveReconciledStatus(8000, 8000), 'Reconciled');
  });

  it('CA6: parciais somados (6000 + 2000) atingem o valor original → Reconciled', () => {
    assert.equal(deriveReconciledStatus(8000, 6000 + 2000), 'Reconciled');
  });

  it('soma 0 → PartiallyReconciled não se aplica; trata como não conciliado? regra: >0 e <valor', () => {
    // Defensivo: soma 0 (nenhuma conciliação ativa) não deveria derivar status de conciliação.
    // O helper só é chamado com soma > 0 (há ao menos 1 item). Documentado aqui como guard.
    assert.equal(deriveReconciledStatus(8000, 1), 'PartiallyReconciled');
  });
});
