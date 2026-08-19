// Parser do arquivo de RETORNO — CNAB 240 Multipag (#690).
//
// Os registros são montados aqui pelas POSIÇÕES do layout (p. 24), não por uma fixture copiada: o
// que se quer provar é que a leitura acerta o campo certo, e uma fixture com o campo já no lugar
// esconderia justamente o erro de um caractere, que é o modo de falha desta classe de código.
//
// ⚠️ Nenhum dado real de cadastro: convênio `000000` (reservado pelo gate de máscara), contas e
// referências sintéticas.
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk } from '#src/shared/index.ts';
import { parseReturnFile } from '#src/modules/financial/adapters/cnab/return-file.ts';

const LENGTH = 240;

/** G043 ocupa 20 posições (135-154). Exatamente 20 aqui, para a fixture não mentir sobre a largura. */
const BANK_NUMBER = 'BANCO000000000000001';

/** Uma linha de 240 brancos — o ponto de partida de todo registro. */
const blank = (): string => ' '.repeat(LENGTH);

/** Escreve `value` a partir da posição `from` (1-indexed), preservando o comprimento. */
const put = (line: string, from: number, value: string): string =>
  line.slice(0, from - 1) + value + line.slice(from - 1 + value.length);

/** Aplica vários campos de uma vez. */
const record = (fields: readonly (readonly [number, string])[]): string =>
  fields.reduce((line, [from, value]) => put(line, from, value), blank());

const fileHeader = (occurrences = ''): string =>
  record([
    [1, '237'],
    [4, '0000'],
    [8, '0'],
    ...(occurrences === '' ? [] : [[231, occurrences] as const]),
  ]);

const fileTrailer = (occurrences = ''): string =>
  record([
    [1, '237'],
    [4, '9999'],
    [8, '9'],
    ...(occurrences === '' ? [] : [[231, occurrences] as const]),
  ]);

const batchHeader = (batch = '0001', occurrences = ''): string =>
  record([
    [1, '237'],
    [4, batch],
    [8, '1'],
    ...(occurrences === '' ? [] : [[231, occurrences] as const]),
  ]);

const batchTrailer = (batch = '0001', occurrences = ''): string =>
  record([
    [1, '237'],
    [4, batch],
    [8, '5'],
    ...(occurrences === '' ? [] : [[231, occurrences] as const]),
  ]);

type SegmentAFields = Readonly<{
  batch?: string;
  sequence?: string;
  yourNumber?: string;
  bankNumber?: string;
  settledAt?: string;
  settledValue?: string;
  occurrences?: string;
}>;

/** Segmento A de RETORNO, nas posições do manual (p. 24). */
const segmentA = (fields: SegmentAFields = {}): string =>
  record([
    [1, '237'],
    [4, fields.batch ?? '0001'],
    [8, '3'],
    [9, fields.sequence ?? '00001'],
    [14, 'A'],
    // G064 — 074-093, 20 posições
    [74, (fields.yourNumber ?? '00000000000100000001').padEnd(20)],
    // *G043 — 135-154, 20 posições
    [135, (fields.bankNumber ?? BANK_NUMBER).slice(0, 20).padEnd(20)],
    // P003 — 155-162, DDMMAAAA
    [155, fields.settledAt ?? '19082026'],
    // P004 — 163-177, 13 inteiros + 2 decimais
    [163, (fields.settledValue ?? '000000000012345').padStart(15, '0')],
    // *G059 — 231-240
    [231, (fields.occurrences ?? '00').padEnd(10)],
  ]);

/** Segmento B — existe no retorno e esta fatia não o interpreta. */
const segmentB = (batch = '0001'): string =>
  record([
    [1, '237'],
    [4, batch],
    [8, '3'],
    [9, '00002'],
    [14, 'B'],
  ]);

const file = (...lines: readonly string[]): string => lines.join('\r\n');

describe('parseReturnFile — o Segmento A é o MESMO registro da remessa', () => {
  it('lê os campos que só o retorno preenche, cada um na sua posição', () => {
    const r = parseReturnFile(
      file(fileHeader(), batchHeader(), segmentA(), batchTrailer(), fileTrailer()),
    );

    assert.ok(isOk(r));
    assert.equal(r.value.payments.length, 1);

    const [pagamento] = r.value.payments;
    assert.equal(
      pagamento?.yourNumber,
      '00000000000100000001',
      'G064 — a chave que NÓS escrevemos',
    );
    assert.equal(pagamento?.bankNumber, BANK_NUMBER, 'G043 — a referência do banco');
    assert.equal(pagamento?.settledAt, '2026-08-19', 'P003 — DDMMAAAA vira AAAA-MM-DD');
    assert.equal(pagamento?.settledValueCents, 12345, 'P004 — 13+2 já está em centavos');
    assert.deepEqual(pagamento?.occurrences, ['00']);
    assert.equal(pagamento?.outcome, 'settled');
    assert.equal(pagamento?.batch, '0001');
    assert.equal(pagamento?.line, 3, '1-indexed, como o operador conta ao abrir o arquivo');
  });

  it('data zerada vira `null` — não efetivado não tem data', () => {
    const r = parseReturnFile(
      file(batchHeader(), segmentA({ settledAt: '00000000', occurrences: '01' }), batchTrailer()),
    );

    assert.ok(isOk(r));
    assert.equal(r.value.payments[0]?.settledAt, null, 'data inventada é pior que ausente');
    assert.equal(r.value.payments[0]?.outcome, 'rejected');
  });

  it('valor não-numérico vira zero em vez de NaN', () => {
    const r = parseReturnFile(file(batchHeader(), segmentA({ settledValue: '   invalido  ' })));
    assert.ok(isOk(r));
    assert.equal(r.value.payments[0]?.settledValueCents, 0);
  });

  it('registro com MÚLTIPLAS ocorrências não perde motivo', () => {
    // O caso que o CA3 desta issue depende: "não casou" sozinho não permite diagnosticar.
    const r = parseReturnFile(file(batchHeader(), segmentA({ occurrences: 'AFBB' })));
    assert.ok(isOk(r));
    assert.deepEqual(r.value.payments[0]?.occurrences, ['AF', 'BB']);
    assert.equal(r.value.payments[0]?.outcome, 'rejected');
  });
});

describe('parseReturnFile — a caixa é do convênio, o lote NUNCA falha', () => {
  it('registro SEM `Seu Número` entra mesmo assim — é dado, não defeito', () => {
    // Retorno de operação feita fora desta integração não tem referência nossa. É o estado NORMAL
    // da caixa, e recusá-lo aqui derrubaria o processamento no primeiro dia de produção.
    const r = parseReturnFile(file(batchHeader(), segmentA({ yourNumber: ' '.repeat(20) })));

    assert.ok(isOk(r));
    assert.equal(r.value.payments.length, 1);
    assert.equal(r.value.payments[0]?.yourNumber, '');
    assert.equal(r.value.payments[0]?.bankNumber, BANK_NUMBER, 'ainda dá para nomeá-lo');
  });

  it('linha truncada vira `unreadable` e a varredura CONTINUA', () => {
    // Transferência interrompida trunca a última linha. Um arquivo com centenas de pagamentos
    // legíveis não pode ser perdido por causa dela.
    const r = parseReturnFile(file(batchHeader(), segmentA(), 'LINHA CURTA', segmentA()));

    assert.ok(isOk(r));
    assert.equal(r.value.payments.length, 2, 'os dois legíveis foram lidos');
    assert.deepEqual(r.value.unreadable, [3]);
  });

  it('segmento que esta fatia não interpreta é CONTADO, não recusado', () => {
    const r = parseReturnFile(file(batchHeader(), segmentA(), segmentB(), batchTrailer()));

    assert.ok(isOk(r));
    assert.equal(r.value.payments.length, 1);
    assert.equal(r.value.skipped, 1, 'segmento novo do banco não derruba a leitura');
  });
});

describe('parseReturnFile — recusa de escopo maior que o pagamento', () => {
  it('ocorrência no trailer de LOTE é atribuída ao lote, não ao pagamento', () => {
    // `HA` = lote não aceito. Cada detalhe pode trazer `00` e ainda assim nada foi pago.
    const r = parseReturnFile(
      file(batchHeader('0001'), segmentA({ batch: '0001' }), batchTrailer('0001', 'HA')),
    );

    assert.ok(isOk(r));
    assert.deepEqual(r.value.batchOccurrences.get('0001'), ['HA']);
    assert.equal(
      r.value.payments[0]?.outcome,
      'settled',
      'o detalhe segue dizendo o que diz — cruzar os dois níveis é de quem interpreta',
    );
  });

  it('ocorrência no header/trailer de ARQUIVO é de escopo arquivo', () => {
    const r = parseReturnFile(file(fileHeader(), segmentA(), fileTrailer('HI')));

    assert.ok(isOk(r));
    assert.deepEqual(r.value.fileOccurrences, ['HI']);
  });

  it('acumula ocorrências dos dois registros de arquivo, sem sobrescrever', () => {
    // Não dependemos de qual dos dois o banco usou.
    const r = parseReturnFile(file(fileHeader('AA'), segmentA(), fileTrailer('HI')));

    assert.ok(isOk(r));
    assert.deepEqual(r.value.fileOccurrences, ['AA', 'HI']);
  });

  it('separa lotes distintos', () => {
    const r = parseReturnFile(
      file(
        batchHeader('0001'),
        segmentA({ batch: '0001' }),
        batchTrailer('0001'),
        batchHeader('0002'),
        segmentA({ batch: '0002' }),
        batchTrailer('0002', 'HA'),
      ),
    );

    assert.ok(isOk(r));
    assert.equal(r.value.batchOccurrences.get('0001'), undefined, 'lote sem recusa não vira chave');
    assert.deepEqual(r.value.batchOccurrences.get('0002'), ['HA']);
    assert.deepEqual(
      r.value.payments.map((p) => p.batch),
      ['0001', '0002'],
    );
  });
});

describe('parseReturnFile — os únicos erros que sobem', () => {
  it('arquivo vazio', () => {
    const r = parseReturnFile('');
    assert.ok(!isOk(r));
    assert.equal(r.error, 'return-file-empty');

    const soEspaco = parseReturnFile('   \r\n  \n');
    assert.ok(!isOk(soEspaco));
    assert.equal(soEspaco.error, 'return-file-empty');
  });

  it('nenhum registro legível — todas as linhas curtas', () => {
    const r = parseReturnFile(file('curta', 'outra curta'));
    assert.ok(!isOk(r));
    assert.equal(r.error, 'return-file-no-records');
  });

  it('aceita `\\n` sozinho — quem grava e quem lê estão em sistemas diferentes', () => {
    const r = parseReturnFile([batchHeader(), segmentA()].join('\n'));
    assert.ok(isOk(r));
    assert.equal(r.value.payments.length, 1);
  });
});
