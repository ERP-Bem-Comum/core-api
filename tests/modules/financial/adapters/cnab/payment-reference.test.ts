// Os critérios de aceite da #752, um a um. A composição adotada (decisão do Gabriel em 19/08/2026)
// é `AAAAMMDD` + `NSA(6)` + `índice(4)` = 18 das 20 posições do G064, persistida no vínculo
// remessa↔documento — é a persistência que fecha o CA2, e ela é coberta na suíte de integração.
//
// Por que a alternativa barata foi descartada: derivar a referência do `documentId` sozinho não
// custaria migração, mas o mesmo documento pode voltar a uma remessa NOVA depois de `discard`
// liberá-lo — e aí duas remessas distintas carregariam a MESMA referência, que é exatamente o que o
// CA4 proíbe. O bloco de NSA é o que separa as duas emissões.
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk } from '#src/shared/index.ts';
import {
  buildPaymentReference,
  MAX_REFERENCE_LENGTH,
} from '#src/modules/financial/adapters/cnab/payment-reference.ts';
import { segmentA, type Payee } from '#src/modules/financial/adapters/cnab/multipag-segments.ts';

const DOC = '3f2a9c1b-4e7d-4a05-b6b2-000000000001';
const AT = new Date('2026-08-19T12:00:00Z');

const build = (over: Partial<Parameters<typeof buildPaymentReference>[0]> = {}) =>
  buildPaymentReference({ documentId: DOC, nsa: 123, indexInFile: 45, generatedAt: AT, ...over });

describe('payment-reference — G064 (#752)', () => {
  it('CA1: emite referência não vazia', () => {
    const r = build();
    assert.ok(isOk(r));
    assert.ok(r.value.length > 0);
  });

  it('CA5: cabe nas 20 posições, sem truncar', () => {
    const r = build();
    assert.ok(isOk(r));
    assert.equal(r.value, '20260819000123' + '0045');
    assert.ok(r.value.length <= MAX_REFERENCE_LENGTH);
  });

  // CA2, metade estática: a referência é DECOMPONÍVEL — dela se lê a data, o NSA e o índice. A outra
  // metade (resolver o documento a partir dela) exige o vínculo persistido e vive na integração.
  it('CA2: os três blocos são legíveis na referência emitida', () => {
    const r = build({ nsa: 7, indexInFile: 1 });
    assert.ok(isOk(r));
    assert.equal(r.value.slice(0, 8), '20260819');
    assert.equal(r.value.slice(8, 14), '000007');
    assert.equal(r.value.slice(14, 18), '0001');
  });

  // O caso que matou a alternativa barata: MESMO documento, remessas diferentes.
  it('CA4: o mesmo documento reemitido noutra remessa recebe referência diferente', () => {
    const primeira = build({ nsa: 123 });
    const reemissao = build({ nsa: 124 });
    assert.ok(isOk(primeira) && isOk(reemissao));
    assert.notEqual(primeira.value, reemissao.value);
  });

  it('CA4: posições distintas no mesmo arquivo não colidem', () => {
    const a = build({ indexInFile: 1 });
    const b = build({ indexInFile: 2 });
    assert.ok(isOk(a) && isOk(b));
    assert.notEqual(a.value, b.value);
  });

  // CA3 — o fallback silencioso deixa de existir, e cada recusa nomeia o documento.
  describe('CA3: recusa nomeada, nunca referência inválida', () => {
    const casos = [
      { nome: 'documentId vazio', over: { documentId: '   ' } },
      { nome: 'nsa zero', over: { nsa: 0 } },
      { nome: 'nsa acima do que o header comporta', over: { nsa: 1_000_000 } },
      { nome: 'nsa fracionário', over: { nsa: 1.5 } },
      { nome: 'índice zero', over: { indexInFile: 0 } },
      { nome: 'índice acima da faixa', over: { indexInFile: 10_000 } },
      { nome: 'data inválida', over: { generatedAt: new Date('nao-e-data') } },
    ];

    for (const caso of casos) {
      it(caso.nome, () => {
        const r = build(caso.over);
        assert.ok(!isOk(r), `${caso.nome} deveria ser recusado`);
        assert.equal(r.error.tag, 'payment-reference-unresolvable');
        assert.ok(r.error.reason.length > 0, 'a recusa precisa dizer o motivo');
      });
    }

    it('a recusa identifica o documento, para o operador achar a linha', () => {
      const r = build({ nsa: 0 });
      assert.ok(!isOk(r));
      assert.equal(r.error.documentId, DOC);
    });
  });

  // O bloco de data é UTC de propósito: componentes locais fariam a MESMA remessa gerar referências
  // diferentes conforme o fuso do container, quebrando o CA4 sem nada parecer errado.
  it('o bloco de data não depende do fuso do processo', () => {
    const meiaNoiteUtc = build({ generatedAt: new Date('2026-08-19T00:30:00Z') });
    const quaseMeiaNoiteUtc = build({ generatedAt: new Date('2026-08-19T23:30:00Z') });
    assert.ok(isOk(meiaNoiteUtc) && isOk(quaseMeiaNoiteUtc));
    assert.equal(meiaNoiteUtc.value.slice(0, 8), '20260819');
    assert.equal(quaseMeiaNoiteUtc.value.slice(0, 8), '20260819');
  });
});

// BORDA A BORDA — a referência gerada aqui chega ao ARQUIVO, nas colunas que o layout manda.
//
// Os testes acima provam a composição; este prova que ela sobrevive à emissão. É o elo que separa
// "a função devolve 18 caracteres" de "o banco recebe a chave na posição certa" — e é onde um campo
// largo demais apareceria como registro deslocado, que nenhum teste de unidade da função pegaria.
describe('payment-reference — borda a borda até o Segmento A', () => {
  const PAYEE: Payee = {
    name: 'FORNECEDOR EXEMPLO LTDA',
    documentType: '2',
    document: '98765432000111',
    bankCode: '341',
    agency: '4321',
    agencyDigit: '0',
    accountNumber: '112233',
    accountDigit: '4',
    accountAgencyDigit: ' ',
  };

  // 1-indexed e inclusivo nas duas pontas, como o layout fala.
  const at = (line: string, from: number, to: number): string => line.slice(from - 1, to);

  const emit = (yourNumber: string): string => {
    const r = segmentA({
      bankCode: '237',
      batchNumber: 1,
      recordNumber: 1,
      payee: PAYEE,
      paymentDate: new Date(Date.UTC(2026, 7, 19)),
      valueCents: 123456,
      clearingHouse: '018',
      yourNumber,
    });
    assert.ok(isOk(r), 'o Segmento A recusou a referência emitida');
    return r.value;
  };

  it('a referência ocupa exatamente as colunas 074-093 (G064)', () => {
    const ref = build();
    assert.ok(isOk(ref));
    const linha = emit(ref.value);
    assert.equal(at(linha, 74, 93), ref.value.padEnd(20, ' '));
  });

  it('o registro continua com 240 posições — a referência não desloca o layout', () => {
    const ref = build();
    assert.ok(isOk(ref));
    assert.equal(emit(ref.value).length, 240);
  });

  // Sem a chave, o campo sai em branco e o retorno não casa com nada — o defeito que a #752 fecha.
  it('o campo fica em branco quando a referência não é informada — o estado que a #752 elimina', () => {
    const r = segmentA({
      bankCode: '237',
      batchNumber: 1,
      recordNumber: 1,
      payee: PAYEE,
      paymentDate: new Date(Date.UTC(2026, 7, 19)),
      valueCents: 123456,
      clearingHouse: '018',
    });
    assert.ok(isOk(r));
    assert.equal(at(r.value, 74, 93), ' '.repeat(20));
  });

  // O campo tem 20 e a referência 18: as duas sobras existem e são espaços, não lixo.
  it('as duas posições que sobram são preenchidas com espaço, não truncam nem vazam', () => {
    const ref = build();
    assert.ok(isOk(ref));
    assert.equal(ref.value.length, 18);
    assert.equal(at(emit(ref.value), 92, 93), '  ');
  });
});
