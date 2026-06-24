// W0 RED (#146 / FIN-RECON-EXPORT-CSV-NIBO) — serializador puro do layout Nibo (15 colunas).
// CA1 (15 col + cabeçalho), CA2 (sinal + decimal vírgula), CA3 (rótulos), CA4 (transferência). Node puro.

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { toNiboCsv, type NiboExportRow } from '#src/modules/financial/adapters/export/nibo-csv.ts';

const NIBO_HEADER =
  'Tipo de transação;Nome do contato;Descrição;Categoria;Valor;Vencimento;Previsto para;Competência;Centro de custo;Favorito;Tipo de contato;Referência;Conta;Data pag/rec/transferência;Anotação';

const BOM_CP = 0xfeff;
const hasBom = (csv: string): boolean => csv.codePointAt(0) === BOM_CP;
const lines = (csv: string): string[] => (hasBom(csv) ? csv.slice(1) : csv).trimEnd().split('\r\n');

const lancamento = (over: Partial<NiboExportRow> = {}): NiboExportRow => ({
  transactionType: 'Lançamento',
  contactName: 'Fornecedor Alfa',
  description: 'Pagamento NF 123',
  category: 'Outras despesas',
  valueCents: -200000,
  dueDate: new Date('2026-03-10T00:00:00.000Z'),
  forecastDate: null,
  competencia: new Date('2026-03-01T00:00:00.000Z'),
  costCenter: 'Financeiro',
  favorite: 'Não',
  contactType: 'Fornecedor',
  reference: 'NF-123',
  account: 'Itaú',
  paymentDate: new Date('2026-03-12T00:00:00.000Z'),
  annotation: '',
  ...over,
});

const transferencia = (over: Partial<NiboExportRow> = {}): NiboExportRow => ({
  transactionType: 'Transferência',
  contactName: '',
  description: '',
  category: '',
  valueCents: 50000,
  dueDate: null,
  forecastDate: null,
  competencia: null,
  costCenter: '',
  favorite: 'Não',
  contactType: '',
  reference: '',
  account: 'Bradesco',
  paymentDate: new Date('2026-03-15T00:00:00.000Z'),
  annotation: '',
  ...over,
});

describe('financial/adapters/export — toNiboCsv (#146)', () => {
  it('CA1: cabeçalho idêntico ao template (15 colunas, ordem)', () => {
    const csv = toNiboCsv([lancamento()]);
    assert.equal(lines(csv)[0], NIBO_HEADER);
    assert.equal(NIBO_HEADER.split(';').length, 15);
  });

  it('CA1: BOM no início (Nibo/Excel)', () => {
    const csv = toNiboCsv([lancamento()]);
    assert.equal(hasBom(csv), true);
  });

  it('CA2: Valor com sinal e decimal vírgula (− pagamento)', () => {
    const csv = toNiboCsv([lancamento({ valueCents: -200000 })]);
    const cells = lines(csv)[1]?.split(';') ?? [];
    assert.equal(cells[4], '-2000,00');
  });

  it('CA2: Valor positivo (recebimento) sem sinal de menos', () => {
    const csv = toNiboCsv([lancamento({ valueCents: 100000 })]);
    const cells = lines(csv)[1]?.split(';') ?? [];
    assert.equal(cells[4], '1000,00');
  });

  it('CA3: rótulos + datas dd/MM/aaaa + tipo de contato', () => {
    const csv = toNiboCsv([lancamento()]);
    const cells = lines(csv)[1]?.split(';') ?? [];
    assert.equal(cells[0], 'Lançamento');
    assert.equal(cells[1], 'Fornecedor Alfa');
    assert.equal(cells[5], '10/03/2026'); // Vencimento dd/MM/aaaa
    assert.equal(cells[7], '01/03/2026'); // Competência
    assert.equal(cells[10], 'Fornecedor'); // Tipo de contato
    assert.equal(cells[13], '12/03/2026'); // Data pag/rec
  });

  it('CA4: Transferência — Conta = destino, sem contato/categoria/tipo-contato', () => {
    const csv = toNiboCsv([transferencia({ account: 'Bradesco' })]);
    const cells = lines(csv)[1]?.split(';') ?? [];
    assert.equal(cells[0], 'Transferência');
    assert.equal(cells[1], ''); // Nome do contato vazio
    assert.equal(cells[3], ''); // Categoria vazia
    assert.equal(cells[10], ''); // Tipo de contato vazio
    assert.equal(cells[12], 'Bradesco'); // Conta = destino
    assert.equal(cells[4], '500,00');
  });

  it('CA1: N linhas (1 por título) + cabeçalho', () => {
    const csv = toNiboCsv([lancamento(), lancamento({ reference: 'NF-124' }), transferencia()]);
    assert.equal(lines(csv).length, 4); // header + 3
  });
});
