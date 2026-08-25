import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
// W0 RED: os registros de envelope (header/trailer) do Multipag ainda não existem.
import {
  fileHeader,
  batchHeader,
  batchTrailer,
  fileTrailer,
  type CedenteHeaderData,
} from '#src/modules/financial/adapters/cnab/multipag-records.ts';

const CEDENTE: CedenteHeaderData = {
  bankCode: '237',
  documentType: '2',
  document: '12345678000199',
  // Seis dígitos, e é o máximo representável (#804): o validador do banco lê o convênio apenas em
  // 033-038 e exige 039-052 em branco. `000000` é a máscara reservada — ver
  // `tests/cleanup/bank-fixture-masking.test.ts`.
  convenio: '000000',
  agency: '1234',
  agencyDigit: '5',
  accountNumber: '567890',
  accountDigit: '1',
  accountAgencyDigit: '2',
  companyName: 'ASSOCIACAO BEM COMUM',
};

const AT = new Date(Date.UTC(2026, 7, 10, 14, 5, 9));

// Serviço, forma, versão do layout e indicativo chegam JUNTOS, do perfil da rota: são a parte do
// envelope que muda de uma seção do manual para outra.
const TRANSFER_PROFILE = {
  serviceType: '20',
  launchForm: '41',
  batchLayoutVersion: '045',
  paymentIndicator: '01',
} as const;

// Campo do CNAB é 1-indexed e inclusivo nas duas pontas — o helper fala a mesma língua do layout,
// para o teste poder ser conferido contra o PDF sem conversão mental.
const at = (line: string, from: number, to: number): string => line.slice(from - 1, to);

const line = (r: ReturnType<typeof fileHeader>): string => {
  assert.ok(isOk(r), `esperava ok, veio ${isErr(r) ? r.error : '?'}`);
  return r.value;
};

describe('Multipag — Header de Arquivo (tipo 0)', () => {
  const record = line(
    fileHeader({ cedente: CEDENTE, bankName: 'BRADESCO', nsa: 42, generatedAt: AT }),
  );

  it('tem exatamente 240 posições', () => {
    assert.equal(record.length, 240);
  });

  it('abre com banco, lote 0000 e tipo de registro 0', () => {
    assert.equal(at(record, 1, 3), '237');
    assert.equal(at(record, 4, 7), '0000');
    assert.equal(at(record, 8, 8), '0');
  });

  it('carrega inscrição, convênio e conta do cedente nas posições do layout', () => {
    assert.equal(at(record, 18, 18), '2');
    assert.equal(at(record, 19, 32), '12345678000199');
    assert.equal(at(record, 53, 57), '01234');
    assert.equal(at(record, 59, 70), '000000567890');
  });

  // #804, defeito 1. O layout declara G007 com 20 posições Alfa (033-052) — e o emissor era
  // aderente a ele. O Validador Universal, porém, lê o convênio SÓ em 033-038 e exige o resto em
  // branco: um convênio mais longo era silenciosamente truncado pelo banco, que processava o
  // arquivo sob outro contrato. Layout e validador divergem, e é o validador quem paga.
  it('escreve o convênio em 033-038 e deixa 039-052 em branco', () => {
    assert.equal(at(record, 33, 38), '000000');
    assert.equal(at(record, 39, 52), ' '.repeat(14));
    assert.equal(record.length, 240);
  });

  // Truncar é o modo de falha caro: o arquivo sai bem formado, o banco aceita, e o pagamento corre
  // sob um convênio que não é o nosso. Recusar na emissão é a mesma disciplina que `positional.ts`
  // já aplica a campo numérico que estoura.
  it('recusa convênio que não cabe em 6 posições, em vez de deixar o banco truncar', () => {
    const r = fileHeader({
      cedente: { ...CEDENTE, convenio: '0000001' },
      bankName: 'BRADESCO',
      nsa: 42,
      generatedAt: AT,
    });
    assert.ok(isErr(r));
    // O erro tem nome PRÓPRIO, e não um `numeric-field-*` emprestado: o convênio é campo Alfa, e
    // quem recebe a recusa precisa saber que o problema é o cadastro do convênio — não um número
    // que estourou. É o que permite a borda dizer ao operador o que corrigir.
    assert.equal(r.error, 'convenio-field-overflow');
  });

  // Convênio vazio produzia 20 brancos e seguia adiante: arquivo aceito pelo banco, processado sem
  // contrato identificado. Distinto do overflow de propósito — ali há convênio e ele não cabe;
  // aqui não há convênio, e a ação de quem corrige é outra.
  it('recusa convênio ausente, em vez de emitir o campo em branco', () => {
    const r = fileHeader({
      cedente: { ...CEDENTE, convenio: '   ' },
      bankName: 'BRADESCO',
      nsa: 42,
      generatedAt: AT,
    });
    assert.ok(isErr(r));
    assert.equal(r.error, 'convenio-field-empty');
  });

  // #804, defeito 2. G020 tem domínio fechado no manual, e o emissor escrevia `00000` — valor fora
  // do domínio, que o validador recusa. Não é campo livre.
  it('declara densidade de gravação dentro do domínio do layout', () => {
    assert.equal(at(record, 167, 171), '01600');
  });

  it('marca remessa, data, hora e NSA', () => {
    assert.equal(at(record, 143, 143), '1');
    assert.equal(at(record, 144, 151), '10082026');
    assert.equal(at(record, 152, 157), '140509');
    assert.equal(at(record, 158, 163), '000042');
  });

  it('declara a versão de layout de arquivo que o banco espera', () => {
    assert.equal(at(record, 164, 166), '089');
  });

  it('recusa NSA que não cabe em 6 dígitos, em vez de truncar', () => {
    const r = fileHeader({ cedente: CEDENTE, bankName: 'BRADESCO', nsa: 1234567, generatedAt: AT });
    assert.ok(isErr(r));
    assert.equal(r.error, 'numeric-field-overflow');
  });
});

describe('Multipag — Header de Lote (tipo 1)', () => {
  const record = line(batchHeader({ cedente: CEDENTE, batchNumber: 1, profile: TRANSFER_PROFILE }));

  it('tem exatamente 240 posições', () => {
    assert.equal(record.length, 240);
  });

  it('abre com banco, número do lote e tipo de registro 1', () => {
    assert.equal(at(record, 1, 3), '237');
    assert.equal(at(record, 4, 7), '0001');
    assert.equal(at(record, 8, 8), '1');
  });

  // O convênio aparece DUAS vezes no arquivo, nas mesmas posições (033-052), e o laudo do
  // validador acusou as duas. Corrigir só o header de arquivo deixaria metade do defeito de pé —
  // por isso a regra é conferida aqui também, e não por herança do teste anterior.
  it('escreve o convênio em 033-038 e deixa 039-052 em branco', () => {
    assert.equal(at(record, 33, 38), '000000');
    assert.equal(at(record, 39, 52), ' '.repeat(14));
    assert.equal(record.length, 240);
  });

  it('recusa convênio que não cabe em 6 posições, em vez de deixar o banco truncar', () => {
    const r = batchHeader({
      cedente: { ...CEDENTE, convenio: '0000001' },
      batchNumber: 1,
      profile: TRANSFER_PROFILE,
    });
    assert.ok(isErr(r));
    assert.equal(r.error, 'convenio-field-overflow');
  });

  // Mesmo campo, mesmo erro, outro registro: a regra não é do header de arquivo, é do convênio.
  it('recusa convênio ausente, em vez de emitir o campo em branco', () => {
    const r = batchHeader({
      cedente: { ...CEDENTE, convenio: '' },
      batchNumber: 1,
      profile: TRANSFER_PROFILE,
    });
    assert.ok(isErr(r));
    assert.equal(r.error, 'convenio-field-empty');
  });

  it('marca operação C e escreve serviço, forma e versão de layout vindos do perfil', () => {
    assert.equal(at(record, 9, 9), 'C');
    assert.equal(at(record, 10, 11), TRANSFER_PROFILE.serviceType);
    assert.equal(at(record, 12, 13), TRANSFER_PROFILE.launchForm);
    assert.equal(at(record, 14, 16), TRANSFER_PROFILE.batchLayoutVersion);
  });

  // A versão do layout do lote NÃO é constante do módulo: cada seção do manual declara a sua, e
  // era ser uma constante única que fazia o header parecer um formato só (#711).
  it('a versão do layout acompanha o perfil, não uma constante do módulo', () => {
    const collection = line(
      batchHeader({
        cedente: CEDENTE,
        batchNumber: 1,
        profile: { ...TRANSFER_PROFILE, batchLayoutVersion: '040', paymentIndicator: null },
      }),
    );
    assert.equal(at(collection, 14, 16), '040');
  });

  // O indicativo existe na seção de pagamentos e não existe na de cobrança, onde aquelas oito
  // posições são brancos. Emiti-lo sempre preencheria campo que a seção do boleto não prevê.
  it('emite o indicativo quando a seção o tem, e brancos quando não tem', () => {
    assert.equal(at(record, 223, 224), '01');
    assert.equal(at(record, 225, 230), ' '.repeat(6));

    const collection = line(
      batchHeader({
        cedente: CEDENTE,
        batchNumber: 1,
        profile: { ...TRANSFER_PROFILE, paymentIndicator: null },
      }),
    );
    assert.equal(at(collection, 223, 230), ' '.repeat(8));
    assert.equal(collection.length, 240);
  });
});

describe('Multipag — Trailer de Lote (tipo 5)', () => {
  const record = line(
    batchTrailer({ bankCode: '237', batchNumber: 1, recordCount: 4, totalCents: 123456 }),
  );

  it('tem exatamente 240 posições', () => {
    assert.equal(record.length, 240);
  });

  it('fecha o lote com tipo 5 e os totais de conferência', () => {
    assert.equal(at(record, 4, 7), '0001');
    assert.equal(at(record, 8, 8), '5');
    assert.equal(at(record, 18, 23), '000004');
    assert.equal(at(record, 24, 41), '000000000000123456');
  });
});

describe('Multipag — Trailer de Arquivo (tipo 9)', () => {
  const record = line(fileTrailer({ bankCode: '237', batchCount: 1, recordCount: 6 }));

  it('tem exatamente 240 posições', () => {
    assert.equal(record.length, 240);
  });

  it('usa o lote reservado 9999 e o tipo 9', () => {
    assert.equal(at(record, 4, 7), '9999');
    assert.equal(at(record, 8, 8), '9');
  });

  it('carrega quantidade de lotes e de registros do arquivo', () => {
    assert.equal(at(record, 18, 23), '000001');
    assert.equal(at(record, 24, 29), '000006');
  });
});

describe('Multipag — o envelope fecha sobre si mesmo', () => {
  // A contagem do trailer de arquivo inclui TODOS os registros, envelope incluído. Um lote com
  // 2 detalhes fecha em 6: header de arquivo + header de lote + 2 detalhes + trailer de lote +
  // trailer de arquivo. Errar essa conta é rejeição na recepção, não erro de conteúdo.
  it('a contagem declarada bate com as linhas efetivamente emitidas', () => {
    const detailCount = 2;
    const records = [
      line(fileHeader({ cedente: CEDENTE, bankName: 'BRADESCO', nsa: 1, generatedAt: AT })),
      line(batchHeader({ cedente: CEDENTE, batchNumber: 1, profile: TRANSFER_PROFILE })),
      ...Array.from({ length: detailCount }, () => 'x'.repeat(240)),
      line(
        batchTrailer({
          bankCode: '237',
          batchNumber: 1,
          recordCount: detailCount + 2,
          totalCents: 1,
        }),
      ),
    ];
    const trailer = line(
      fileTrailer({ bankCode: '237', batchCount: 1, recordCount: records.length + 1 }),
    );

    assert.equal(at(trailer, 24, 29), '000006');
    assert.equal([...records, trailer].length, 6);
    assert.ok([...records, trailer].every((r) => r.length === 240));
  });
});
