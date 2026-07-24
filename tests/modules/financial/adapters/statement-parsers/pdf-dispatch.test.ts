/**
 * FIN-PDF-STATEMENT-PARSER — caminho completo do dispatcher para PDF: base64 → unpdf (extração de
 * texto real, in-process) → parsePdf. Usa o extrato Bradesco FICTÍCIO (documento não oficial) como
 * "extrato real de referência" (spec §"Como cadastrar um novo layout"). Roda no `pnpm test` puro —
 * o unpdf não precisa de rede/DB.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';

import { bankStatementParser } from '#src/modules/financial/adapters/statement-parsers/bank-statement-parser.ts';

const BASE64 = readFileSync(
  new URL('./fixtures/bradesco-extrato-julho-2026.pdf.base64', import.meta.url),
  'utf8',
).trim();

describe('bankStatementParser — PDF (base64 → unpdf → parsePdf)', () => {
  it('extrai o extrato do PDF real e produz o mesmo ParsedStatement (23 transações)', async () => {
    const r = await bankStatementParser.parse('PDF', BASE64);
    assert.equal(r.ok, true, JSON.stringify(r));
    if (!r.ok) return;
    assert.equal(r.value.transactions.length, 23);
    assert.equal(r.value.transactions[0]?.fitid, 'PIX26070201');
    assert.equal(r.value.transactions[0]?.movement, 'Credit');
    assert.equal(r.value.openingBalanceCents, 2864075);
    assert.equal(r.value.closingBalanceCents, 4597574);
  });

  it('base64 que não é PDF → malformed-statement (não vaza exceção)', async () => {
    const r = await bankStatementParser.parse(
      'PDF',
      Buffer.from('não é um pdf').toString('base64'),
    );
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'malformed-statement');
  });
});
