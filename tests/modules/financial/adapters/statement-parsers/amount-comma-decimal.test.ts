/**
 * FIN-OFX-COMMA-DECIMAL — W0 (RED) — #531: vírgula decimal (Bradesco) deve ser aceita.
 *
 * `parseAmountCents` só casava ponto (`^-?\d+(\.\d{1,2})?$`). Bradesco exporta OFX com vírgula
 * (`-845,00`) → toda transação vira null → `parseOfx` devolve `malformed-statement` e o extrato
 * inteiro é rejeitado. Cobre CA1..CA5.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { parseAmountCents } from '#src/modules/financial/adapters/statement-parsers/amount.ts';
import { parseOfx } from '#src/modules/financial/adapters/statement-parsers/ofx-parser.ts';

describe('parseAmountCents — vírgula decimal (#531)', () => {
  it('CA1 — "123,45" → 12345 (era null)', () => {
    assert.equal(parseAmountCents('123,45'), 12345);
  });

  it('CA2 — "-845,00" → -84500', () => {
    assert.equal(parseAmountCents('-845,00'), -84500);
  });

  it('CA3 — ponto segue funcionando (sem regressão): "1200.00"→120000, "123"→12300', () => {
    assert.equal(parseAmountCents('1200.00'), 120000);
    assert.equal(parseAmountCents('123'), 12300);
  });

  it('CA4 — não-numérico segue null', () => {
    assert.equal(parseAmountCents('abc'), null);
    assert.equal(parseAmountCents(''), null);
  });
});

// CA5 — regressão de integração do parser: OFX estilo Bradesco (vírgula) parseia.
const OFX_BRADESCO = `<OFX>
<BANKMSGSRSV1><STMTTRNRS><STMTRS>
<BANKTRANLIST>
<DTSTART>20240501</DTSTART>
<DTEND>20240531</DTEND>
<STMTTRN><TRNTYPE>DEBIT</TRNTYPE><DTPOSTED>20240518</DTPOSTED><TRNAMT>-845,00</TRNAMT><FITID>2024051800001</FITID><NAME>FORNECEDOR X</NAME><MEMO>NFS 2024-0537</MEMO></STMTTRN>
<STMTTRN><TRNTYPE>CREDIT</TRNTYPE><DTPOSTED>20240519</DTPOSTED><TRNAMT>1200,50</TRNAMT><FITID>2024051900002</FITID><NAME>CLIENTE Y</NAME><MEMO>recebimento</MEMO></STMTTRN>
</BANKTRANLIST>
<LEDGERBAL><BALAMT>500,00</BALAMT></LEDGERBAL>
</STMTRS></STMTTRNRS></BANKMSGSRSV1>
</OFX>`;

describe('parseOfx — extrato Bradesco com vírgula (#531)', () => {
  it('CA5 — não é mais `malformed-statement`; transações com centavos corretos', () => {
    const r = parseOfx(OFX_BRADESCO);
    assert.equal(r.ok, true, 'extrato com vírgula deve parsear (não malformed-statement)');
    if (r.ok) {
      assert.equal(r.value.transactions.length, 2);
      assert.equal(r.value.transactions[0]?.valueCents, 84500);
      assert.equal(r.value.transactions[0]?.movement, 'Debit');
      assert.equal(r.value.transactions[1]?.valueCents, 120050);
      assert.equal(r.value.transactions[1]?.movement, 'Credit');
      assert.equal(r.value.closingBalanceCents, 50000);
    }
  });
});
