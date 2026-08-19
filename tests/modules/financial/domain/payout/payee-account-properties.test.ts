import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk } from '#src/shared/index.ts';
import { decomposePayeeAccount } from '#src/modules/financial/domain/payout/payee-account.ts';
import { segmentA } from '#src/modules/financial/adapters/cnab/multipag-segments.ts';
import type { PayeePaymentTarget } from '#src/modules/financial/domain/payout/types.ts';

// Propriedades da decomposição, não casos.
//
// Os casos vivem em `payout-readiness.test.ts`. Aqui ficam as duas invariantes que um exercício
// exaustivo (17.280 combinações ASCII + 5.040 com whitespace Unicode, contra MySQL 8.4 real)
// mostrou serem o que de fato sustenta a regra — e que uma refatoração inocente quebraria em
// silêncio, porque nenhum caso isolado as expressa.

const NBSP = ' ';
const ZWSP = '​';

const target = (patch: Partial<PayeePaymentTarget>): PayeePaymentTarget => ({
  bank: '237',
  agency: '1234-5',
  accountNumber: '123456',
  checkDigit: '7',
  pixKey: null,
  ...patch,
});

// Produto cartesiano enxuto — o exaustivo roda fora do gate; aqui fica a amostra que ancora a
// propriedade sem custar segundos na suíte.
const BANKS = ['237', '1', '001', `237${NBSP}`, '\t237', ' 237 '];
// `0001` e `00000` entram SEM DV de propósito: é o caminho que o layout declara opcional (G009) e
// o único em que a posição 029 sai em branco. Uma lista só com DV presente deixaria o caso novo
// sem cobertura — e foi assim que ele passou despercebido na primeira versão deste arquivo.
const AGENCIES = [
  '1234-5',
  '0001-2',
  '0001',
  '00000',
  '1-2',
  `1234${NBSP}-${NBSP}5`,
  ' 1234 - 5 ',
  '12345-6',
];
const ACCOUNTS = ['123456', '123456-7', '123456-X', '123456789012', `123456${NBSP}`];
const DIGITS = ['7', 'X', 'x', '0', `7${NBSP}`];

describe('decomposePayeeAccount — o que passa cabe no segmento A', () => {
  // A invariante que impede o pior defeito possível deste módulo: o domínio dizer "pode pagar"
  // sobre um cadastro que produz registro torto. Um campo com largura errada não faz o banco
  // recusar o arquivo — desloca todos os seguintes e credita a conta de outra pessoa.
  it('todo cadastro aprovado produz campos com a largura exata das posições', () => {
    let checked = 0;
    for (const bank of BANKS) {
      for (const agency of AGENCIES) {
        for (const accountNumber of ACCOUNTS) {
          for (const checkDigit of DIGITS) {
            const r = decomposePayeeAccount(target({ bank, agency, accountNumber, checkDigit }));
            if (!isOk(r)) continue;
            checked += 1;
            const where = JSON.stringify({ bank, agency, accountNumber, checkDigit });
            // 021-023 · 024-028 · 029 · 030-041 · DV da conta.
            assert.match(r.value.bankCode, /^\d{3}$/, where);
            assert.match(r.value.agency, /^\d{5}$/, where);
            // O DV da agência é opcional (G009): vazio é resultado legítimo, e o campo Alfa de
            // uma posição sai em branco. O que NÃO pode é vir com mais de um caractere.
            assert.match(r.value.agencyDigit, /^[0-9X]?$/, where);
            assert.match(r.value.accountNumber, /^\d{12}$/, where);
            assert.match(r.value.accountDigit, /^[0-9X]$/, where);
          }
        }
      }
    }
    // Guarda contra verde por vacuidade: se um refactor passar a recusar tudo, as asserções
    // acima nunca rodariam e o teste ficaria verde sem ter verificado nada.
    assert.ok(checked > 100, `esperava exercitar muitos aprovados, exercitou ${String(checked)}`);
  });

  // Fecha o ciclo até o arquivo: não basta a largura estar certa isoladamente, o registro
  // montado tem de ter 240 posições e os campos onde o layout os declara.
  it('todo cadastro aprovado monta um segmento A de 240 posições', () => {
    for (const agency of AGENCIES) {
      for (const accountNumber of ACCOUNTS) {
        const r = decomposePayeeAccount(target({ agency, accountNumber }));
        if (!isOk(r)) continue;
        const line = segmentA({
          bankCode: '237',
          batchNumber: 1,
          recordNumber: 1,
          payee: {
            name: 'FORNECEDOR TESTE',
            documentType: '2',
            document: '11222333000181',
            bankCode: r.value.bankCode,
            agency: r.value.agency,
            agencyDigit: r.value.agencyDigit,
            accountNumber: r.value.accountNumber,
            accountDigit: r.value.accountDigit,
          },
          paymentDate: new Date('2026-08-14T12:00:00Z'),
          valueCents: 123_456,
          // P001 — exigida desde a #751. Aqui é fixture: o que este teste mede é a LARGURA dos
          // campos decompostos, não a escolha da câmara.
          clearingHouse: '018',
        });
        assert.ok(isOk(line), `segmento A recusou cadastro aprovado: ${agency} / ${accountNumber}`);
        assert.equal(line.value.length, 240);
        assert.equal(line.value.slice(20, 23), r.value.bankCode);
        assert.equal(line.value.slice(23, 28), r.value.agency);
        // DV ausente ocupa a posição com BRANCO — `Alfa` alinha à esquerda e completa com brancos
        // à direita (p. 14 do layout). Comparar com a string vazia crua acusaria falha onde o
        // comportamento está correto.
        assert.equal(line.value.slice(28, 29), r.value.agencyDigit.padEnd(1, ' '));
        assert.equal(line.value.slice(29, 41), r.value.accountNumber);
      }
    }
  });
});

describe('decomposePayeeAccount — whitespace invisível não decide pagamento', () => {
  // Espaço não-quebrável e tabulação chegam por copy-paste de PDF e por ETL de sistema legado.
  // Recusar por um caractere que ninguém enxerga mandaria o operador "corrigir" um campo que
  // parece correto na tela. A saída continua limpa — é a propriedade acima que garante isso.
  for (const [nome, ws] of [
    ['espaço não-quebrável', NBSP],
    ['tabulação', '\t'],
    ['quebra de linha', '\n'],
  ] as const) {
    it(`tolera ${nome} nas bordas`, () => {
      const r = decomposePayeeAccount(
        target({
          bank: `${ws}237${ws}`,
          agency: `${ws}1234-5${ws}`,
          accountNumber: `${ws}123456${ws}`,
          // `0` é o DV que o Bradesco calcula para `123456` (#734). O que este caso mede é o
          // whitespace ser aparado antes de qualquer leitura — inclusive antes do cálculo do
          // dígito, que receberia `\t7\t` e reprovaria por motivo errado.
          checkDigit: `${ws}0${ws}`,
        }),
      );
      assert.ok(isOk(r), `esperava aprovar com ${nome}`);
      assert.equal(r.value.agency, '01234');
      assert.equal(r.value.agencyDigit, '5');
    });
  }

  // Zero-width space NÃO é whitespace para o JS nem para o ICU do MySQL. Fica recusado nos dois
  // lados — e o teste existe para que a simetria seja deliberada, não coincidência.
  it('recusa zero-width space, que não é whitespace em lugar nenhum', () => {
    const r = decomposePayeeAccount(target({ agency: `1234-5${ZWSP}` }));
    assert.ok(!isOk(r));
  });

  // Dígito full-width não é dígito: `\d` do JS e `[0-9]` do ICU concordam em recusar. Aceitá-lo
  // exigiria normalização Unicode que ninguém pediu — e o campo posicional é ASCII.
  it('recusa dígito full-width', () => {
    const r = decomposePayeeAccount(target({ bank: '２３７' }));
    assert.ok(!isOk(r));
  });
});
