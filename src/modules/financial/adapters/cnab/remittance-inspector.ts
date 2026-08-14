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
// A varredura acha os lotes pelo TIPO DE REGISTRO, nunca pela posição da linha. A versão anterior
// assumia lote único — segunda linha é header, penúltima é trailer — e teria reprovado, com
// `batch-record-count-mismatch`, todo arquivo multi-lote correto (#711, CA6).
//
// Acumula todos os defeitos numa passada, em vez de parar no primeiro: quem chama está prestes a
// transmitir dinheiro e quer a lista inteira, não um defeito por rodada.
import { LINE_TERMINATOR } from './remittance-file.ts';

export type RemittanceDefectCode =
  | 'empty-file'
  | 'line-length'
  | 'unknown-record-type'
  | 'unknown-segment'
  | 'missing-file-header'
  | 'missing-file-trailer'
  | 'missing-batch-header'
  | 'missing-batch-trailer'
  | 'detail-outside-batch'
  | 'detail-sequence-gap'
  | 'segment-a-without-b'
  | 'batch-record-count-mismatch'
  | 'file-record-count-mismatch'
  | 'file-batch-count-mismatch'
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
const batchDeclaredCount = (line: string): number => Number(at(line, 18, 23));
const batchDeclaredTotal = (line: string): number => Number(at(line, 24, 41));
const fileDeclaredBatches = (line: string): number => Number(at(line, 18, 23));
const fileDeclaredRecords = (line: string): number => Number(at(line, 24, 29));

// Quanto o registro de detalhe move — e a posição do valor NÃO é a mesma em todo segmento. `null`
// distingue "registro que não carrega valor" (o B, que complementa o A) de "segmento que a
// varredura não conhece": somar zero por desconhecimento daria um trailer conferido contra uma
// soma incompleta, que é o defeito passar despercebido em silêncio.
const paymentCentsOf = (line: string): number | null => {
  switch (segment(line)) {
    case 'A':
      return Number(at(line, 120, 134));
    case 'J':
      return Number(at(line, 153, 167));
    case 'B':
      return 0;
    default:
      return null;
  }
};

// Estado do lote em aberto durante a varredura. Mutável de propósito e confinado a esta função: é
// um acumulador, não um valor de domínio.
interface OpenBatch {
  headerLine: number;
  detailCount: number;
  sumCents: number;
  sequence: number;
}

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

  // Envelope do ARQUIVO: abre com tipo 0 e fecha com tipo 9.
  const first = lines[0] ?? '';
  const last = lines[lines.length - 1] ?? '';
  if (recordType(first) !== '0') add(1, 'missing-file-header', 'primeira linha não é tipo 0');
  if (recordType(last) !== '9') {
    add(lines.length, 'missing-file-trailer', 'última linha não é tipo 9');
  }

  let open: OpenBatch | null = null;
  let pendingSegmentA = -1;
  let batchCount = 0;

  const closePendingSegmentA = (): void => {
    if (pendingSegmentA !== -1) {
      add(pendingSegmentA + 1, 'segment-a-without-b', 'Segmento A sem o B correspondente');
      pendingSegmentA = -1;
    }
  };

  // `for…of`, e não `forEach`: o lote em aberto é estado que atravessa iterações, e dentro de um
  // callback o compilador perde a reatribuição — o que obrigaria a um cast depois do laço para
  // reconhecer que o lote pode ter ficado aberto.
  for (const [i, line] of lines.entries()) {
    const type = recordType(line);

    switch (type) {
      case '1': {
        // Lote anterior que não fechou: o header seguinte é a prova de que faltou o trailer.
        if (open !== null) {
          add(open.headerLine, 'missing-batch-trailer', 'lote aberto sem registro tipo 5');
          closePendingSegmentA();
        }
        batchCount += 1;
        open = { headerLine: i + 1, detailCount: 0, sumCents: 0, sequence: 0 };
        break;
      }

      case '3': {
        if (open === null) {
          add(i + 1, 'detail-outside-batch', 'registro de detalhe fora de um lote');
          break;
        }

        open.detailCount += 1;
        open.sequence += 1;
        if (detailSequence(line) !== open.sequence) {
          add(
            i + 1,
            'detail-sequence-gap',
            `sequencial ${String(detailSequence(line))}, esperado ${String(open.sequence)} neste lote`,
          );
        }

        const seg = segment(line);
        const cents = paymentCentsOf(line);
        if (cents === null) {
          add(i + 1, 'unknown-segment', `segmento '${seg}' não pertence ao layout emitido`);
          break;
        }
        open.sumCents += cents;

        // O B é obrigatório no Multipag para o par de crédito em conta: um A sem par produz arquivo
        // recusado. O J paga sozinho e não participa desta regra.
        if (seg === 'A') {
          if (pendingSegmentA !== -1) {
            add(pendingSegmentA + 1, 'segment-a-without-b', 'Segmento A seguido de outro A');
          }
          pendingSegmentA = i;
        } else if (seg === 'B') {
          pendingSegmentA = -1;
        }
        break;
      }

      case '5': {
        if (open === null) {
          add(i + 1, 'missing-batch-header', 'trailer de lote sem header correspondente');
          break;
        }
        closePendingSegmentA();

        // Totais: é aqui que mora o defeito caro. Contagem ou somatória divergente é dinheiro que
        // não fecha, e o banco recusa o arquivo inteiro sem dizer qual campo.
        const expected = open.detailCount + 2; // header do lote + detalhes + este trailer
        if (batchDeclaredCount(line) !== expected) {
          add(
            i + 1,
            'batch-record-count-mismatch',
            `declara ${String(batchDeclaredCount(line))}, o lote tem ${String(expected)}`,
          );
        }
        if (batchDeclaredTotal(line) !== open.sumCents) {
          add(
            i + 1,
            'batch-total-mismatch',
            `declara ${String(batchDeclaredTotal(line))} centavos, o lote soma ${String(open.sumCents)}`,
          );
        }
        open = null;
        break;
      }

      case '0':
      case '9':
        break;

      default:
        add(i + 1, 'unknown-record-type', `tipo '${type}' não pertence ao layout`);
    }
  }

  if (open !== null) {
    add(open.headerLine, 'missing-batch-trailer', 'lote aberto sem registro tipo 5');
  }
  closePendingSegmentA();

  if (batchCount === 0) add(0, 'missing-batch-header', 'arquivo sem nenhum lote');

  if (recordType(last) === '9') {
    if (fileDeclaredRecords(last) !== lines.length) {
      add(
        lines.length,
        'file-record-count-mismatch',
        `declara ${String(fileDeclaredRecords(last))} registros, arquivo tem ${String(lines.length)} linhas`,
      );
    }
    // A contagem de lotes deixou de ser sempre 1 — e é a declaração que o banco confere contra o
    // que veio no arquivo.
    if (fileDeclaredBatches(last) !== batchCount) {
      add(
        lines.length,
        'file-batch-count-mismatch',
        `declara ${String(fileDeclaredBatches(last))} lotes, arquivo tem ${String(batchCount)}`,
      );
    }
  }

  return defects;
};

// Atalho para o caminho feliz. Continua valendo a ressalva do cabeçalho: bem formado ≠ correto.
export const isWellFormedRemittance = (content: string): boolean =>
  inspectRemittanceFile(content).length === 0;
