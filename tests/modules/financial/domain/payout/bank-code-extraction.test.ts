import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk } from '#src/shared/index.ts';
import {
  decomposePayeeAccount,
  readPayeeBankCode,
} from '#src/modules/financial/domain/payout/payee-account.ts';
import type { PayeePaymentTarget } from '#src/modules/financial/domain/payout/types.ts';

/**
 * Extração do código do banco a partir do formato REAL do cadastro.
 *
 * Origem: análise do dump de produção do legado (14/08/2026). A premissa que sustentava a issue
 * #708 — "o cadastro guarda o banco como nome em texto livre, e converter exige uma tabela de-para
 * com curadoria" — estava errada. O código de compensação **já está no dado**, prefixando o nome:
 * `237 - Banco Bradesco S.A.`. Todas as 9 grafias distintas dos 85 fornecedores com bloco bancário
 * seguem esse formato.
 *
 * A ETL não transforma o campo (`scripts/etl/mappers/supplier.mapper.ts:94` passa
 * `row.bancaryInfoBank` literal), então o core-api guarda a mesma string.
 *
 * ⚠️ O que a extração NÃO faz: procurar dígitos em posição arbitrária. `Banco 237` não vira `237`.
 * Um código só é código quando PREFIXA o nome, separado — em qualquer outro lugar, "achar" três
 * dígitos é adivinhação, e adivinhar as posições 021-023 credita a conta de outro banco.
 */

// ⚠️ `checkDigit: '0'` é o DV que o algoritmo do Bradesco produz para a conta `123456` (#734,
// `account-check-digit.ts`). A conta aqui é cenário, não a matéria do teste — mas precisa ser um
// cadastro que o banco aceitaria, senão os casos cujo `bank` resolve para 237 passam a ser
// recusados pelo dígito e o arquivo inteiro fica vermelho por um motivo que não é o dele.
const withBank = (bank: string): PayeePaymentTarget => ({
  bank,
  agency: '1234-5',
  accountNumber: '123456',
  checkDigit: '0',
  pixKey: null,
});

const codeOf = (bank: string): string | null => {
  const r = decomposePayeeAccount(withBank(bank));
  return isOk(r) ? r.value.bankCode : null;
};

describe('readBankCode — as grafias que existem no cadastro real', () => {
  // As 9 do dump, verbatim. Se o formato mudar em produção, é aqui que se descobre.
  const REAL: readonly (readonly [string, string])[] = [
    ['260 - NU Pagamentos S.A. – Nubank', '260'],
    ['077 - Banco Inter S.A.', '077'],
    ['237 - Banco Bradesco S.A.', '237'],
    ['336 - Banco C6 S.A – C6 Bank', '336'],
    ['001 - Banco do Brasil S.A.', '001'],
    ['341 - Itaú Unibanco S.A.', '341'],
    ['033 - Banco Santander (Brasil) S.A.', '033'],
    ['290 - Pagseguro Internet S.A. – PagBank', '290'],
    ['348 - Banco XP S.A.', '348'],
  ];

  for (const [raw, expected] of REAL) {
    it(`extrai ${expected} de "${raw}"`, () => {
      assert.equal(codeOf(raw), expected);
    });
  }

  // O nome contém en-dash interno (`S.A. – Nubank`). O separador do PREFIXO é o que importa, e
  // parar no primeiro é o que impede a extração de se confundir com a pontuação do nome.
  it('não se confunde com o travessão dentro do nome', () => {
    assert.equal(codeOf('260 - NU Pagamentos S.A. – Nubank'), '260');
    assert.equal(codeOf('336 - Banco C6 S.A – C6 Bank'), '336');
  });
});

describe('readBankCode — variações de formatação que o cadastro pode produzir', () => {
  it('aceita o código puro, sem nome (o que já funcionava)', () => {
    assert.equal(codeOf('237'), '237');
    assert.equal(codeOf('1'), '001');
  });

  it('alinha o código em três dígitos', () => {
    assert.equal(codeOf('1 - Banco do Brasil'), '001');
    assert.equal(codeOf('77 - Inter'), '077');
  });

  it('tolera espaçamento irregular em volta do separador', () => {
    for (const raw of ['237-Bradesco', '237 -Bradesco', '237  -  Bradesco', '  237 - Bradesco  ']) {
      assert.equal(codeOf(raw), '237', raw);
    }
  });

  it('aceita travessão e traço longo como separador', () => {
    assert.equal(codeOf('237 – Bradesco'), '237');
    assert.equal(codeOf('237 — Bradesco'), '237');
  });
});

describe('readBankCode — o que continua sendo inconvertível', () => {
  // A regra que protege as posições 021-023: código é PREFIXO, nunca dígito achado no meio.
  it('recusa nome sem código, mesmo contendo dígitos', () => {
    for (const raw of ['Bradesco S.A.', 'Banco 237', 'Itau 341 Unibanco', 'Banco do Brasil']) {
      assert.equal(codeOf(raw), null, raw);
    }
  });

  it('recusa prefixo numérico que não cabe em três dígitos', () => {
    assert.equal(codeOf('2371 - Banco'), null);
    assert.equal(codeOf('12345 - Banco'), null);
  });

  it('recusa código sem nome depois do separador', () => {
    assert.equal(codeOf('237 - '), null);
    assert.equal(codeOf('237-'), null);
  });

  it('recusa campo vazio ou só espaços', () => {
    assert.equal(codeOf(''), null);
    assert.equal(codeOf('   '), null);
  });

  // Separador que não separa: sem hífen, `237 Bradesco` é ambíguo — pode ser nome que começa com
  // número. Recusar é a escolha conservadora, e o CA1 dirá se essa grafia existe.
  it('recusa código colado ao nome sem separador', () => {
    assert.equal(codeOf('237 Bradesco'), null);
    assert.equal(codeOf('237Bradesco'), null);
  });
});

/**
 * `readPayeeBankCode` — a MESMA leitura, isolada do resto do cadastro (#755).
 *
 * A razão de existir está no helper `withBank` no topo deste arquivo: para testar a extração do
 * banco, ele precisa montar um cadastro com agência, conta e um DV que o algoritmo do Bradesco
 * aceite — senão os casos que resolvem para `237` são recusados pelo dígito e o arquivo fica
 * vermelho por um motivo que não é o dele. Essa dependência é real e vale para quem MEDE: um
 * cadastro do Bradesco com dígito divergente continua sendo do Bradesco, e some da contagem se a
 * pergunta "de qual instituição é este?" tiver de passar pela pergunta "isto pode virar arquivo?".
 */
describe('readPayeeBankCode — lê a instituição sem exigir cadastro emitível', () => {
  const bankOf = (raw: string | null): string | null => {
    const r = readPayeeBankCode(raw);
    return isOk(r) ? r.value : null;
  };

  it('concorda com a decomposição completa quando o cadastro é válido', () => {
    for (const [raw, expected] of [
      ['237 - Banco Bradesco S.A.', '237'],
      ['001 - Banco do Brasil S.A.', '001'],
      ['77 - Inter', '077'],
    ] as const) {
      assert.equal(bankOf(raw), expected, raw);
      assert.equal(codeOf(raw), expected, `${raw} (decomposição completa)`);
    }
  });

  // O caso que motiva a função. `decomposePayeeAccount` recusa este cadastro inteiro — e está certo,
  // porque o emissor não pode aproveitar meio cadastro. Mas a MEDIÇÃO precisa saber que ele é do 237.
  it('lê o banco mesmo quando o resto do cadastro é inválido', () => {
    const dvErrado: PayeePaymentTarget = {
      bank: '237 - Banco Bradesco S.A.',
      agency: '1234-5',
      accountNumber: '123456',
      checkDigit: '9', // o algoritmo produz '0' para esta conta
      pixKey: null,
    };

    assert.equal(isOk(decomposePayeeAccount(dvErrado)), false, 'o emissor recusa, e deve recusar');
    assert.equal(bankOf(dvErrado.bank), '237', 'a medição continua sabendo de qual banco é');
  });

  it('devolve a lacuna nomeada quando o banco é ilegível — não string vazia', () => {
    const semCodigo = readPayeeBankCode('Banco sem código');
    assert.ok(!isOk(semCodigo));
    assert.deepEqual(semCodigo.error, { field: 'payee-bank-code', reason: 'unmappable' });

    const vazio = readPayeeBankCode('');
    assert.ok(!isOk(vazio));
    assert.deepEqual(vazio.error, { field: 'payee-bank-code', reason: 'missing' });
  });

  it('trata null, undefined e branco como ausência — as três formas que o cadastro produz', () => {
    for (const raw of [null, undefined, '   ']) {
      const r = readPayeeBankCode(raw);
      assert.ok(!isOk(r), String(raw));
      assert.equal(r.error.reason, 'missing', String(raw));
    }
  });
});
