/**
 * FIN-PDF-STATEMENT-PARSER — validação de GABARITO (spec §"Validações automáticas"): o PDF produz
 * EXATAMENTE o mesmo `ParsedStatement` que o OFX do mesmo extrato. Par real fictício (conta-corrente
 * julho/2026): 23 transações, cruzadas por `documento`=FITID (valor, tipo e data idênticos).
 *
 * É a prova de "o PDF replica o OFX": se um extrato novo divergir, este teste quebra.
 * Roda no `pnpm test` puro (unpdf in-process; OFX é texto).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';

import { bankStatementParser } from '#src/modules/financial/adapters/statement-parsers/bank-statement-parser.ts';
import { parseOfx } from '#src/modules/financial/adapters/statement-parsers/ofx-parser.ts';

const fixture = (name: string): string =>
  readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

const PDF_BASE64 = fixture('extrato-cc-julho-2026.pdf.base64').trim();
const OFX = fixture('extrato-cc-julho-2026.ofx');

describe('gabarito — PDF × OFX do mesmo extrato (cruzamento por FITID)', () => {
  it('contagem e cada transação casam (documento=FITID, valor, tipo, data)', async () => {
    const pdfR = await bankStatementParser.parse('PDF', PDF_BASE64);
    const ofxR = parseOfx(OFX);
    assert.equal(pdfR.ok, true, JSON.stringify(pdfR));
    assert.equal(ofxR.ok, true, JSON.stringify(ofxR));
    if (!pdfR.ok || !ofxR.ok) return;

    const pdf = pdfR.value.transactions;
    const ofx = ofxR.value.transactions;
    assert.equal(pdf.length, ofx.length, 'contagem PDF == OFX');
    assert.equal(pdf.length, 23);

    const byFitid = new Map(pdf.map((t) => [t.fitid, t]));
    for (const o of ofx) {
      const p = byFitid.get(o.fitid);
      assert.ok(p, `FITID ${o.fitid ?? '?'} presente no PDF`);
      assert.equal(p.valueCents, o.valueCents, `valor ${o.fitid ?? '?'}`);
      assert.equal(p.movement, o.movement, `tipo ${o.fitid ?? '?'}`);
      assert.equal(
        p.date.toISOString().slice(0, 10),
        o.date.toISOString().slice(0, 10),
        `data ${o.fitid ?? '?'}`,
      );
    }
  });

  it('saldo final do PDF == LEDGERBAL do OFX (45.975,74)', async () => {
    const pdfR = await bankStatementParser.parse('PDF', PDF_BASE64);
    assert.equal(pdfR.ok, true);
    if (!pdfR.ok) return;
    assert.equal(pdfR.value.closingBalanceCents, 4597574);
  });
});
