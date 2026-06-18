import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr } from '#src/shared/index.ts';
// W0 RED: o dispatcher (port) ainda não existe.
import { bankStatementParser } from '#src/modules/financial/adapters/statement-parsers/bank-statement-parser.ts';

const OFX = `<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>
<STMTTRN><TRNTYPE>DEBIT</TRNTYPE><DTPOSTED>20240518</DTPOSTED><TRNAMT>-10.00</TRNAMT><FITID>F1</FITID><NAME>X</NAME><MEMO>m</MEMO></STMTTRN>
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;

const CSV = `data;tipo;valor;nome;descricao;saldo
2024-05-18;DEBITO;-10.00;X;m;90.00`;

// Critério CA5: dispatcher delega por formato; fora de {OFX,CSV} → unsupported-format.
describe('financial/adapters/statement-parsers/bank-statement-parser (dispatcher)', () => {
  it('CA5: delega OFX e CSV ao adapter correto', () => {
    assert.equal(bankStatementParser.parse('OFX', OFX).ok, true);
    assert.equal(bankStatementParser.parse('CSV', CSV).ok, true);
  });

  it('CA5: formato fora de {OFX,CSV} → unsupported-format', () => {
    // Força um formato inválido em runtime para exercitar o guard do dispatcher.
    const r = bankStatementParser.parse('XLSX' as unknown as 'OFX', 'qualquer');
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'unsupported-format');
  });
});
