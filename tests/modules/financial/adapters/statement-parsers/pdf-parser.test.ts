/**
 * FIN-PDF-STATEMENT-PARSER — W0 (RED) — extrato Bradesco em PDF → mesmo ParsedStatement do OFX.
 *
 * `parsePdf(text)` opera sobre o TEXTO extraído do PDF (a extração via unpdf é do dispatcher, async).
 * Layout tabular: `Data Lançamento Documento Crédito/Débito Saldo`. Só a folha 1 (Conta-corrente) entra;
 * a folha 2 (Investimentos) é outro produto, fora do v1. Sinal pelo DELTA de saldo + validação de
 * continuidade (`saldo_ant + valor == saldo`). `documento` = FITID (chave de conciliação, == OFX).
 *
 * Gabarito: o extrato fictício de julho/2026 (fixture). RED: `parsePdf` ainda não existe.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';

import { parsePdf } from '#src/modules/financial/adapters/statement-parsers/pdf-parser.ts';

const TEXT = readFileSync(
  new URL('./fixtures/bradesco-extrato-julho-2026.txt', import.meta.url),
  'utf8',
);

describe('parsePdf — extrato Bradesco (conta-corrente, folha 1)', () => {
  it('CA1: 23 transações (só a conta-corrente; investimentos da folha 2 fora)', () => {
    const r = parsePdf(TEXT);
    assert.equal(r.ok, true, JSON.stringify(r));
    if (!r.ok) return;
    assert.equal(r.value.transactions.length, 23);
  });

  it('CA2: período + saldo inicial/final', () => {
    const r = parsePdf(TEXT);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.periodStart.toISOString().slice(0, 10), '2026-07-01');
    assert.equal(r.value.periodEnd.toISOString().slice(0, 10), '2026-07-31');
    assert.equal(r.value.openingBalanceCents, 2864075); // SALDO ANTERIOR 28.640,75
    assert.equal(r.value.closingBalanceCents, 4597574); // último saldo 45.975,74
  });

  it('CA3: 1ª transação (crédito) mapeada — fitid=documento, sinal pelo saldo', () => {
    const r = parsePdf(TEXT);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    const t0 = r.value.transactions[0];
    assert.equal(t0?.date.toISOString().slice(0, 10), '2026-07-02');
    assert.equal(t0?.fitid, 'PIX26070201');
    assert.equal(t0?.movement, 'Credit'); // saldo subiu 28.640,75 → 47.140,75
    assert.equal(t0?.valueCents, 1850000);
    assert.equal(t0?.balanceAfterCents, 4714075);
    assert.ok((t0?.payeeName ?? '').includes('PIX RECEBIDO'));
  });

  it('CA4: débito mapeado (sinal negativo pelo delta do saldo)', () => {
    const r = parsePdf(TEXT);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    const deb = r.value.transactions.find((t) => t.fitid === 'PG26070318');
    assert.ok(deb, 'PG26070318 presente');
    assert.equal(deb.movement, 'Debit'); // 47.140,75 → 44.799,85
    assert.equal(deb.valueCents, 234090);
    assert.equal(deb.balanceAfterCents, 4479985);
  });

  it('CA5: continuidade do saldo — saldo_ant + valor(sinal) == saldo (extração íntegra)', () => {
    const r = parsePdf(TEXT);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    let prev = r.value.openingBalanceCents;
    for (const t of r.value.transactions) {
      const signed = t.movement === 'Credit' ? t.valueCents : -t.valueCents;
      assert.equal(t.balanceAfterCents, prev + signed, `descontinuidade em ${t.fitid ?? '?'}`);
      prev = t.balanceAfterCents;
    }
  });

  it('CA6: a folha 2 (Investimentos) não vaza — fitid exclusivo dela ausente', () => {
    const r = parsePdf(TEXT);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(
      r.value.transactions.some((t) => t.fitid === 'IRF26073191'),
      false,
    );
  });
});
