import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr } from '#src/shared/index.ts';
// W0 RED: o adapter csv-parser ainda não existe.
import { parseCsv } from '#src/modules/financial/adapters/statement-parsers/csv-parser.ts';

const CSV = `data;tipo;valor;nome;descricao;saldo
2024-05-18;DEBITO;-845.00;FORNECEDOR X;NFS 2024-0537;500.00
2024-05-19;CREDITO;1200.00;CLIENTE Y;recebimento;1700.00`;

// Critérios em .claude/.pipeline/FIN-RECON-PARSERS/000-request.md (CA2, CA3, CA4).
describe('financial/adapters/statement-parsers/csv-parser', () => {
  it('CA2: CSV válido → 2 transações com fitid null (sem FITID nativo)', () => {
    const r = parseCsv(CSV);
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.transactions.length, 2);
      assert.equal(r.value.transactions[0]?.fitid, null);
      assert.equal(r.value.transactions[1]?.fitid, null);
      assert.equal(r.value.transactions[0]?.movement, 'Debit');
      assert.equal(r.value.transactions[0]?.valueCents, 84500);
      assert.equal(r.value.transactions[1]?.movement, 'Credit');
    }
  });

  it('CA2 (#159): coluna tipo é normalizada p/ o union EntryType (fallback Other)', () => {
    const csv = `data;tipo;valor;nome;descricao;saldo
2024-05-18;TARIFA;-4.90;BANCO;tarifa pix;500.00
2024-05-19;PIX;-10.00;FULANO;pix enviado;490.00
2024-05-20;TRANSFERENCIA;-20.00;SICRANO;transf;470.00
2024-05-21;XPTO;-30.00;DESCONHECIDO;?;440.00`;
    const r = parseCsv(csv);
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.transactions[0]?.entryType, 'Fee');
      assert.equal(r.value.transactions[1]?.entryType, 'PIX');
      assert.equal(r.value.transactions[2]?.entryType, 'Transfer');
      assert.equal(r.value.transactions[3]?.entryType, 'Other');
    }
  });

  it('CA3: CSV só com header (sem linhas) → malformed-statement', () => {
    const r = parseCsv('data;tipo;valor;nome;descricao;saldo');
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'malformed-statement');
  });

  it('CA4: conteúdo vazio → empty-content', () => {
    const r = parseCsv('');
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'empty-content');
  });
});
