// W0 RED (#143 / FIN-RECON-INTERACCOUNT) — realocação patrimonial no lançamento manual.
// CA1/CA2/CA3/CA4/CA5 — camada de domínio (guards por tipo + isCapitalReallocation). Domínio puro, gate.

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr } from '#src/shared/index.ts';
import * as ReconciliationId from '#src/modules/financial/domain/reconciliation/reconciliation-id.ts';
import * as StatementTransactionId from '#src/modules/financial/domain/statement/statement-transaction-id.ts';
import {
  confirmManualEntry,
  isCapitalReallocation,
} from '#src/modules/financial/domain/reconciliation/manual-entry.ts';
import type { ManualEntryType } from '#src/modules/financial/domain/reconciliation/types.ts';

const WHEN = new Date('2024-05-20T12:00:00.000Z');
const DEST = '22222222-2222-4222-8222-222222222222';

const baseInput = (type: ManualEntryType, valueCents = 2500) => ({
  reconciliationId: ReconciliationId.generate(),
  transactionId: StatementTransactionId.generate(),
  type,
  valueCents,
  reconciledBy: '99999999-9999-4999-8999-999999999999',
  occurredAt: WHEN,
});

describe('financial/domain/reconciliation — confirmManualEntry realocação (#143)', () => {
  // ── CA1: Transfer exige destino ──────────────────────────────────────────────
  it('CA1: Transfer sem destinationAccountRef → transfer-requires-destination', () => {
    const r = confirmManualEntry(baseInput('Transfer'));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'transfer-requires-destination');
  });

  it('CA1: Transfer com destinationAccountRef → ok e grava destino no boundary', () => {
    const r = confirmManualEntry({ ...baseInput('Transfer'), destinationAccountRef: DEST });
    assert.equal(r.ok, true, JSON.stringify(r));
    if (!r.ok) return;
    assert.equal(r.value.manualEntry.type, 'Transfer');
    assert.equal(r.value.manualEntry.destinationAccountRef, DEST);
    assert.equal(r.value.manualEntry.productLabel, null);
  });

  // ── CA2: Investment/Redemption exigem produto ────────────────────────────────
  it('CA2: Investment sem productLabel → investment-requires-product', () => {
    const r = confirmManualEntry(baseInput('Investment'));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'investment-requires-product');
  });

  it('CA2: Redemption sem productLabel → investment-requires-product', () => {
    const r = confirmManualEntry(baseInput('Redemption'));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'investment-requires-product');
  });

  it('CA2: Investment com productLabel → ok e grava produto no boundary', () => {
    const r = confirmManualEntry({ ...baseInput('Investment'), productLabel: 'CDB Banco X' });
    assert.equal(r.ok, true, JSON.stringify(r));
    if (!r.ok) return;
    assert.equal(r.value.manualEntry.productLabel, 'CDB Banco X');
    assert.equal(r.value.manualEntry.destinationAccountRef, null);
  });

  // ── CA5: realocação proíbe supplierRef ───────────────────────────────────────
  it('CA5: Transfer com supplierRef → realloc-forbids-supplier', () => {
    const r = confirmManualEntry({
      ...baseInput('Transfer'),
      destinationAccountRef: DEST,
      supplierRef: '33333333-3333-4333-8333-333333333333',
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'realloc-forbids-supplier');
  });

  it('CA5: Investment com supplierRef → realloc-forbids-supplier', () => {
    const r = confirmManualEntry({
      ...baseInput('Investment'),
      productLabel: 'CDB Banco X',
      supplierRef: '33333333-3333-4333-8333-333333333333',
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'realloc-forbids-supplier');
  });

  // ── CA3: não auto-cria espelho (apenas 1 evento ManualEntryRecorded) ──────────
  it('CA3: realocação grava boundary e emite só 1 evento (sem espelho)', () => {
    const r = confirmManualEntry({ ...baseInput('Transfer'), destinationAccountRef: DEST });
    assert.equal(r.ok, true, JSON.stringify(r));
    if (!r.ok) return;
    assert.equal(r.value.events.length, 1);
    assert.equal(r.value.events[0]?.type, 'ManualEntryRecorded');
    assert.equal(r.value.reconciliation.manualEntry?.destinationAccountRef, DEST);
  });

  // ── Tipos não-realocação seguem inalterados (back-compat) ─────────────────────
  it('back-compat: Payment sem destino/produto continua ok', () => {
    const r = confirmManualEntry(baseInput('Payment'));
    assert.equal(r.ok, true, JSON.stringify(r));
    if (!r.ok) return;
    assert.equal(r.value.manualEntry.destinationAccountRef, null);
    assert.equal(r.value.manualEntry.productLabel, null);
  });

  it('back-compat: FeePenaltyInterest aceita supplierRef (não é realocação)', () => {
    const r = confirmManualEntry({
      ...baseInput('FeePenaltyInterest'),
      supplierRef: '33333333-3333-4333-8333-333333333333',
    });
    assert.equal(r.ok, true, JSON.stringify(r));
  });
});

describe('financial/domain/reconciliation — isCapitalReallocation (#143 CA4)', () => {
  it('CA4: Transfer/Investment/Redemption são realocação patrimonial', () => {
    assert.equal(isCapitalReallocation('Transfer'), true);
    assert.equal(isCapitalReallocation('Investment'), true);
    assert.equal(isCapitalReallocation('Redemption'), true);
  });

  it('CA4: Payment/Receipt/FeePenaltyInterest NÃO são realocação (despesa/receita)', () => {
    assert.equal(isCapitalReallocation('Payment'), false);
    assert.equal(isCapitalReallocation('Receipt'), false);
    assert.equal(isCapitalReallocation('FeePenaltyInterest'), false);
  });
});
