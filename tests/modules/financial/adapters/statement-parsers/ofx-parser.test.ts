import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr } from '#src/shared/index.ts';
// W0 RED: o adapter ofx-parser ainda não existe.
import { parseOfx } from '#src/modules/financial/adapters/statement-parsers/ofx-parser.ts';

const OFX = `<OFX>
<BANKMSGSRSV1><STMTTRNRS><STMTRS>
<BANKTRANLIST>
<DTSTART>20240501</DTSTART>
<DTEND>20240531</DTEND>
<STMTTRN><TRNTYPE>DEBIT</TRNTYPE><DTPOSTED>20240518</DTPOSTED><TRNAMT>-845.00</TRNAMT><FITID>2024051800001</FITID><NAME>FORNECEDOR X</NAME><MEMO>NFS 2024-0537</MEMO></STMTTRN>
<STMTTRN><TRNTYPE>CREDIT</TRNTYPE><DTPOSTED>20240519</DTPOSTED><TRNAMT>1200.00</TRNAMT><FITID>2024051900002</FITID><NAME>CLIENTE Y</NAME><MEMO>recebimento</MEMO></STMTTRN>
</BANKTRANLIST>
<LEDGERBAL><BALAMT>500.00</BALAMT></LEDGERBAL>
</STMTRS></STMTTRNRS></BANKMSGSRSV1>
</OFX>`;

// Critérios em .claude/.pipeline/FIN-RECON-PARSERS/000-request.md (CA1, CA3, CA4, CA6).
describe('financial/adapters/statement-parsers/ofx-parser', () => {
  it('CA1: OFX válido → 2 transações com FITID nativo e campos mapeados', () => {
    const r = parseOfx(OFX);
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.transactions.length, 2);
      const t0 = r.value.transactions[0];
      assert.equal(t0?.fitid, '2024051800001');
      assert.equal(t0?.movement, 'Debit');
      assert.equal(t0?.payeeName, 'FORNECEDOR X');
      assert.equal(t0?.memo, 'NFS 2024-0537');
      assert.equal(r.value.transactions[1]?.movement, 'Credit');
    }
  });

  it('CA6: TRNAMT negativo → Debit com valueCents positivo (magnitude)', () => {
    const r = parseOfx(OFX);
    assert.equal(r.ok, true);
    if (r.ok) {
      const t0 = r.value.transactions[0];
      assert.equal(t0?.movement, 'Debit');
      assert.equal(t0?.valueCents, 84500);
      assert.equal(r.value.transactions[1]?.valueCents, 120000);
    }
  });

  it('CA2 (#159): TRNTYPE bruto é normalizado p/ o union EntryType (fallback Other)', () => {
    const ofx = `<OFX><BANKTRANLIST>
<STMTTRN><TRNTYPE>FEE</TRNTYPE><DTPOSTED>20240518</DTPOSTED><TRNAMT>-4.90</TRNAMT><FITID>f1</FITID><NAME>BANCO</NAME><MEMO>TARIFA</MEMO></STMTTRN>
<STMTTRN><TRNTYPE>PIX</TRNTYPE><DTPOSTED>20240519</DTPOSTED><TRNAMT>-10.00</TRNAMT><FITID>f2</FITID><NAME>FULANO</NAME><MEMO>pix</MEMO></STMTTRN>
<STMTTRN><TRNTYPE>XFER</TRNTYPE><DTPOSTED>20240520</DTPOSTED><TRNAMT>-20.00</TRNAMT><FITID>f3</FITID><NAME>SICRANO</NAME><MEMO>ted</MEMO></STMTTRN>
<STMTTRN><TRNTYPE>XPTO</TRNTYPE><DTPOSTED>20240521</DTPOSTED><TRNAMT>-30.00</TRNAMT><FITID>f4</FITID><NAME>DESCONHECIDO</NAME><MEMO>?</MEMO></STMTTRN>
</BANKTRANLIST></OFX>`;
    const r = parseOfx(ofx);
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.transactions[0]?.entryType, 'Fee');
      assert.equal(r.value.transactions[1]?.entryType, 'PIX');
      assert.equal(r.value.transactions[2]?.entryType, 'Transfer');
      assert.equal(r.value.transactions[3]?.entryType, 'Other');
    }
  });

  it('CA3: conteúdo sem estrutura OFX reconhecível → malformed-statement', () => {
    const r = parseOfx('isto nao eh um arquivo ofx');
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'malformed-statement');
  });

  it('CA4: conteúdo vazio → empty-content', () => {
    const r = parseOfx('');
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'empty-content');
  });
});
