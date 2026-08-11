// Inspetor estrutural do arquivo de remessa CNAB 240 Multipag.
//
// Confere, sem o banco, o que o banco conferiria: comprimento das linhas, sequência dos registros,
// numeração dos detalhes, presença do par A+B e — o mais caro — se os totais declarados nos
// trailers batem com o que o arquivo de fato contém.
//
// POR QUE EXISTE: hoje não há ambiente de homologação para remessa de pagamento. A única conexão é
// a de produção, no convênio real, onde um arquivo de teste vira pagamento de verdade (ADR-0061
// §"O que continua em aberto"). Enquanto isso não se resolve, validar a FORMA é o mais longe que
// dá para ir sem mover dinheiro.
//
// ⚠️ O QUE ELE NÃO FAZ: não valida conteúdo de negócio. Um arquivo bem formado pode pagar o
// favorecido errado, o valor errado ou na data errada — nada disso é estrutura. "Zero defeitos"
// aqui significa "o banco não recusa por forma", NUNCA "o pagamento está correto".
//
// Acumula todos os defeitos numa passada, em vez de parar no primeiro: quem chama está prestes a
// transmitir dinheiro e quer a lista inteira, não um defeito por rodada.
import { LINE_TERMINATOR } from './remittance-file.ts';

export type RemittanceDefectCode =
  | 'empty-file'
  | 'line-length'
  | 'unknown-record-type'
  | 'missing-file-header'
  | 'missing-file-trailer'
  | 'missing-batch-header'
  | 'missing-batch-trailer'
  | 'detail-sequence-gap'
  | 'segment-a-without-b'
  | 'batch-record-count-mismatch'
  | 'file-record-count-mismatch'
  | 'batch-total-mismatch';

export type RemittanceDefect = Readonly<{
  // 1-indexed, como o operador conta linha; 0 = defeito do arquivo como um todo.
  line: number;
  code: RemittanceDefectCode;
  detail: string;
}>;

const RECORD_LENGTH = 240;

// Posições do layout (1-indexed, inclusivas) — as mesmas que os módulos de escrita usam.
const at = (line: string, from: number, to: number): string => line.slice(from - 1, to);
const recordType = (line: string): string => at(line, 8, 8);
const segment = (line: string): string => at(line, 14, 14);
const detailSequence = (line: string): number => Number(at(line, 9, 13));
const paymentCents = (line: string): number => Number(at(line, 120, 134));
const batchDeclaredCount = (line: string): number => Number(at(line, 18, 23));
const batchDeclaredTotal = (line: string): number => Number(at(line, 24, 41));
const fileDeclaredRecords = (line: string): number => Number(at(line, 24, 29));

export const inspectRemittanceFile = (content: string): readonly RemittanceDefect[] => {
  const defects: RemittanceDefect[] = [];
  const add = (line: number, code: RemittanceDefectCode, detail: string): void => {
    defects.push({ line, code, detail });
  };

  if (content.trim() === '') {
    add(0, 'empty-file', 'arquivo sem conteúdo');
    return defects;
  }

  const lines = content.split(LINE_TERMINATOR);

  lines.forEach((line, i) => {
    if (line.length !== RECORD_LENGTH) {
      add(
        i + 1,
        'line-length',
        `${String(line.length)} posições, esperado ${String(RECORD_LENGTH)}`,
      );
    }
  });

  // Envelope: o arquivo abre com tipo 0 e fecha com tipo 9; o lote abre com 1 e fecha com 5.
  const first = lines[0] ?? '';
  const last = lines[lines.length - 1] ?? '';
  if (recordType(first) !== '0') add(1, 'missing-file-header', 'primeira linha não é tipo 0');
  if (recordType(last) !== '9') {
    add(lines.length, 'missing-file-trailer', 'última linha não é tipo 9');
  }
  if (recordType(lines[1] ?? '') !== '1')
    add(2, 'missing-batch-header', 'segunda linha não é tipo 1');

  const batchTrailerIndex = lines.length - 2;
  const batchTrailer = lines[batchTrailerIndex] ?? '';
  if (recordType(batchTrailer) !== '5') {
    add(batchTrailerIndex + 1, 'missing-batch-trailer', 'penúltima linha não é tipo 5');
  }

  // Detalhes: numeração sequencial a partir de 1, e todo Segmento A seguido de um B.
  let expectedSequence = 0;
  let sumCents = 0;
  let detailCount = 0;
  let pendingSegmentA = -1;

  lines.forEach((line, i) => {
    const type = recordType(line);
    if (type !== '3') {
      if (!['0', '1', '5', '9'].includes(type)) {
        add(i + 1, 'unknown-record-type', `tipo '${type}' não pertence ao layout`);
      }
      return;
    }

    detailCount += 1;
    expectedSequence += 1;
    if (detailSequence(line) !== expectedSequence) {
      add(
        i + 1,
        'detail-sequence-gap',
        `sequencial ${String(detailSequence(line))}, esperado ${String(expectedSequence)}`,
      );
    }

    const seg = segment(line);
    if (seg === 'A') {
      if (pendingSegmentA !== -1) {
        add(pendingSegmentA + 1, 'segment-a-without-b', 'Segmento A seguido de outro A');
      }
      pendingSegmentA = i;
      sumCents += paymentCents(line);
    } else if (seg === 'B') {
      pendingSegmentA = -1;
    }
  });

  // O B é obrigatório no Multipag: um A sem par produz arquivo recusado.
  if (pendingSegmentA !== -1) {
    add(pendingSegmentA + 1, 'segment-a-without-b', 'Segmento A sem o B correspondente');
  }

  // Totais: é aqui que mora o defeito caro. Contagem ou somatória divergente é dinheiro que não
  // fecha, e o banco recusa o arquivo inteiro sem dizer qual campo.
  const expectedBatchCount = detailCount + 2; // header de lote + detalhes + este trailer
  if (recordType(batchTrailer) === '5') {
    if (batchDeclaredCount(batchTrailer) !== expectedBatchCount) {
      add(
        batchTrailerIndex + 1,
        'batch-record-count-mismatch',
        `declara ${String(batchDeclaredCount(batchTrailer))}, arquivo tem ${String(expectedBatchCount)}`,
      );
    }
    if (batchDeclaredTotal(batchTrailer) !== sumCents) {
      add(
        batchTrailerIndex + 1,
        'batch-total-mismatch',
        `declara ${String(batchDeclaredTotal(batchTrailer))} centavos, soma dos pagamentos é ${String(sumCents)}`,
      );
    }
  }

  if (recordType(last) === '9' && fileDeclaredRecords(last) !== lines.length) {
    add(
      lines.length,
      'file-record-count-mismatch',
      `declara ${String(fileDeclaredRecords(last))} registros, arquivo tem ${String(lines.length)} linhas`,
    );
  }

  return defects;
};

// Atalho para o caminho feliz. Continua valendo a ressalva do cabeçalho: bem formado ≠ correto.
export const isWellFormedRemittance = (content: string): boolean =>
  inspectRemittanceFile(content).length === 0;
