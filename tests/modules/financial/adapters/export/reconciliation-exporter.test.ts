// CA5 (#125) — exporter OFX/CSV (Node puro). Teste de borda, roda no gate (sem Docker).

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as StatementTransactionId from '#src/modules/financial/domain/statement/statement-transaction-id.ts';
import * as Fitid from '#src/modules/financial/domain/statement/fitid.ts';
import type { StatementTransaction } from '#src/modules/financial/domain/statement/types.ts';
import { reconciliationExporter } from '#src/modules/financial/adapters/export/reconciliation-exporter.ts';
import type { ReconciliationExportFormat } from '#src/modules/financial/application/ports/reconciliation-exporter.ts';

const tx = (valueCents: number, movement: 'Debit' | 'Credit'): StatementTransaction => ({
  id: StatementTransactionId.generate(),
  fitid: (() => {
    const f = Fitid.fromNative(`f-${String(valueCents)}`);
    if (!f.ok) throw new Error('setup');
    return f.value;
  })(),
  date: new Date('2024-05-18T00:00:00.000Z'),
  movement,
  entryType: 'TED',
  payeeName: 'FORNECEDOR X',
  memo: 'pagamento',
  valueCents,
  balanceAfterCents: 0,
  reconciliationStatus: 'Reconciled',
});

const data = {
  debitAccountRef: '11111111-1111-4111-8111-111111111111',
  periodStart: new Date('2024-05-01T00:00:00.000Z'),
  periodEnd: new Date('2024-05-31T00:00:00.000Z'),
  transactions: [tx(1000, 'Debit'), tx(2000, 'Credit')],
};

describe('financial/adapters/export — reconciliationExporter (US6)', () => {
  it('CA5: CSV com header, linhas e totalização', () => {
    const r = reconciliationExporter.export('csv', data);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.match(r.value, /data;fitid;movimento;valor_cents;favorecido;memo;status/);
    assert.match(r.value, /Debit/);
    assert.match(r.value, /TOTAL;.*3000/); // soma 1000 + 2000
    assert.match(r.value, /2 transacoes/);
  });

  it('CA5: OFX com STMTTRN e período', () => {
    const r = reconciliationExporter.export('ofx', data);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.match(r.value, /<OFX>/);
    assert.match(r.value, /<STMTTRN>/);
    assert.match(r.value, /<DTSTART>20240501/);
    assert.match(r.value, /<TRNAMT>-10\.00/); // Debit 1000 cents → -10.00
  });

  it('CA5: formato fora de {ofx,csv} → unsupported-export-format', () => {
    const r = reconciliationExporter.export('xlsx' as ReconciliationExportFormat, data);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'unsupported-export-format');
  });
});
