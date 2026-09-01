import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk } from '#src/shared/index.ts';
import {
  buildRemittanceFile,
  LINE_TERMINATOR,
} from '#src/modules/financial/adapters/cnab/remittance-file.ts';
import type { CedenteHeaderData } from '#src/modules/financial/adapters/cnab/multipag-records.ts';
import type { Payee } from '#src/modules/financial/adapters/cnab/multipag-segments.ts';
// W0 RED: o inspetor estrutural do arquivo de remessa ainda não existe.
import { inspectRemittanceFile } from '#src/modules/financial/adapters/cnab/remittance-inspector.ts';

const CEDENTE: CedenteHeaderData = {
  bankCode: '237',
  documentType: '2',
  document: '12345678000199',
  convenio: '000000',
  agency: '1234',
  agencyDigit: '5',
  accountNumber: '567890',
  accountDigit: '1',
  accountAgencyDigit: '2',
  companyName: 'ASSOCIACAO BEM COMUM',
};

const payee = (n: number): Payee => ({
  name: `FORNECEDOR ${n}`,
  documentType: '2',
  document: `9876543200011${n}`,
  bankCode: '341',
  agency: '4321',
  agencyDigit: '0',
  accountNumber: `11223${n}`,
  accountDigit: '4',
});

const validFile = (count = 2): string => {
  const r = buildRemittanceFile({
    cedente: CEDENTE,
    bankName: 'BRADESCO',
    nsa: 7,
    generatedAt: new Date(Date.UTC(2026, 7, 10, 14, 5, 9)),
    payments: Array.from({ length: count }, (_, i) => ({
      route: 'transfer' as const,
      payee: payee(i + 1),
      paymentDate: new Date(Date.UTC(2026, 7, 12)),
      valueCents: (i + 1) * 1000,
    })),
  });
  assert.ok(isOk(r));
  return r.value.content;
};

// Dois lotes de verdade: transferência e boleto têm formas de lançamento distintas, logo lotes
// distintos. É o arquivo que a versão anterior do inspetor reprovaria — ela procurava o header do
// lote na segunda linha e o trailer na penúltima, o que só vale para lote único (#711, CA6).
const multiBatchFile = (): string => {
  const r = buildRemittanceFile({
    cedente: CEDENTE,
    bankName: 'BRADESCO',
    nsa: 7,
    generatedAt: new Date(Date.UTC(2026, 7, 10, 14, 5, 9)),
    payments: [
      {
        route: 'transfer' as const,
        payee: payee(1),
        paymentDate: new Date(Date.UTC(2026, 7, 12)),
        valueCents: 1000,
      },
      {
        route: 'billet' as const,
        barcode: '3419001'.padEnd(44, '7'),
        beneficiaryName: 'FORNECEDOR BOLETO',
        beneficiaryDocumentType: '2' as const,
        beneficiaryDocument: '98765432000111',
        dueDate: new Date(Date.UTC(2026, 7, 20)),
        paymentDate: new Date(Date.UTC(2026, 7, 12)),
        valueCents: 2500,
      },
    ],
  });
  assert.ok(isOk(r));
  return r.value.content;
};

// Os REGISTROS do arquivo, sem o vazio que o terminador final produz.
//
// Desde a #804 todo registro termina em CRLF, o último inclusive — então `split` devolve um
// elemento vazio no fim, e `length - 1` deixaria de apontar para o trailer de arquivo. Os índices
// de registro são idênticos nos dois arrays; o que muda é só o tamanho, e é dele que estes testes
// derivam a posição do trailer.
const recordsOf = (content: string): readonly string[] => {
  const parts = content.split(LINE_TERMINATOR);
  return parts.at(-1) === '' ? parts.slice(0, -1) : parts;
};

// Corrompe uma linha PRESERVANDO as 240 posições, para o defeito injetado não vir acompanhado de
// um erro de comprimento que mascararia o que está sendo testado.
const patch = (content: string, lineIndex: number, from: number, value: string): string => {
  const lines = content.split(LINE_TERMINATOR);
  const line = lines[lineIndex] ?? '';
  lines[lineIndex] = line.slice(0, from - 1) + value + line.slice(from - 1 + value.length);
  return lines.join(LINE_TERMINATOR);
};

const codes = (content: string): readonly string[] =>
  inspectRemittanceFile(content).map((d) => d.code);

describe('Inspetor de remessa — arquivo bem formado', () => {
  // O inspetor e o montador têm de concordar. Se este teste quebrar, um dos dois mudou sozinho.
  it('não acusa defeito algum no que o montador produz', () => {
    for (const count of [1, 2, 5]) {
      assert.deepEqual(inspectRemittanceFile(validFile(count)), []);
    }
  });
});

describe('Inspetor de remessa — o que o banco recusaria', () => {
  it('acusa linha fora das 240 posições', () => {
    const truncated = validFile()
      .split(LINE_TERMINATOR)
      .map((l, i) => (i === 2 ? l.slice(0, 200) : l))
      .join(LINE_TERMINATOR);

    assert.ok(codes(truncated).includes('line-length'));
  });

  it('acusa contagem de registros do arquivo que não bate com as linhas', () => {
    const file = validFile(2);
    const lines = recordsOf(file);
    // Trailer de arquivo, posições 24-29: declara 99 registros num arquivo de 8 linhas.
    const corrupted = patch(file, lines.length - 1, 24, '000099');

    assert.ok(codes(corrupted).includes('file-record-count-mismatch'));
  });

  it('acusa contagem de registros do lote que não bate', () => {
    const file = validFile(2);
    const lines = recordsOf(file);
    const corrupted = patch(file, lines.length - 2, 18, '000099');

    assert.ok(codes(corrupted).includes('batch-record-count-mismatch'));
  });

  // O mais valioso: soma declarada diferente da soma real é dinheiro que não fecha.
  it('acusa somatória do lote diferente da soma dos pagamentos', () => {
    const file = validFile(2);
    const lines = recordsOf(file);
    const corrupted = patch(file, lines.length - 2, 24, '000000000000999999');

    assert.ok(codes(corrupted).includes('batch-total-mismatch'));
  });

  it('acusa buraco na numeração sequencial dos detalhes', () => {
    // Segundo detalhe (índice 3) passa de 00002 para 00009.
    const corrupted = patch(validFile(2), 3, 9, '00009');
    assert.ok(codes(corrupted).includes('detail-sequence-gap'));
  });

  // O Segmento B é obrigatório: um A sozinho é arquivo recusado.
  it('acusa Segmento A sem o B correspondente', () => {
    const corrupted = patch(validFile(1), 3, 14, 'A');
    assert.ok(codes(corrupted).includes('segment-a-without-b'));
  });

  it('acusa tipo de registro desconhecido', () => {
    const corrupted = patch(validFile(1), 2, 8, '7');
    assert.ok(codes(corrupted).includes('unknown-record-type'));
  });

  it('acusa arquivo vazio em vez de dizer que está bem formado', () => {
    assert.ok(codes('').includes('empty-file'));
    assert.ok(codes('   ').includes('empty-file'));
  });
});

describe('Inspetor de remessa — reporta tudo, não só o primeiro', () => {
  // Quem vai usar isto está prestes a transmitir dinheiro: quer a lista inteira de uma vez, não
  // descobrir um defeito por rodada.
  it('acumula defeitos independentes numa única passada', () => {
    const file = validFile(2);
    const lines = recordsOf(file);
    const corrupted = patch(patch(file, lines.length - 1, 24, '000099'), 3, 9, '00009');

    const found = codes(corrupted);
    assert.ok(found.includes('file-record-count-mismatch'));
    assert.ok(found.includes('detail-sequence-gap'));
  });

  it('aponta a linha do defeito, 1-indexed', () => {
    const truncated = validFile()
      .split(LINE_TERMINATOR)
      .map((l, i) => (i === 2 ? l.slice(0, 200) : l))
      .join(LINE_TERMINATOR);

    const defect = inspectRemittanceFile(truncated).find((d) => d.code === 'line-length');
    assert.ok(defect !== undefined);
    assert.equal(defect.line, 3);
  });
});

describe('Inspetor — arquivo de vários lotes (#711, CA6)', () => {
  // O defeito que motivou a mudança: com a busca por POSIÇÃO, este arquivo — correto — era
  // reprovado, porque a penúltima linha é o trailer do último lote e a contagem somava os detalhes
  // dos dois lotes contra o trailer de um.
  it('aprova o arquivo de dois lotes que a busca por posição reprovaria', () => {
    assert.deepEqual(codes(multiBatchFile()), []);
  });

  it('confere cada trailer contra o SEU lote, não contra o arquivo', () => {
    const file = multiBatchFile();
    const lines = recordsOf(file);

    // Estraga a somatória do PRIMEIRO trailer de lote: o segundo continua correto, e é isso que
    // separa a conferência por lote da conferência global.
    const trailerIndex = lines.findIndex((l) => l.slice(7, 8) === '5');
    const corrupted = patch(file, trailerIndex, 24, '0'.repeat(17) + '9');

    const found = codes(corrupted);
    assert.deepEqual(found, ['batch-total-mismatch']);
  });

  it('acusa lote aberto que nunca fecha', () => {
    const file = multiBatchFile();
    const lines = recordsOf(file);
    // Transforma o trailer do primeiro lote num detalhe: o lote fica aberto até o próximo header.
    const trailerIndex = lines.findIndex((l) => l.slice(7, 8) === '5');

    assert.ok(codes(patch(file, trailerIndex, 8, '3')).includes('missing-batch-trailer'));
  });

  it('acusa detalhe fora de qualquer lote', () => {
    const file = validFile(1);
    const lines = recordsOf(file);
    // Descaracteriza o header do lote: os detalhes seguintes passam a não ter lote que os contenha.
    const corrupted = patch(file, 1, 8, '0');

    assert.ok(codes(corrupted).includes('detail-outside-batch'));
    assert.ok(lines.length > 0);
  });

  it('acusa segmento de detalhe que a varredura não conhece, em vez de somar zero calado', () => {
    const file = validFile(1);
    // Troca o Segmento A por um segmento inexistente: a soma do lote deixaria de fechar em
    // silêncio se o inspetor tratasse desconhecido como "não move dinheiro".
    assert.ok(codes(patch(file, 2, 14, 'X')).includes('unknown-segment'));
  });

  it('acusa quantidade de lotes divergente no trailer do arquivo', () => {
    const file = multiBatchFile();
    const lines = recordsOf(file);
    const corrupted = patch(file, lines.length - 1, 18, '000009');

    assert.ok(codes(corrupted).includes('file-batch-count-mismatch'));
  });

  // ─── ASCII e caixa alta ──────────────────────────────────────────────────────────────────────
  //
  // `alpha()` já normaliza tudo que passa pelos combinadores, então estes casos não descrevem o
  // fluxo normal: descrevem a REGRESSÃO em que alguém monta uma linha à mão, ou acrescenta um campo
  // esquecendo `text()`. Sem eles, o defeito viaja até o banco.

  it('acusa caractere não-ASCII e diz em que posição está', () => {
    const found = inspectRemittanceFile(patch(validFile(1), 2, 44, 'JOSÉ')).filter(
      (d) => d.code === 'non-ascii-character',
    );

    assert.equal(found.length, 1);
    // A POSIÇÃO no detalhe é o ponto. "Tem acento nesta linha" devolve o operador a contar
    // caractere a olho — que é o que produz laudo confiante e falso dentro de corrida homogênea.
    assert.match(found[0]?.detail ?? '', /posição 47/);
  });

  it('acusa minúscula e diz em que posição está', () => {
    const found = inspectRemittanceFile(patch(validFile(1), 2, 44, 'jose')).filter(
      (d) => d.code === 'lowercase-character',
    );

    assert.equal(found.length, 1);
    assert.match(found[0]?.detail ?? '', /posição 44/);
  });

  it('não acusa ASCII nem caixa no arquivo bem formado', () => {
    const found = codes(validFile(2));

    assert.ok(!found.includes('non-ascii-character'));
    assert.ok(!found.includes('lowercase-character'));
  });

  // ─── Registro-régua ──────────────────────────────────────────────────────────────────────────

  it('REGISTRO-RÉGUA: cada campo com valor distinto, porque registro zerado não prova alinhamento', () => {
    // A armadilha que este caso existe para fechar: um arquivo cujos campos vizinhos carregam o
    // MESMO conteúdo — zeros, brancos, ou o mesmo dígito — passa por qualquer asserção de posição,
    // inclusive por uma que esteja lendo a coluna errada. Duas leituras deslocadas devolvem o
    // mesmo texto, e o teste fica verde descrevendo um layout que não existe.
    //
    // A régua elimina a coincidência: cada campo recebe um valor RECONHECÍVEL e diferente dos
    // vizinhos, de modo que ler uma posição adjacente devolva outra coisa. É o mesmo princípio do
    // laudo — a testemunha honesta é a BORDA, onde o conteúdo muda.
    const file = buildRemittanceFile({
      cedente: { ...CEDENTE, agency: '1111', agencyDigit: '2', accountNumber: '333333' },
      bankName: 'BRADESCO',
      nsa: 7,
      generatedAt: new Date(Date.UTC(2026, 7, 10, 14, 5, 9)),
      payments: [
        {
          route: 'transfer' as const,
          payee: {
            ...payee(1),
            agency: '4444',
            agencyDigit: '5',
            accountNumber: '666666',
            accountDigit: '7',
          },
          paymentDate: new Date(Date.UTC(2026, 7, 12)),
          valueCents: 123456,
        },
      ],
    });
    assert.ok(isOk(file));

    const segmentA = recordsOf(file.value.content)[2] ?? '';
    const at = (from: number, to: number): string => segmentA.slice(from - 1, to);

    // Agência do favorecido, DV, conta e DV — quatro campos contíguos, quatro valores distintos.
    // Se qualquer um estiver deslocado de uma posição, um destes quatro muda.
    assert.equal(at(24, 28), '04444', 'agência do favorecido, 024-028');
    assert.equal(at(29, 29), '5', 'DV da agência, 029 — a posição que o G059 AM cobra');
    assert.equal(at(30, 41), '000000666666', 'conta do favorecido, 030-041');
    assert.equal(at(42, 42), '7', 'DV da conta, 042');

    // E o valor, que é o campo cujo deslocamento custa dinheiro.
    assert.equal(at(120, 134), '000000000123456', 'valor do pagamento, 120-134');

    assert.deepEqual(inspectRemittanceFile(file.value.content), []);
  });
});

/*
 * O par J + J-52 (#891, CA4).
 *
 * É a asserção que fecha a classe. Enquanto o inspetor não cobrou o complemento, o emissor gravava o
 * Segmento J sozinho e TUDO fechava: 240 posições, sequencial contínuo, trailer de lote conferindo,
 * trailer de arquivo conferindo. O arquivo divergia do modelo do banco em silêncio, e nenhuma das
 * quatro checagens existentes tinha como perceber — nenhuma delas pergunta que registros o layout
 * exige, só se os que estão lá são coerentes entre si.
 *
 * ⚠️ O teste remove o J-52 e REPARA os dois trailers. Sem o reparo, a contagem também acusaria, e o
 * caso passaria medindo `batch-record-count-mismatch` — provando que o inspetor sabe contar, que ele
 * já sabia. O que precisa ser provado é que ele vê a AUSÊNCIA DO REGISTRO num arquivo cujos totais
 * fecham, porque é exatamente esse o arquivo que o emissor produzia.
 */
describe('Inspetor — o boleto exige o par J + J-52 (#891, CA4)', () => {
  const columnsOf = (line: string, from: number, to: number): string => line.slice(from - 1, to);

  // ⚠️ A régua É duplicada aqui de propósito, e a duplicação NÃO é a fábrica de divergência que o
  // CLAUDE.md proíbe — é o contrário. Importar `isSegmentJ52` do inspetor faria a fixture ser
  // mutilada pela mesma função que o teste existe para provar: quando ela errasse, o teste recortaria
  // o registro errado e continuaria verde, medindo a si mesmo. O teste precisa de um localizador
  // INDEPENDENTE.
  //
  // Independente, porém, não é "mais frouxo": a versão anterior olhava só `018-019 === '52'` e casava
  // com o Segmento J de um boleto de banco `52x` — o mesmo defeito do inspetor, na fixture. As três
  // condições abaixo espelham as do `src` porque a AMBIGUIDADE é do layout, não da implementação.
  const isSegmentJ52 = (line: string): boolean =>
    columnsOf(line, 8, 8) === '3' &&
    columnsOf(line, 14, 14) === 'J' &&
    columnsOf(line, 18, 19) === '52' &&
    !/^\d{44}$/.test(columnsOf(line, 18, 61)) &&
    !/^\d$/.test(columnsOf(line, 15, 15));

  // O banco emissor é parâmetro porque o código de barras COMEÇA por ele, e as três primeiras
  // posições do barcode caem exatamente nas colunas 018-020 do Segmento J. Fixar `341` esconderia a
  // classe inteira de defeito que o caso `52x` abaixo cobra.
  const billetFile = (issuerBank = '341'): string => {
    const r = buildRemittanceFile({
      cedente: CEDENTE,
      bankName: 'BRADESCO',
      nsa: 7,
      generatedAt: new Date(Date.UTC(2026, 7, 10, 14, 5, 9)),
      payments: [
        {
          route: 'billet' as const,
          barcode: `${issuerBank}9001`.padEnd(44, '7'),
          beneficiaryName: 'FORNECEDOR BOLETO',
          beneficiaryDocumentType: '2' as const,
          beneficiaryDocument: '98765432000111',
          dueDate: new Date(Date.UTC(2026, 7, 20)),
          paymentDate: new Date(Date.UTC(2026, 7, 12)),
          valueCents: 2500,
        },
      ],
    });
    assert.ok(isOk(r));
    return r.value.content;
  };

  // A mutilação que reproduz o emissor de antes da #891: o J fica, o J-52 sai, e os dois
  // totalizadores passam a declarar o arquivo que de fato restou.
  const withoutSegmentJ52 = (content: string): string => {
    const records = recordsOf(content);
    const index = records.findIndex(isSegmentJ52);
    assert.notEqual(
      index,
      -1,
      'a fixture precisa conter um J-52 para que removê-lo signifique algo',
    );

    const kept = records.filter((_, i) => i !== index);
    const rebuilt = kept.map((l) => `${l}${LINE_TERMINATOR}`).join('');

    const batchTrailer = kept.findIndex((l) => columnsOf(l, 8, 8) === '5');
    const fileTrailer = kept.findIndex((l) => columnsOf(l, 8, 8) === '9');

    // Lote único nesta fixture: o lote é tudo menos o header e o trailer DO ARQUIVO.
    const repaired = patch(rebuilt, batchTrailer, 18, String(kept.length - 2).padStart(6, '0'));
    return patch(repaired, fileTrailer, 24, String(kept.length).padStart(6, '0'));
  };

  // A metade "verde" da prova invertida: o arquivo COMPLETO passa limpo. Sem ela, o caso abaixo
  // poderia estar acusando um defeito que o montador já produzia.
  it('não acusa nada no arquivo de boleto que o montador emite hoje', () => {
    assert.deepEqual(inspectRemittanceFile(billetFile()), []);
  });

  it('acusa segment-j-without-j52 quando o complemento falta, com os totais fechando', () => {
    const mutilated = withoutSegmentJ52(billetFile());

    // A guarda que torna o caso honesto: se o reparo dos trailers falhasse, o defeito de contagem
    // apareceria junto e o teste passaria por outro motivo.
    assert.deepEqual(codes(mutilated), ['segment-j-without-j52']);

    const [defect] = inspectRemittanceFile(mutilated);
    // Aponta a linha do J órfão — quem opera precisa saber QUAL título ficou sem o complemento.
    assert.equal(defect?.line, 3);
  });

  it('acusa o J seguido de outro J, que é o par quebrado no meio do lote', () => {
    const records = recordsOf(billetFile());
    const j = records.findIndex((l) => columnsOf(l, 8, 8) === '3' && !isSegmentJ52(l));
    // Troca o J-52 por uma cópia do J: o lote continua com dois detalhes e o trailer segue fechando.
    // ⚠️ O sequencial da cópia fica repetido, e é por isso que o assert abaixo procura o código na
    // lista em vez de exigir que ele seja o único — `detail-sequence-gap` também acusa, com razão.
    const swapped = records
      .map((l) => (isSegmentJ52(l) ? (records[j] ?? '') : l))
      .map((l) => `${l}${LINE_TERMINATOR}`)
      .join('');

    assert.ok(
      codes(swapped).includes('segment-j-without-j52'),
      'dois J seguidos são dois pagamentos, e o primeiro ficou sem complemento',
    );
  });

  // O contrapeso da CA4: a exigência é do BOLETO, e carimbá-la no arquivo inteiro reprovaria toda
  // remessa de transferência — que não tem J nenhum e está correta assim.
  it('não exige J-52 de arquivo sem boleto algum', () => {
    assert.deepEqual(inspectRemittanceFile(validFile(2)), []);
  });

  /*
   * O J e o J-52 gravam o MESMO `'J'` na coluna 014, e distingui-los por `018-019 === '52'` lê um
   * campo de DADOS como se fosse tag: no J-52 aquelas duas posições são a Identificação de Registro
   * Opcional (`G067`); no Segmento J são os dois primeiros dígitos do CÓDIGO DE BARRAS, que começa
   * pelo COMPE do banco emissor (`segmentJ` grava o barcode em 018-061). `readIssuerBank` aceita
   * qualquer três dígitos, sem allow-list — então um boleto de banco `52x` chega até aqui.
   *
   * ⚠️ O dano NÃO é um defeito a mais: é um defeito a MENOS, e depois um errado. O J classificado
   * como complemento não soma em `paymentCentsOf`, o lote fecha com um pagamento faltando, e o que
   * aparece é `batch-total-mismatch` — apontando o trailer, que está certo. E isso acontece DEPOIS de
   * `allocateNsa` consumir o número sob lock: NSA queimado, mensagem sem campo.
   *
   * A fronteira honesta é a classe de caractere, não o valor: um Segmento J tem 44 dígitos em
   * 018-061 (garantido por `isBarcode`); um J-52 tem nome Alfa a partir de 036. É a mesma doutrina
   * que `.claude/rules/cnab.md` fixa em §"Não conte caracteres dentro de corrida homogênea".
   */
  it('não confunde boleto de banco 52x com o complemento J-52', () => {
    // A metade verde primeiro: o mesmo arquivo, com banco que não colide, já passa limpo — sem isto
    // o caso poderia estar medindo um defeito do montador em vez do defeito do inspetor.
    assert.deepEqual(inspectRemittanceFile(billetFile('341')), []);

    assert.deepEqual(
      inspectRemittanceFile(billetFile('520')),
      [],
      'boleto de banco 52x é pagamento legítimo — o valor dele tem de entrar na somatória do lote',
    );
  });
});
